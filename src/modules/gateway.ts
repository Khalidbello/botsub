// module to  hold all payment related functions relating to users with virtual account

import { Response } from 'express';
import { sendMessage } from '../bot/modules/send_message';
import PaymentAccounts from '../models/payment-accounts';
import BotUsers from '../models/fb_bot_users';
import { initMakePurchase } from '../bot/post-back-responses/postback_responses';
import axios from 'axios';
import { defaultText } from '../bot/message-responses/generic';
import { checkPaymentValidity } from '../bot/modules/helper_function_2';
import { deliverValue } from './deliver-value';

const Flutterwave = require('flutterwave-node-v3');

// function to create a virtual account
async function createVAccount(
  email: string | null | undefined,
  senderId: string,
  bvn: string,
  botType: string,
  currentCount: number
) {
  console.log('viertual account current count is: ', currentCount);

  if (currentCount > 5) {
    await sendMessage(senderId, { text: 'Creation of dedicated virtual account failed.' });
    await sendMessage(senderId, {
      text: 'Please kindly select my account to restart process and ensure all provided infrmations are accurate ',
    });
    sendMessage(senderId, { text: defaultText });
    return;
  }

  // first check to confirm no account with specific referance occurs
  const existing = await PaymentAccounts.findOne({ refrence: senderId });

  if (existing) return sendMessage(senderId, { text: 'You already have a virtual account.' });

  const num = await PaymentAccounts.countDocuments({});
  const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  const details = {
    email: email,
    tx_ref: senderId,
    is_permanent: true,
    bvn: bvn,
    firstname: 'Botsub',
    lastname: 'FLW00' + `${num + 1}`,
  };

  try {
    const accountDetails = await flw.VirtualAcct.create(details);
    console.log('create virtual account deatails::::::::: ', accountDetails);
    if (accountDetails.status !== 'success')
      return createVAccount(email, senderId, bvn, botType, currentCount + 1);

    // save user account in vrtual accounts db
    let account = {
      refrence: senderId,
      balance: 0,
      accountName: 'Botsub ' + 'FLW00' + `${num + 1}`,
      accountNumber: accountDetails.data.account_number,
      botType: botType,
      bankName: accountDetails.data.bank_name,
      bvn: bvn,
    };
    const vAccount = new PaymentAccounts(account);

    await vAccount.save();
    await sendMessage(senderId, { text: 'Creation of dedicated virtual account succesful.' });
    await sendMessage(senderId, { text: 'Your dedicated virtual account details: ' });
    await sendMessage(senderId, { text: `Bank Name: ${account.bankName}` });
    await sendMessage(senderId, { text: `Account Name: ${account.accountName}` });
    await sendMessage(senderId, { text: 'Acccount Number: ' });
    await sendMessage(senderId, { text: account.accountNumber });
    await sendMessage(senderId, { text: `Account Balance: ₦${account.balance}` });
    await sendMessage(senderId, {
      text: 'Fund your dedicated virtual account once and make mutltiple purchases seamlessly',
    });
  } catch (error) {
    console.log('in virtual account catch error:::', currentCount, error);
    return createVAccount(email, senderId, bvn, botType, currentCount + 1);
  }
} // end of create virtual account

// webhook handler function to handle updating user balance
async function respondToWebhook(webhookPayload: any, res: Response, host: string) {
  const data = webhookPayload.data || webhookPayload;
  if (data.status.toLowerCase() !== 'successful') {
    console.error(
      'transaction not succesful::::::::::::: account funding not sucesfully carried out'
    ); // check if transaction was succesful
    return;
  }

  const id = data.id;
  const reference = Number(data.txRef) || Number(data.tx_ref); // this vlaue is same as that of bot user sender id
  const amount = Number(data.amount);
  try {
    res.status(200).send(); // return ok response to webhook
    // verify if payment was made
    const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

    const response = await flw.Transaction.verify({ id: id }); // check again if transaction is succesful
    console.log('transaction details', response);

    if (response.status === 'error') {
      console.log('error occured while confirming tansacion');
      return;
    }

    if (response.data.status.toLowerCase() !== 'successful') {
      console.log('transaction not successfully carried out: in wallet top up');
      return;
    }

    console.log(
      'reference in wallet topup: ',
      reference,
      data,
      'reponse from v3 query: ',
      response
    );

    // check if transaction was made by user with no virtual account
    if (response.data.meta && response.data.meta.type) {
      await carryOutNonVAccount(response);
      return;
    }

    // fetch user account and update user balance
    const account = await PaymentAccounts.findOneAndUpdate(
      { refrence: reference },
      { $inc: { balance: amount } },
      { new: true }
    );

    console.log('account in wallet topup', account);
    if (account?.botType === 'facebook') {
      // send botuser a notification to
      await sendMessage(reference, { text: 'Your account account topup was successful.' });
      await sendMessage(reference, { text: `Your new account balance is: ${account.balance}` });

      // check if user has an outsanding transaction and automatic initiate if any
      const response = await BotUsers.findOne({ id: reference }).select('purchasePayload');
      const purchasePayload = response?.purchasePayload;

      if (purchasePayload?.outStanding) initMakePurchase(reference);
    }
  } catch (error) {
    console.error('an error ocured wallet topping up:::::::::::::::::         ', error);
  }
} // end of respondToWebhook

// helper function to carry out non-v-account purchase request
const carryOutNonVAccount = async (response: any) => {
  try {
    // check is payment is as expected
    const valid = await checkPaymentValidity(
      response.data.meta.id,
      response.data.amount,
      response.data.currency
    );

    if (valid) {
      // deliver value
      await deliverValue(response);
    } else {
      // proceed with refund
      console.log('valditiy check for one time account failed');
    }
  } catch (err) {}
}; // end of carryOutVAccount

export { respondToWebhook, createVAccount };
