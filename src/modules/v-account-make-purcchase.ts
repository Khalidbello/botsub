import { Response } from 'express';

// file to initiate make purhase
const handlebars = require('handlebars');

import Transactions from '../models/transactions';
import PaymentAccounts from '../models/payment-accounts';
import creditReferrer from './credit_referrer';
import handleFirstMonthBonus from './monthly_bonuses';
import { dateFormatter } from '../bot/modules/helper_functions';
import { generateRandomString } from './helper_functions';
import * as fs from 'fs';
import axios from 'axios';
import { cancelTransaction } from '../bot/post-back-responses/postback_responses';
import BotUsers from '../models/fb_bot_users';
import { confirmDataPurchaseResponse } from '../bot/modules/buy-data';
import { sendMessage } from '../bot/modules/send_message';
import { updateNetworkStatus } from '../bot/modules/data-network-checker';
import { addDataProfit } from './save-profit';

// function to carryout purchase
async function makePurchase(purchasePayload: any, bot: string, senderId: string) {
  console.log('in make purchase');
  if (purchasePayload.transactionType === 'data')
    return deliverData(purchasePayload, bot, senderId);
  if (purchasePayload.transactionType === 'airtime')
    return deliverAirtime(purchasePayload, bot, senderId);
  console.log('no matched transaction type::::::::::::::::::::::::   ');
} // end of function to make purchase

// function to make data purchase request
async function deliverData(purchasePayload: any, bot: string, senderId: string) {
  console.log('in v account deliver dassssssssssssssssssssssssssssssssssssss');

  let options = {
    url: 'https://opendatasub.com/api/data/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(purchasePayload.networkID),
      mobile_number: purchasePayload.phoneNumber,
      plan: Number(purchasePayload.planID),
      Ported_number: true,
    },
  };

  if (process.env.NODE_ENV === 'production')
    return makePurchaseRequest(purchasePayload, options, bot, 'data', senderId);
  if (process.env.NODE_ENV === 'staging')
    return simulateMakePurchaseRequest(purchasePayload, true, bot, 'data', senderId);
  if (process.env.NODE_ENV === 'development')
    return simulateMakePurchaseRequest(purchasePayload, true, bot, 'data', senderId);
} // end of deliver value function

// function to make airtime purchase request
function deliverAirtime(purchasePayload: any, bot: string, senderId: string) {
  let options = {
    url: 'https://opendatasub.com/api/topup/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(purchasePayload.networkID),
      amount: Number(purchasePayload.price),
      mobile_number: purchasePayload.phoneNumber,
      Ported_number: true,
      airtime_type: 'VTU',
    },
  };

  if (process.env.NODE_ENV === 'production')
    makePurchaseRequest(purchasePayload, options, bot, 'data', senderId);
  if (process.env.NODE_ENV === 'staging')
    simulateMakePurchaseRequest(purchasePayload, true, bot, 'data', senderId);
  if (process.env.NODE_ENV === 'development')
    simulateMakePurchaseRequest(purchasePayload, true, bot, 'data', senderId);
} // end of deliverAirtime

// function to make product purchase request
async function makePurchaseRequest(
  purchasePayload: any,
  options: any,
  bot: string,
  transactionType: 'airtime' | 'data',
  senderId: string
) {
  try {
    const resp = await axios.post(options.url, options.payload, { headers: options.headers });
    console.log('response for virtual acount make purchase: ', resp);

    if (resp.data.Status === 'successful') {
      if (purchasePayload.transactionType === 'data')
        updateNetworkStatus(purchasePayload?.network, true, 'Network data delivery working fine'); // set network availablity to true
      return helpSuccesfulDelivery(purchasePayload, resp.data.balance_after, senderId, bot);
    }

    if (purchasePayload.transactionType === 'data')
      updateNetworkStatus(
        purchasePayload?.network,
        false,
        'Network data delvery failed in virtual account make purchase.'
      ); // set network availability to false
    throw { message: 'An error occured delivering data' };
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(
        'errror while makig purchase request in v-acounnt::: Server responded with status:',
        error.response.status
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received. Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }

    if (bot === 'facebook') {
      await sendMessage(senderId, { text: 'Transaction failed please try again.' });
      const user = await BotUsers.findOne({ id: senderId });
      return confirmDataPurchaseResponse(senderId, user, null);
    }
  }
} // end of actualBuyData

// function to make product purchase request simulation
async function simulateMakePurchaseRequest(
  purchasePayload: any,
  options: any,
  bot: string,
  data: any,
  senderId: string
) {
  try {
    if (options) return helpSuccesfulDelivery(purchasePayload, 6000, senderId, bot);
    throw 'product purchas request not successful';
  } catch (error) {
    console.log('make purchase request simulation failed in cacth error block:', error);
    if (bot === 'facebook') {
      await sendMessage(senderId, { text: 'Transaction failed please try again' });
      const user = await BotUsers.findOne({ id: senderId });
      return confirmDataPurchaseResponse(senderId, user, null);
    }
  }
} // end of makePurchaserequest simulaing

