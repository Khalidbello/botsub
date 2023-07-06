import { default as fs } from 'node:fs';

const fsP = fs.promises;

import cyclicDB from 'cyclic-dynamodb';

import flutterwave from 'flutterwave-node-v3';

import nodemailer from 'nodemailer';

import handlebars from "handlebars";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
  },
}); // end of transporter




// function to check if transaction has ever beign made

export const checkIfPreviouslyDelivered = async function(transaction_id, transactionRef) {
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection(process.env.SETTLED_COLLECTION);
  console.log("delivered db", deliveredDB);
  const toConfirm = await deliveredDB.get(transactionRef);

  if (toConfirm) {
    let condition = toConfirm.props.transactionID === transaction_id;
    return condition;
  }
  return false;
}; //end of checkIfPreviouslyDelivered



export function returnPreviouslyDelivered(response) {
  const meta = response.data.meta;
  // Create a Date object with the UTC time
  const date = new Date(response.data.customer.created_at);
  // Create an Intl.DateTimeFormat object with the Nigeria time zone
  const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'long',
    timeStyle: 'medium',
  });
  // Format the Nigeria time using the formatter
  const nigeriaTimeString = nigeriaFormatter.format(date);

  const details = {
    network: meta.network,
    number: meta.number,
    email: response.data.customer.email,
    date: nigeriaTimeString,
  };
  if (meta.type == 'airtime') {
    details.product = `&#8358;${meta.amount} airtime`;
  }
  if (meta.type == 'data') {
    details.product = `${meta.size} data`;
  }
  return details;
} // end of returnPreviouslyDelivered




// function to check if all requirements are met
export const checkRequirementMet = async function(response, req, res) {
  let returnFalse = false;
  let price;
  if (response.data.meta.type === 'data') {
    let dataDetails = await fsP
      .readFile('files/data-details.json')
      .catch((err) => (returnFalse = true));

    if (returnFalse) return { status: false, messsage: 'error reading data-details.json' };

    dataDetails = JSON.parse(dataDetails);
    try {
      price = Number(dataDetails[response.data.meta.networkID][response.data.meta.index]['price']);
    } catch (err) {
      returnFalse = true;
    }

    if (returnFalse) {
      console.log('data plan with id not found');
      return { status: false, message: 'data plan with id not found' };
    }
    let pricePaid = Number(response.data.amount);

    if (
      response.data.status === 'successful' &&
      pricePaid >= price &&
      response.data.currency === 'NGN' &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price; //amount to be refunded
      return { status: true, refund: toRefund, type: 'data', price };
    }
  }

  if (response.data.meta.type === 'airtime') {
    price = Number(response.data.meta.amount);
    let pricePaid = Number(response.data.amount);
    console.log(price);
    console.log(pricePaid);
    if (
      response.data.status === 'successful' &&
      pricePaid >= price &&
      response.data.currency === 'NGN' &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price;
      return { status: true, refund: toRefund, type: 'airtime', price };
    }
  }
  return { status: false, message: 'payment requirement not met', price};
}; //end of checkRequiremtMet



// helper function to refund payment
export async function refundPayment(response, price) {
  try {
    const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    const resp = await flw.Transaction.refund({
      id: response.data.id,
      amount: null,
      comments: 'transaction requirement not met',
    });

    console.log("payment refund response", response);
    const date = new Date();
    // Create an Intl.DateTimeFormat object with the Nigeria time zone
    const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'long',
      timeStyle: 'medium',
    });

    // Format the Nigeria time using the formatter
    const nigeriaTimeString = nigeriaFormatter.format(date);

    const emailTemplate = await fsP.readFile("modules/email-templates/refund-mail.html", "utf8");
    const mail = handlebars.compile(emailTemplate);
    
    const refundData = {
      date: nigeriaTimeString,
      network: response.data.meta.network,
      price: price,
      amountPaid: response.data.amount,
      recipientNumber: response.data.meta.number,
      id: response.data.id,
      txRef: response.data.tx_ref,
      supportEmail: process.env.EMAIL_ADDRESS,
      chatBotUrl: process.env.CHATBOT_URL
    };

    // setting product name
    refundData.product = `${response.data.meta.size} data`;

    if (response.data.meta.type === "airtime") {
      refundData.product = `₦${response.data.meta.amount} airtime`;
    };
    
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: response.data.customer.email,
      subject: 'BotSub Payment Refund',
      html: mail(refundData),
    };

    const resp1 = await transporter.sendMail(mailOptions);

    console.log("refund mail response", resp1);

    // adding transaction to toRefundDb
    const db = cyclicDB(process.env.DB_TABLENAME);
    const deliveredDB = db.collection(process.env.TORFUND_COLLECTION);
    let resp2 = await deliveredDB.set(response.data.tx_ref, { transactionID: response.data.id });
    console.log(resp2);
    return {
      status: 'requirementNotMet',
    };
  } catch (err) {
    console.log("regund error", err);
  };
}; // end of refundPayment


// function to generate random Strings
export function generateRandomString(length = 20) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
}; // end of generateRandomString