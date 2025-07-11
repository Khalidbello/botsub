import { Response } from 'express';
import fs from 'fs';

// file to initiate make purhase
const handlebars = require('handlebars');

import Transactions from '../models/transactions';
import PaymentAccounts from '../models/payment-accounts';
import axios from 'axios';
import {
  cancelTransaction,
  cancelTransactionW,
} from '../bot/fb_bot/post-back-responses/postback_responses';
import BotUsers from '../models/fb_bot_users';
import { confirmDataPurchaseResponse } from '../bot/modules/buy-data';
import { sendMessage } from '../bot/modules/send_message';
import { updateNetworkStatus } from '../bot/modules/data-network-checker';
import { updateTransactNum } from '../bot/modules/helper_function_2';
import WhatsappBotUsers from '../models/whatsaap_bot_users';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';
import {
  confirmDataPurchaseResponseW,
  updateTransactNumW,
} from '../bot/whatsaap_bot/helper_functions';
import { dateFormatter, generateRandomString } from './helper_functions';
import { TransactionEndGrandSlamOfferReminderW } from '../bot/grand_slam_offer/whatsapp/concluded_transaction_propmpter_w';
import { TransactionEndGrandSlamOfferReminderFB } from '../bot/grand_slam_offer/facebook/concluded_transaction_propmpter_fb';

// function to carryout purchase
async function makePurchase(user: any, bot: string, senderId: string) {
  if (user.purchasePayload.transactionType === 'data') return deliverData(user, bot, senderId);
  if (user.purchasePayload.transactionType === 'airtime')
    return deliverAirtime(user, bot, senderId);

  console.log('no matched transaction type::::::::::::::::::::::::   ');
} // end of function to make purchase

// function to make data purchase request
async function deliverData(user: any, bot: string, senderId: string) {
  console.log('in v account deliver dassssssssssssssssssssssssssssssssssssss');

  let options = {
    url: 'https://opendatasub.com/api/data/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(user.purchasePayload.networkID),
      mobile_number: user.purchasePayload.phoneNumber,
      plan: Number(user.purchasePayload.planID),
      Ported_number: true,
    },
  };

  if (process.env.NODE_ENV === 'production')
    return makePurchaseRequest(user, options, bot, 'data', senderId);
  if (process.env.NODE_ENV === 'staging')
    return simulateMakePurchaseRequest(user, true, bot, 'data', senderId);
  if (process.env.NODE_ENV === 'development')
    return simulateMakePurchaseRequest(user, true, bot, 'data', senderId);
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
    makePurchaseRequest(purchasePayload, options, bot, 'airtime', senderId);
  if (process.env.NODE_ENV === 'staging')
    simulateMakePurchaseRequest(purchasePayload, true, bot, 'airtime', senderId);
  if (process.env.NODE_ENV === 'development')
    simulateMakePurchaseRequest(purchasePayload, true, bot, 'airtime', senderId);
} // end of deliverAirtime

// function to make product purchase request
async function makePurchaseRequest(
  user: any,
  options: any,
  bot: string,
  transactionType: 'airtime' | 'data',
  senderId: string
) {
  try {
    const resp = await axios.post(options.url, options.payload, { headers: options.headers });
    console.log('response for virtual acount make purchase: ', bot, resp.data);

    if (resp.data.Status === 'successful') {
      if (user.purchasePayload.transactionType === 'data') {
        if (bot === 'facebook') updateTransactNum(user.id);
        if (bot === 'whatsapp') updateTransactNumW(user.id);
        updateNetworkStatus(
          user.purchasePayload?.network,
          true,
          resp?.data?.api_response ? resp?.data?.api_response : 'Network data delivery working fine'
        ); // set network availablity to true
      }

      return helpSuccesfulDelivery(
        user,
        resp.data.balance_after,
        senderId,
        bot,
        parseInt(resp?.data?.plan_amount || 0)
      );
    }

    if (user.purchasePayload.transactionType === 'data')
      updateNetworkStatus(
        user.purchasePayload?.network,
        false,
        resp?.data?.api_response
          ? resp?.data?.api_response
          : 'Network data delvery failed in virtual account make purchase. and api response was empty'
      ); // set network availability to false

    throw {
      message: resp?.data?.api_response
        ? resp?.data?.api_response
        : 'An error occured delivering data',
    };
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
    } else if (bot === 'whatsapp') {
      await sendMessageW(senderId, 'Transaction failed please try again.');
      const user = await WhatsappBotUsers.findOne({ id: senderId });
      return confirmDataPurchaseResponseW(senderId, user, null);
    }
  }
} // end of actualBuyData

