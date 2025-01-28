const Flutterwave = require('flutterwave-node-v3');
const nodemailer = require('nodemailer');
const handlebars = require('express-handlebars');

import * as fs from 'fs';
import Transactions from '../models/transactions';
import { Request, Response } from 'express';
import axios from 'axios';

//const uri = `mongodb+srv://bellokhalid74:${process.env.MONGO_PASS1}@botsubcluster.orij2vq.mongodb.net/?retryWrites=true&w=majority`;

const transporter = nodemailer.createTransport({
  host: 'mail.botsub.com.ng', // Replace with your SMTP server hostname
  port: 465, // Port number for SMTP (e.g., 587 for TLS)
  secure: true, // Set to true if using SSL
  auth: {
    user: process.env.ADMIN_MAIL,
    pass: process.env.ADMIN_MAIL_P,
  },
}); // end of transporter

// function to check if transaction has ever beign made
async function checkIfPreviouslyDelivered(transactionId: string) {
  const transaction = await Transactions.findOne({ id: transactionId });
  if (transaction) {
    return transaction.status === 'delivered';
  }
  return false;
} //end of checkIfPreviouslyDelivered

function returnPreviouslyDelivered(response: any) {
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
    // @ts-expect-error
    details.product = `&#8358;${meta.amount} airtime`;
  }
  if (meta.type == 'data') {
    // @ts-expect-error
    details.product = `${meta.size} data`;
  }
  return details;
} // end of returnPreviouslyDelivered

// function to check if all requirements are met
const checkcheckRequirement = async function (response: any, req: Request) {
  let returnFalse = false;
  let price;
  if (response.data.meta.type === 'data') {
    // @ts-expect-error
    let dataDetails: string = await fs.promises
      .readFile('files/data-details.json')
      .catch((err) => (returnFalse = true));

    if (returnFalse)
      return {
        status: false,
        messsage: 'error reading data-details.json in checkcheckRequirement',
      };

    dataDetails = JSON.parse(dataDetails);
    try {
      // @ts-expect-error
      price = Number(dataDetails[response.data.meta.networkID][response.data.meta.index]['price']);
    } catch (err) {
      returnFalse = true;
    }

    if (returnFalse) {
      console.log(
        'error getting price for data plan, in checkcheckRequirement,  data plan with id not found'
      );
      return { status: false, message: 'data plan with id not found' };
    }

    let pricePaid = Number(response.data.amount);

    console.log(
      'passed all remaining last in data in checkcheckRequirement',
      response.data.status.toLowerCase(),
      price,
      pricePaid,
      response.data.currency,
      response.data.tx_ref
    );
    if (
      response.data.status.toLowerCase() === 'successful' &&
      price &&
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
  console.log('requirement met retrning false');
  return { status: false, message: 'payment requirement not met', price };
}; //end of checkRequiremtMet

// helper function to refund payment
async function refundPayment(response: any, price: number) {
  try {
    // impiment fluuter wave transaction refund
    const date = new Date();
    const nigeriaTimeString = dateFormatter(date);
    const emailTemplate = await fs.promises.readFile(
      'modules/email-templates/refund-mail.html',
      'utf8'
    );
    const mail = handlebars.compile(emailTemplate);
    const refundData = {
      date: nigeriaTimeString,
      network: response.data.meta.network,
      price: price,
      amountPaid: response.data.amount,
      recipientNumber: response.data.meta.number,
      id: response.data.id,
      txRef: response.data.tx_ref,
      supportEmail: process.env.SUPPORT_MAIL,
      chatBotUrl: process.env.CHATBOT_URL,
    };
    // @ts-expect-error
    if (response.data.meta.type === 'data') refundData.product = `${response.data.meta.size} data`;
    if (response.data.meta.type === 'airtime')
      // @ts-expect-error
      refundData.product = `₦${response.data.meta.amount} airtime`;

    // send user a notification that their transaction will be refunded
    // redo adding transaction to refund
    return {
      status: 'requirementNotMet',
    };
  } catch (err) {
    console.log('An error occured in ', err);
  }
} // end of refundPayment

// function to format dates
function dateFormatter(date: Date) {
  const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true, // This will format the time in 12-hour format with AM/PM
  });

  // Format the Nigeria time using the formatter
  return nigeriaFormatter.format(date);
} // end of date formatter

// function to generate random Strings
function generateRandomString(length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
} // end of generateRandomString

// function to retry failed delivery
async function retryFailedHelper(transaction_id: string, tx_ref: string, res: Response) {
  const response = await axios.get(
    `https://${process.env.HOST}/gateway/confirm?retry=Retry&transaction_id=${transaction_id}&tx_ref=${tx_ref}&retry=true`
  );
  const data = await response.data;
  console.log('retry data', data);
  res.json(data);
} // end of retryFailedHelper

// function to retry all failed  transactions
async function retryAllFailedDelivery(req: Request) {
  const statistic = {
    total: 0,
    successful: 0,
    failed: 0,
  };
  let loop = true;

  while (loop) {
    const transactions = await Transactions.find({ status: false }).limit(20);

    if (transactions.length < 20) loop = false;

    // Create an array to store the promises for each transaction
    const transactionPromises = transactions.map(async (transaction: any) => {
      const { id, txRef } = transaction;
      const response = await axios.get(
        `https://${req.hostname}/gateway/confirm?transaction_id=${id}&tx_ref=${txRef}&retry=true`
      );
      const data = response.data;
      console.log(data);

      if (data.status === 'successful' || data.status === 'settled') {
        statistic.successful += 1;
      } else {
        statistic.failed += 1;
      }
    });

    // Wait for all transaction promises to resolve
    await Promise.all(transactionPromises);
  } // end of for loop
  statistic.total = statistic.failed + statistic.successful;
  return statistic;
} // end  of retryAllFailed

// function to fundvtu wallet
async function fundWallet(bankCode: string, accNum: string, amount: number) {
  try {
    const options = {
      method: 'POST',
      url: 'https://api.ravepay.co/v2/gpx/transfers/create',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      data: {
        meta: {
          FirstName: 'BotSub',
          LastName: 'Admin',
          EmailAddress: 'bellokhalid74@gmail.com',
          MobileNumber: '+23409166871328',
          Address: 'BotSub Headquaters',
        },
        account_bank: parseInt(bankCode),
        account_number: accNum,
        amount: amount,
        seckey: process.env.FLW_SCRT_KEY_PRODUCTION,
        narration: 'New transfer',
        currency: 'NGN',
        beneficiary_name: 'Opendatasub BotSub ',
      },
    };

    const response = await axios.request(options);

    if (response.data.status === 'success')
      return {
        status: false,
        message: `Request for transfer of ${response.data.data.amount} to  ${response.data.data.account_number}  ${response.data.data.full_name} has been succesfully initiated.`,
      };

    return { status: false, message: response.data?.message };
  } catch (err) {
    console.error('An error occured in fundWallet: ', err);
    return { status: false, message: 'An error ocured making wallet funding request' };
  }
} // end of fund wallet

export {
  checkIfPreviouslyDelivered,
  returnPreviouslyDelivered,
  checkcheckRequirement,
  refundPayment,
  generateRandomString,
  retryAllFailedDelivery,
  retryFailedHelper,
  dateFormatter,
  fundWallet,
};
