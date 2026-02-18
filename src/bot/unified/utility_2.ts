import axios from 'axios';
import FBBotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import UsersWithdrawals from '../../models/users_withdrawal';
import GeneratedOAccounts from '../../models/generated-o-accounts';
import PaymentAccounts from '../../models/payment-accounts';
import Transactions from '../../models/transactions';
import { carryOutNonVAccount } from '../../modules/gateway';
import { generateRandomString } from '../../modules/helper_functions';
import { BotUserType } from '../grand_slam_offer/daily_participation_reminder';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { sendMessage } from '../fb_bot/modules/send_message';
import { DEFAULT_MESSAGE } from './send_message_generic';

const FlutterWave = require('flutterwave-node-v3');

// --- Platform Config Resolver ---
const getPlatformConfig: any = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  label: platform === 'FB' ? 'facebook' : 'whatsapp',
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
});

// --- Bank & Validation Logic ---

const fetchBankCodes = async (
  flutterwaveSecretKey: string,
  bankNameStart: string,
  countryCode = 'NG'
) => {
  if (!bankNameStart || bankNameStart.length !== 3) {
    throw new Error('Please provide exactly 3 starting letters of bank name');
  }

  const response = await axios.get(`https://api.flutterwave.com/v3/banks/${countryCode}`, {
    headers: { Authorization: `Bearer ${flutterwaveSecretKey}` },
  });

  const searchPrefix = bankNameStart.toLowerCase();
  return response.data.data.filter((bank: any) => bank.name.toLowerCase().startsWith(searchPrefix));
};

const validateBankAccount = async (accountNumber: string, bankCode: string) => {
  if (!bankCode) return { valid: false, message: 'Bank code is required.' };

  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/accounts/resolve',
      { account_number: accountNumber, account_bank: parseInt(bankCode) },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SCRT_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.status === 'success'
      ? { valid: true, message: 'Valid account details.', data: response.data.data }
      : { valid: false, message: 'Invalid account details.' };
  } catch (error: any) {
    return {
      valid: false,
      message: 'Error validating account details.',
      data: error.response?.data,
    };
  }
};

// --- Transaction & Transfer Logic ---

const initiateUserAccountTransfer = async (
  user: BotUserType,
  platform: 'FB' | 'WA',
  balance: number
): Promise<boolean> => {
  try {
    const config = getPlatformConfig(platform);
    const transferReference = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payload = {
      account_bank: user.withdrawalData.bankCode,
      account_number: user.withdrawalData.accountNumber,
      amount: user.withdrawalData.amount,
      narration: `Withdrawal for ${user.email} userId: ${user.id}`,
      currency: 'NGN',
      reference: transferReference,
    };

    const response = await axios.post('https://api.flutterwave.com/v3/transfers', payload, {
      headers: { Authorization: `Bearer ${process.env.FLW_SCRT_KEY}` },
    });

    if (response.data.status === 'success') {
      const newWithdrawal = new UsersWithdrawals({
        id: transferReference,
        userId: user.id,
        accountName: user.withdrawalData.accountName,
        accounNumber: user.withdrawalData.accountNumber,
        bankName: user.withdrawalData.bankName,
        status: 'pending',
        amount: user.withdrawalData.amount,
        createdAt: new Date(),
        platform: config.label,
      });
      await newWithdrawal.save();
    }
    return response.data.status === 'success';
  } catch (error) {
    return false;
  }
};

const generateOneTimeAccountHelper = async (datas: any): Promise<any> => {
  try {
    let tx_ref = generateRandomString(40);
    // Ensure unique tx_ref
    while (await PaymentAccounts.findOne({ id: tx_ref })) {
      tx_ref = generateRandomString(30);
    }

    const payload = { ...datas, id: tx_ref };
    const requestBody = {
      amount: datas.price,
      email: datas.email,
      tx_ref,
      fullname: datas.email,
      currency: 'NGN',
      meta: payload,
    };

    const response = await axios.post(
      'https://api.flutterwave.com/v3/charges?type=bank_transfer',
      requestBody,
      { headers: { Authorization: `Bearer ${process.env.FLW_SCRT_KEY}` } }
    );

    response.data.id = tx_ref;
    return response.data;
  } catch (err: any) {
    console.error('An error occured in generateOneTimeAccountHelper: ', err);
    return false;
  }
};

const updateLastMesageDate = async (senderId: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);
  await config.model.updateOne({ id: senderId }, { $set: { lastMessage: new Date() } });
};

const mapAlphaToNum = (alphabet: string): number => {
  const code = alphabet.toLowerCase().charCodeAt(0) - 96;
  return code >= 1 && code <= 14 ? code : 0;
};

const retryAllFailedTransactions = async () => {
  const flw = new FlutterWave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  const transactions = await Transactions.find({ status: 'failed' }).limit(10);

  await Promise.all(
    transactions.map(async (txn) => {
      const response = await flw.Transaction.verify({ id: txn.id });
      return carryOutNonVAccount(response, true);
    })
  );
};

/**
 * UNIFIED: Cancel Transaction
 * Replaces cancelTransaction and cancelTransactionW
 */
async function cancelTransaction(senderId: string, platform: 'FB' | 'WA', sendMessage: boolean) {
  const config = getPlatformConfig(platform);

  // 1. Perform the unified reset
  await resetUserPayload(platform, senderId);

  //console.log(`Condition in cancelTransaction [${platform}]:`, end);

  // 2. Platform-dependent messaging
  if (!sendMessage) return;

  config.send(senderId, DEFAULT_MESSAGE);
}

/**
 * UNIFIED: Reset Helper
 * Replaces reset and resetW
 */
const resetUserPayload = async (platform: 'FB' | 'WA', senderId: string) => {
  const Model = platform === 'FB' ? FBBotUsers : WhatsappBotUsers;

  await Model.updateOne(
    { id: senderId },
    {
      $set: {
        nextAction: null,
        purchasePayload: {},
      },
    }
  );
};

function isDateGreaterThan10Minutes(date: Date): boolean {
  const currentDate = new Date();
  const tenMinutesInMilliseconds = 10 * 60 * 1000;
  const difference = Math.abs(currentDate.getTime() - date.getTime());

  //console.log('in time checker', currentDate, difference, tenMinutesInMilliseconds);

  return difference > tenMinutesInMilliseconds;
}

// function to increase the number of transaction the user has carried out
const updateTransactNum = async (senderId: string, platform: 'FB' | 'WA'): Promise<boolean> => {
  const config = getPlatformConfig(platform);
  try {
    const incresee = await config.model.updateOne({ id: senderId }, { $inc: { transactNum: 1 } });
    return true;
  } catch (err) {
    console.error('AN error occured in updating user transactNum', err);
    return false;
  }
};

// --- Exports ---
export {
  fetchBankCodes,
  validateBankAccount,
  initiateUserAccountTransfer,
  updateTransactNum,
  generateOneTimeAccountHelper,
  updateLastMesageDate,
  mapAlphaToNum,
  retryAllFailedTransactions,
  cancelTransaction,
  isDateGreaterThan10Minutes,
};