// function to make product purchase request simulation
async function simulateMakePurchaseRequest(
  user: any,
  options: any,
  bot: string,
  data: any,
  senderId: string
) {
  try {
    if (options) {
      if (bot === 'facebook') updateTransactNum(user.id);
      if (bot === 'whatsapp') updateTransactNumW(user.id);

      return helpSuccesfulDelivery(user, 6000, senderId, bot, 0);
    }

    throw 'product purchas request not successful';
  } catch (error) {
    console.log('make purchase request simulation failed in cacth error block:', error);
    if (bot === 'facebook') {
      await sendMessage(senderId, { text: 'Transaction failed please try again' });
      const user = await BotUsers.findOne({ id: senderId });
      return confirmDataPurchaseResponse(senderId, user, null);
    } else if (bot === 'whatsapp') {
      await sendMessageW(senderId, 'Transaction failed please try again');
      const user = await WhatsappBotUsers.findOne({ id: senderId });
      return confirmDataPurchaseResponseW(senderId, user, null);
    }
  }
} // end of makePurchaserequest simulaing

// helper function for succesfull response
async function helpSuccesfulDelivery(
  user: any,
  balance: number,
  senderId: string,
  bot: string,
  planAmount: number
) {
  let id;
  const date = new Date(); //new Date(response.data.customer.created_at);
  const nigeriaTimeString = dateFormatter(date);
  const product = formProduct(user.purchasePayload);

  // first run while loop to generate a random id
  while (true) {
    id = generateRandomString(15);
    let existing = await Transactions.findOne({ id: id });
    if (existing) {
      console.log('id exists: in help successfull delivery for vritual account');
    } else {
      break;
    }
  }

  // updating user deducting user balance
  const accBalance = await PaymentAccounts.findOneAndUpdate(
    { refrence: senderId },
    { $dec: { balance: -Number(user.purchasePayload.price) } },
    { new: true }
  );
  console.log('account balance::::::::::', accBalance);

  addToDelivered(id, user, senderId, bot, planAmount); // fuction to add trnasction to sucesful purchase
  //sendSuccessfulResponse(purchasePayload); // functio to send succsful delivery response

  if (bot === 'facebook') {
    await sendMessage(senderId, {
      text: `Transaction Succesful \nProduct: ${product} \nRecipient: ${
        user.purchasePayload.phoneNumber
      } \nPrice:  ₦${
        user.purchasePayload.price
      } \nTransaction ID: ${id} \nDate: ${nigeriaTimeString}
       \n\nYour current account balance is:   ₦${accBalance?.balance?.toFixed(2)}
       \nThanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. 
       \n\n〜BotSub`,
    });

    TransactionEndGrandSlamOfferReminderFB(user);
  } else if (bot === 'whatsapp') {
    await sendMessageW(
      senderId,
      `Transaction Succesful \nProduct: ${product} \nRecipient: ${
        user.purchasePayload.phoneNumber
      } \nPrice:  ₦${
        user.purchasePayload.price
      } \nTransaction ID: ${id} \nDate: ${nigeriaTimeString}
       \n\nYour current account balance is:   ₦${accBalance?.balance?.toFixed(2)}
       \nThanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. 
       \n\n〜BotSub
      `
    );

    await TransactionEndGrandSlamOfferReminderW(user);
  }

  //if (parseInt(balance) <= 5000) fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
} // end of helpSuccesfulDelivery

// function to add transaction to delivered transaction
async function addToDelivered(
  id: string,
  user: any,
  senderId: string,
  bot: string,
  planAmount: number
) {
  try {
    let product, newTransaction, response2;
    let profit = 0;
    const purchasePayload = user.purchasePayload;

    if (bot === 'facebook') cancelTransaction(senderId, true); // to reset user next action and purchse payload for fb bot
    if (bot === 'whatsapp') cancelTransactionW(senderId, true); // to reset user next action and purchse payload for whatsapp bot

    product = formProduct(purchasePayload);

    // if purchase is data calculate profit get data price an calcualte profit
    if (purchasePayload.transactionType === 'data') {
      const dataDetails = JSON.parse(
        await fs.promises.readFile('files/data-details.json', 'utf-8')
      );
      const plan = dataDetails[purchasePayload.networkID][purchasePayload.index];

      const flutterCharges = purchasePayload.price * 0.014;
      const vat = flutterCharges * 0.07;

      // Calculate profit
      profit = purchasePayload.price - flutterCharges - vat - (planAmount || plan.aPrice);
    }

    newTransaction = new Transactions({
      id: id,
      email: user.email,
      status: 'delivered',
      date: Date(),
      product: product,
      beneficiary: parseInt(purchasePayload.phoneNumber),
      accountType: 'virtual',
      info: 'delivery successful in virtual account',
      transactionType: purchasePayload.transactionType,
      platform: bot,
      profit: profit,
      price: purchasePayload.price,
    });

    await newTransaction.save();
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
