import {default as fs } from "node:fs"; 
  
const fsP = fs.promises;

import cyclicDB from "cyclic-dynamodb";

import flutterwave from "flutterwave-node-v3";

import nodemailer from "nodemailer";

import {failedTransactionMail} from "./email-templates.js";



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bellokhalid74@@gmail.com',
    pass: process.env.EMAIL_PASS
  }
});  // end of transporter






// function to check if transaction has ever beign made
export const checkIfPreviouslyDelivered = async function (transaction_id, transactionRef) {
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("settled");
  const toConfirm = await deliveredDB.get(transactionRef);
  
  if (toConfirm) {
    let condition = toConfirm.props.transactionID === transaction_id;
    return condition;
  };
  return false;
};//end of checkIfPreviouslyDelivered


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
  if (meta.type == "airtime") {
    details.product = `&#8358;${meta.amount} airtime`;
  };
  if (meta.type == "data") {
    details.product = `${meta.size} data`;
  };
  return details;
}; // end of returnPreviouslyDelivered


// function to check if all requirements are met 
export const checkRequirementMet = async function (response, req, res) {
  let returnFalse = false;
  if (response.data.meta.type === "data") {
    let dataDetails = await fsP.readFile("files/data-details.json")
    .catch((err)=> returnFalse = true );

    if (returnFalse) return {status: false, messsage: "error reading data-details.json"};
    
    dataDetails = JSON.parse(dataDetails); 
    let price;
    try {
      price = Number( dataDetails[response.data.meta.networkID][response.data.meta.index]["price"] );
    } catch (err) { 
      returnFalse = true 
    };
    
    if (returnFalse) {
      console.log("data plan with id not found");
      return {status: false, message: "data plan with id not found"};
    };
    let pricePaid = Number(response.data.amount);

    if (
      response.data.status === "successful" && 
      pricePaid >= price &&
      response.data.currency === "NGN" &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price; //amount to be refunded
      return {status: true, refund: toRefund, type: "data"};
    };
  };

  if (response.data.meta.type === "airtime") {
    let price = Number(response.data.meta.amount);
    let pricePaid = Number(response.data.amount);
    console.log(price);
    console.log(pricePaid);
    if (
      response.data.status === "successful" && 
      pricePaid >= price &&
      response.data.currency === "NGN" &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price;
      return {status: true, refund: toRefund, type: "airtime"};
    };
  }; 
  return {status: false, message: "payment requirement not met"};
}; //end of checkRequiremtMet
	





// helper function to refund payment
export async function refundPayment(transactionId, transactionRef, customerMail) {
  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  const response = await flw.Transaction.refund({
    id: transactionId,
    amount: null,
    comments: "transaction requirement not met"
  });
  console.log(response);
  const date = new Date();
  // Create an Intl.DateTimeFormat object with the Nigeria time zone
  const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'long',
      timeStyle: 'medium',
  }); 
  // Format the Nigeria time using the formatter
  const nigeriaTimeString = nigeriaFormatter.format(date);

  const mailOptions = {
    from: 'qsub@gmail.com',
    to: customerMail,
    subject: 'Qsub receipt',
    html: failedTransactionMail()
  };
  const resp1 = await transporter.sendMail(mailOptions)
  .catch((err)=> console.log("error sending data mail") );
  console.log(resp1);
  // adding transaction to toRefundDb
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("toRefund");
  let resp2 = await deliveredDB.set(transactionRef, {transactionID: transactionId});
  console.log(resp2);
  return {
    status: "requirementNotMet",
  };
}; // end of refundPayment
