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
import WalletFundings from '../models/wallet-funding';

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
    await sendMessage(senderId, {
      text: 'An error occured trying to create your vierual account.',
    });
    await sendMessage(senderId, {
      text: 'Please renter BVN to proceed with creation of virtual account. \n\nEnter X to cancle.',
    });
    return;
  }

  // first check to confirm no account with specific referance occurs
  const user = await BotUsers.findOne({ id: senderId }).select('purchasePayload');
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

    // check if bvn was requested when user was carrying out a transaction
    if (user?.purchasePayload) {
      await sendMessage(senderId, { text: 'Creation of permanent account number was succesful.' });
      initMakePurchase(senderId);
      const resonse = await BotUsers.updateOne(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } }
      );

      console.log('Updated to confirmDataPurhcase in create v account: ', resonse);
      return;
    }

    await sendMessage(senderId, { text: 'Creation of permanent account number was succesful.' });
    await sendMessage(senderId, { text: 'Your permanent account details: ' });
    await sendMessage(senderId, { text: `Bank Name: ${account.bankName}` });
    await sendMessage(senderId, { text: `Account Name: ${account.accountName}` });
    await sendMessage(senderId, { text: 'Acccount Number: ' });
    await sendMessage(senderId, { text: account.accountNumber });
    await sendMessage(senderId, { text: `Account Balance: ₦${account.balance}` });
    await sendMessage(senderId, {
      text: 'Fund permanent account and make purchases with ease.',
    });

    const response = await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
    console.log('updated next action to null in createVaccount: ', response);
  } catch (error) {
    console.log('in virtual account catch error:::', currentCount, error);
    return createVAccount(email, senderId, bvn, botType, currentCount + 1);
  }
} // end of create virtual account

// webhook handler function to handle updating user balance
async function respondToWebhook(id: any, res: Response, custom: boolean) {
  try {
    // reverify if payment was made
    const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

    const response = await flw.Transaction.verify({ id: id }); // check again if transaction is succesful
    console.log('transaction details', response);

    if (response.data.status.toLowerCase() !== 'successful') {
      console.log('transaction not successfully carried out: in wallet top up');
      return res.status(300).json({ message: 'Payment not successfully carried out' });
    }

    if (!custom) res.status(200).send(); // return ok response to webhook

    console.log(
      'reference in wallet topup: ',
      response.data.tx_ref,
      'reponse from v3 query: ',
      response
    );

    // check if transaction was made by user with no virtual account
    if (response.data.meta && response.data.meta.type) {
      const noVaccountResponse = await carryOutNonVAccount(response, custom);
      console.log('response for no v account: ', noVaccountResponse);
      if (custom) return res.json(noVaccountResponse);
      return;
    }

    // check if top up had not been carried out before it true save and update user balance
    const topUpExits = await WalletFundings.findOne({ transactionId: id });

    if (topUpExits) {
      console.log('This top up already exits', topUpExits);
      if (custom) res.json({ messae: 'wallet topup already exits' });
      return;
    }

    // save topUp
    const newTopUp = new WalletFundings({
      transactionId: id,
      email: response.data.customer.email,
      userId: response.data.meta.senderId,
      amount: response.data.amount,
      data: new Date(),
    });
    const topUpSaved = await newTopUp.save();

    // fetch user account and update user balance
    const account = await PaymentAccounts.findOneAndUpdate(
      { refrence: response.data.tx_ref },
      { $inc: { balance: response.data.amount } },
      { new: true }
    );

    console.log('account in wallet topup', account), 'top up saved: ', topUpSaved;

    if (account?.botType === 'facebook') {
      // send botuser a notification to
      await sendMessage(response.data.tx_ref, {
        text: `Your account account topup of ₦${response.data.amount} was successful.`,
      });
      await sendMessage(response.data.tx_ref, {
        text: `Your new account balance is: ₦${account.balance}`,
      });

      // check if user has an outsanding transaction and automatic initiate if any
      const resp = await BotUsers.findOne({ id: response.data.tx_ref }).select('purchasePayload');
      const purchasePayload = resp?.purchasePayload;

      if (purchasePayload?.outStanding) await initMakePurchase(response.data.tx_ref);
    }

    if (custom) {
      return res.json({
        message: 'user wallet topup sucessfull, user balance: ' + account?.balance,
      });
    }
  } catch (error) {
    console.error('an error ocured wallet topping up:::::::::::::::::         ', error);
  }
} // end of respondToWebhook

// helper function to carry out non-v-account purchase request
const carryOutNonVAccount = async (
  response: any,
  custom: boolean
): Promise<{ status: boolean; message: string } | undefined> => {
  try {
    // check is payment is as expected
    const valid = await checkPaymentValidity(
      response.data.meta.id,
      response.data.amount,
      response.data.currency
    );

    console.log('validity check resonse in carry out no v accont::: ', valid);

    if (!valid)
      return {
        status: false,
        message: 'Transaction validation of transaction failed in check payment validity',
      };

    // deliver value
    const result = await deliverValue(response, custom);
    return result;
  } catch (err) {}
}; // end of carryOutVAccount

export { respondToWebhook, createVAccount, carryOutNonVAccount };