// helper function for succesfull response
async function helpSuccesfulDelivery(
  purchasePayload: any,
  balance: number,
  senderId: string,
  bot: string
) {
  let id;
  const date = new Date(); //new Date(response.data.customer.created_at);
  const nigeriaTimeString = dateFormatter(date);
  const product = formProduct(purchasePayload);

  // first run while loop to generate a random id
  while (true) {
    id = generateRandomString(15);
    let existing = await Transactions.findOne({ id: id });
    if (existing) {
      console.log('id exists');
    } else {
      break;
    }
  }

  // updating user deducting user balance
  const accBalance = await PaymentAccounts.findOneAndUpdate(
    { refrence: senderId },
    { $inc: { balance: -Number(purchasePayload.price) } },
    { new: true }
  );
  console.log('account balance::::::::::', accBalance);

  addToDelivered(id, purchasePayload, senderId); // fuction to add trnasction to sucesful purchase
  //sendSuccessfulResponse(purchasePayload); // functio to send succsful delivery response

  if (bot === 'facebook') {
    //await sendMessage(senderId, { text: `Transaction Succesful \nProduct: ${product}\nTransaction ID: ${id} \nDate: ${nigeriaTimeString}` });
    await sendMessage(senderId, {
      text: `Your current account balance is:   ₦${accBalance?.balance}`,
    });
    await sendMessage(senderId, {
      text: `Transaction Succesful \nProduct: ${product} \nRecipient: ${purchasePayload.phoneNumber} \nPrice:  ${purchasePayload.price} \nTransaction ID: ${id} \nDate: ${nigeriaTimeString}`,
    });
    await sendMessage(senderId, {
      text: 'Thanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. \n\n〜BotSub',
    });
  }

  //if (parseInt(balance) <= 5000) fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
} // end of helpSuccesfulDelivery

// function to add transaction to delivered transaction
async function addToDelivered(id: string, purchasePayload: any, senderId: string) {
  try {
    let product, newTransaction, response2;

    cancelTransaction(senderId, true);
    product = formProduct(purchasePayload);

    newTransaction = new Transactions({
      id: id,
      email: purchasePayload.email,
      status: true,
      date: Date(),
      product: product,
      beneficiary: parseInt(purchasePayload.phoneNumber),
      accountType: 'virtual',
      info: 'delivery successful in virtual account',
      transactionType: purchasePayload.transactionType,
    });
    await newTransaction.save();

    await addDataProfit(
      senderId,
      id,
      purchasePayload.price,
      purchasePayload.transactionType,
      'virtual',
      purchasePayload.networkID,
      purchasePayload.index,
      Date()
    );

    // if (Number(purchasePayload.firstPurchase) === 1 && purchasePayload.transactionType === 'data')
    //   await creditReferrer(senderId);
    // if (purchasePayload.transactionType === 'data')
    //   await handleFirstMonthBonus(id, purchasePayload, senderId, false);
    return;
  } catch (err) {
    console.error('An error occured in addToDelivered for virtual account', err);
  }
} // end of addToDelivered

// helper function to form product
function formProduct(payload: any) {
  let product = `${payload.size}  ${payload.network} data`;

  if (payload.transactionType === 'airtime') {
    product = `₦${payload.price} ${payload.network} airtime`;
  }
  return product;
} // end of procuct

// function to send data purchase mail and response
async function sendSuccessfulResponse(response: any, res: Response) {
  try {
    const successfulMailTemplate = await fs.promises.readFile(
      'modules/email-templates/successful-delivery.html',
      'utf8'
    );
    const compiledSuccessfulMailTemplate = handlebars.compile(successfulMailTemplate);
    let details = formResponse(response);
    // @ts-ignore
    details.product = product(response);
    const mailParams = {
      // @ts-ignore
      product: details.product,
      network: details.network,
      date: details.date,
      id: response.data.id,
      txRef: response.data.tx_ref,
      status: 'Successfull',
      price: response.data.amount,
      recipientNumber: details.number,
      chatBotUrl: process.env.CHATBOT_URL,
      host: process.env.HOST,
    };

    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: response.data.customer.email,
      subject: 'BotSub Receipt',
      html: compiledSuccessfulMailTemplate(mailParams),
    };

    //const resp = await transporter.sendMail(mailOptions);

    //console.log('successful delivery function', resp);
    console.log('in sucess');
    return res.json({ status: 'successful', data: details });
  } catch (err) {
    console.log('send successful vtu response error', err);
    return res.json({ status: 'error', message: 'error sending succesfull response', data: err });
  }
} // end of sendAirtimeResponse function

//function to form response for request
function formResponse(response: any) {
  const meta = response.data.meta;
  // create a Date object with the UTC time
  const date = new Date(response.data.customer.created_at);
  const nigeriaTimeString = dateFormatter(date);

  const details = {
    network: meta.network,
    number: meta.number,
    email: response.data.customer.email,
    date: nigeriaTimeString,
  };
  return details;
} // end of formResponse

export { makePurchase };
