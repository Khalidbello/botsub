import BotUsers from '../../models/fb_bot_users';
import GeneratedOAccounts from '../../models/generated-o-accounts';
import Transactions from '../../models/transactions';
import { trendData } from '../../modules/admin/statistics';
import { carryOutNonVAccount } from '../../modules/gateway';
import { generateRandomString } from '../../modules/helper_functions';
const FlutterWave = require('flutterwave-node-v3');
import axios from 'axios';

// fucntion to comput
const computeDiscount = (transactNum: number): number => {
  switch (transactNum) {
    case 0:
      return 70; // First transaction: 70 Naira discount
    case 1:
      return 60; // Second transaction: 60 Naira discount
    case 2:
      return 40; // Third transaction: 40 Naira discount
    case 3:
      return 10; // Fourth transaction: 10 Naira discount
    default:
      return 0; // Fifth and beyond: no discount
  }
};

// function to increase the number of transaction the user has carried out
const updateTransactNum = async (userId: string): Promise<boolean> => {
  try {
    console.log('in updateTransactNum::::::::::::::::::::::::;');
    const incresee = await BotUsers.updateOne({ id: userId }, { $inc: { transactNum: 1 } });
    console.log('User transation number incresed: ', incresee);
    return true;
  } catch (err) {
    console.error('AN error occured in updating user transactNum', err);
    return false;
  }
};

// function to create new transaction to for one time account users
const saveOneTimeAccount = async (
  userId: string,
  transactNum: number,
  accountNumber: string,
  price: number,
  id: string
) => {
  try {
    const newAccount = new GeneratedOAccounts({
      user_id: userId,
      account_number: accountNumber,
      transactNum: transactNum,
      id: id,
      amount_to_be_paid: price,
      date: new Date(),
      currency: 'NGN',
    });
    await newAccount.save();
    return true;
  } catch (err) {
    console.error('AN error occured writting new ot account', err);
    return false;
  }
};

// helper function to generate one time account number
const generateOneTimeAccountHelper = async (datas: any): Promise<any> => {
  console.log('in generateOneTimeAccount', datas);
  try {
    let payload;
    if (datas.transactionType == 'data') {
      payload = {
        network: datas.network,
        planID: datas.planID,
        networkID: datas.networkID,
        phoneNumber: datas.phoneNumber,
        index: datas.index,
        type: datas.transactionType,
        size: datas.size,
        bot: datas.bot,
        senderId: datas.senderId,
        firstPurchase: datas.firstPurchase,
        platform: datas.platform,
      };
    } else if (datas.transactionType == 'airtime') {
      payload = {
        network: datas.network,
        networkID: datas.networkID,
        amount: datas.price,
        type: datas.transactionType,
        phoneNumber: datas.phoneNumber,
        bot: datas.bot,
        senderId: datas.senderId,
        firstPurchase: datas.firstPurchase,
        platform: datas.platform,
      };
    }

    // @ts-expect-error id is not in type
    // storing this as meta data so it will be used when to find transaction once payment is made
    if (payload) payload.id = generateRandomString(30);

    console.log('bot purchase payload', payload);

    const details = {
      amount: datas.price,
      email: datas.email,
      // @ts-expect-error id is not part of payload added it forcefully
      tx_ref: payload?.id,
      fullname: datas.email,
      currency: 'NGN',
      meta: payload,
    };

    const flw = new FlutterWave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    const response = await flw.Charge.bank_transfer(details);
    console.log('one time account generation response', response);
    // @ts-expect-error error
    return [response, payload?.id];
  } catch (err) {
    console.error('An error occurd in helper generate one time account', err);
    return false;
  }
};

// check if one  time account payment the aactual price was paid
const checkPaymentValidity = async (id: string, price: number, currency: string): Promise<any> => {
  try {
    const account = await GeneratedOAccounts.findOne({ id: id });

    console.log('n check validity: ', account);
    if (account?.amount_to_be_paid === price && account?.currency === currency) return true;
    return false;
  } catch (err) {
    console.error('An erorr occured in checkPaymentValidity,,,, ', err);
    return false;
  }
};
// function to deliver value but only needs transaction id to carry out
const makeDelivery = (transactionId: number) => {
  // verify user paid the correct amount
};

// fucntion to retry all failed delivery
const retryAllFaledTransactions = async () => {
  try {
    const flw = new FlutterWave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    let loopCount = 0;

    while (true) {
      const transactions = await Transactions.find({ status: 'failed' }).limit(10);

      const tPromise = transactions.map(async (trnasaction) => {
        const response = await flw.Transaction.verify({ id: trnasaction.id }); // check again if transaction is succesful
        carryOutNonVAccount(response, true);
      });

      await Promise.all(tPromise);
      loopCount++;
      if (loopCount < 11 || transactions.length < 10) break;
    }
  } catch (err) {
    console.error('AN error occured in carrying out retry for all transactions', err);
  }
};

// helper function to map alphabet to number
const mapAlpaheToNum = (alphabet: string) => {
  alphabet.toLowerCase();
  if (alphabet === 'a') {
    return 1;
  } else if (alphabet === 'b') {
    return 2;
  } else if (alphabet === 'c') {
    return 3;
  } else if (alphabet === 'd') {
    return 4;
  } else if (alphabet === 'e') {
    return 5;
  } else if (alphabet === 'f') {
    return 6;
  } else if (alphabet === 'g') {
    return 7;
  } else if (alphabet === 'h') {
    return 8;
  } else if (alphabet === 'i') {
    return 9;
  } else if (alphabet === 'j') {
    return 10;
  } else if (alphabet === 'k') {
    return 11;
  }
  return 0;
};

// function to check if balance is low and funds it if true
const checkFundBalance = async () => {
  try {
    const response = await axios.get('url', {
      headers: {},
    });
  } catch (err) {
    console.error('An error occured in checkFundBalance :', err);
  }
};

// fucntiion to save userslast message date
const updateLastMesageDate = async (senderId: string) => {
  const date = new Date();
  await BotUsers.updateOne({ id: senderId }, { $set: { lastMessage: date } });
};
export {
  computeDiscount,
  updateTransactNum,
  saveOneTimeAccount,
  generateOneTimeAccountHelper,
  checkPaymentValidity,
  retryAllFaledTransactions,
  mapAlpaheToNum,
  updateLastMesageDate,
};
