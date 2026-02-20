import { Response } from 'express';
import axios from 'axios';
import PaymentAccounts from '../models/payment-accounts';
import WalletFundings from '../models/wallet-funding';
import BotUsers from '../models/fb_bot_users';
import WhatsappBotUsers from '../models/whatsaap_bot_users';
import { sendMessage as sendMessageFB } from '../bot/fb_bot/modules/send_message';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';
import { deliverValue } from './deliver-value';
import {
  checkPaymentValidity,
  initMakePurchase,
  isConversationOpen,
} from '../bot/unified/utility_4';

const Flutterwave = require('flutterwave-node-v3');

// --- Platform Config Resolver ---
const getPlatformConfig = (platform: 'facebook' | 'whatsapp') => ({
  model: platform === 'facebook' ? BotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'facebook' ? sendMessageFB(id, { text }) : sendMessageW(id, text),
  label: platform === 'facebook' ? 'FB' : 'WA',
});

// --- Core Logic ---

/**
 * Unified Virtual Account Creation
 * Replaces createVAccount and createVAccountW
 */
async function createVAccount(
  email: string | null | undefined,
  senderId: string,
  bvn: string,
  botType: 'FB' | 'WA',
  currentCount: number
) {
  const bType: 'facebook' | 'whatsapp' = botType === 'FB' ? 'facebook' : 'whatsapp';
  const config = getPlatformConfig(bType);

  if (currentCount > 5) {
    await config.send(
      senderId,
      'An error occurred trying to create your virtual account. Please try again.'
    );
    await config.send(senderId, 'Please re-enter NIN/BVN to proceed. \nEnter X to cancel.');
    return;
  }

  const existing = await PaymentAccounts.findOne({ refrence: senderId });
  if (existing) return config.send(senderId, 'You already have a virtual account.');

  const user = await config.model.findOne({ id: senderId }).select('purchasePayload');
  const num = await PaymentAccounts.countDocuments({});

  const details = {
    email,
    is_permanent: true,
    bvn: bvn,
    tx_ref: senderId,
    narration: `Botsub ${encodeNumber(num + 1)}`,
    firstname: 'Botsub',
    lastname: encodeNumber(num + 1),
  };

  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/virtual-account-numbers',
      details,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SCRT_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status !== 'success')
      return createVAccount(email, senderId, bvn, botType, currentCount + 1);

    const accountData = {
      refrence: senderId,
      balance: 0,
      accountName: details.narration,
      accountNumber: response.data.data.account_number,
      botType: botType,
      bankName: response.data.data.bank_name,
    };

    await new PaymentAccounts(accountData).save();

    await config.send(senderId, 'Creation of permanent account number was successful.');

    // If user was in middle of purchase, resume it
    if (user?.purchasePayload?.price) {
      await initMakePurchase(config.label as 'FB' | 'WA', response.data.meta.senderId);
      await config.model.updateOne(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } }
      );
    } else {
      const balanceMsg = `Your account details: \n\nBank: ${accountData.bankName} \nName: ${accountData.accountName} \nBalance: ₦0.00 \n\nAccount Number: `;
      await config.send(senderId, balanceMsg);
      await config.send(senderId, accountData.accountNumber);
      await config.send(senderId, 'Fund account to make purchases with ease.');
      await config.model.updateOne({ id: senderId }, { $set: { nextAction: null } });
    }
  } catch (error) {
    return createVAccount(email, senderId, bvn, botType, currentCount + 1);
  }
}

/**
 * Unified Webhook Handler
 */
async function respondToWebhook(id: any, res: Response, custom: boolean) {
  try {
    const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    const response = await flw.Transaction.verify({ id: id });

    console.log('In respondToWebhook >>>>>>>>>>>>>>>>>>>   ', response);

    if (response.data.status.toLowerCase() !== 'successful') {
      return res.status(400).json({ status: false, message: 'Payment failed' });
    }

    if (!custom) res.status(200).send();

    // 1. Handle One-Time Accounts (Non-Virtual)
    if (response.data.meta && response.data.meta.transactionType) {
      const result = await carryOutNonVAccount(response, custom);
      if (custom) return res.json(result);
      return;
    }

    // 2. Handle Wallet Top-ups
    const topUpExists = await WalletFundings.findOne({ transactionId: id });
    if (topUpExists) {
      if (custom) res.json({ status: true, message: 'Top-up already exists' });
      return;
    }

    await new WalletFundings({
      transactionId: id,
      email: response.data.customer.email,
      userId: response.data.meta.senderId,
      amount: response.data.amount,
      data: new Date(),
    }).save();

    const account = await PaymentAccounts.findOneAndUpdate(
      { refrence: response.data.tx_ref },
      { $inc: { balance: response.data.amount } },
      { new: true }
    );

    if (account) {
      const config = getPlatformConfig(account.botType as 'facebook' | 'whatsapp');

      // WhatsApp specific: Check if session window is open
      const canNotify =
        account.botType === 'facebook' ||
        (await isConversationOpen(
          account.refrence as string,
          account.botType === 'facebook' ? 'FB' : 'WA'
        ));

      if (canNotify) {
        await config.send(
          account.refrence as string,
          `Top-up of ₦${response.data.amount} successful.`
        );
        await config.send(
          account.refrence as string,
          `New balance: ₦${(account?.balance || 0).toFixed(2)}`
        );

        const user = await config.model.findOne({ id: account.refrence }).select('purchasePayload');
        console.log('User in v-account wallect funding >>>>>>>>>>>>>>> ', user);

        if (user?.purchasePayload?.outStanding) {
          await initMakePurchase(config.label as 'FB' | 'WA', user.id as string);
        }
      }
    }

    if (custom) return res.json({ status: true, balance: account?.balance });
  } catch (error) {
    console.error('Webhook Error:', error);
  }
}

/**
 * Helper: Carry out non-v-account purchase
 */
const carryOutNonVAccount = async (response: any, custom: boolean) => {
  console.log('resposne in carryOutNonVAccount >>>>>>>>>>>>>>>>  ', response);

  const valid = await checkPaymentValidity(
    response.data.meta.id,
    response.data.amount,
    response.data.currency
  );

  if (!valid) return { status: false, message: 'Validation failed' };
  return await deliverValue(response, custom);
};

/**
 * Helper: Encode Number to Alphabet
 */
function encodeNumber(num: number): string {
  const map: Record<string, string> = {
    '0': 'J',
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',
    '5': 'E',
    '6': 'F',
    '7': 'G',
    '8': 'H',
    '9': 'I',
  };
  return String(num)
    .split('')
    .map((d) => map[d])
    .join('');
}

export { respondToWebhook, createVAccount, carryOutNonVAccount };
