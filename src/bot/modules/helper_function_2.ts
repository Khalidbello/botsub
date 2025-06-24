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
  return 0;
  switch (transactNum) {
    case 0:
      return 30;
    case 1:
      return 30;
    case 2:
      return 30;
    case 3:
      return 20;
    case 4:
      return 20;
    case 5:
      return 20;
    case 6:
      return 10;
    case 7:
      return 10;
    case 8:
      return 10;
    default:
      return 0;
  }
};

// function to increase the number of transaction the user has carried out
const updateTransactNum = async (userId: string): Promise<boolean> => {
  try {
    console.log('in updateTransactNum::::::::::::::::::::::::;');
    const incresee = await BotUsers.updateOne({ id: userId }, { $inc: { transactNum: 1 } });
    console.log('User transation number incresed in facebook bot: ', incresee);
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
    let payload: Record<string, any>;

    if (datas.transactionType === 'data') {
      payload = {
        network: datas.network,
        planID: datas.planID,
        networkID: datas.networkID,
        phoneNumber: datas.phoneNumber,
        index: datas.index,
        type: 'data',
        size: datas.size,
        bot: datas.bot,
        senderId: datas.senderId,
        firstPurchase: datas.firstPurchase,
        platform: datas.platform,
      };
    } else if (datas.transactionType === 'airtime') {
      payload = {
        network: datas.network,
        networkID: datas.networkID,
        amount: datas.price,
        type: 'airtime',
        phoneNumber: datas.phoneNumber,
        bot: datas.bot,
        senderId: datas.senderId,
        firstPurchase: datas.firstPurchase,
        platform: datas.platform,
      };
    } else {
      throw new Error('Invalid transaction type');
    }

    // Add internal tracking ID
    const tx_ref = generateRandomString(30);
    payload.id = tx_ref;

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
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SCRT_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('one time account generation response', response.data);

    return true;
  } catch (err: any) {
    console.error('Error in generateOneTimeAccountHelper:', err.response?.data || err.message);
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
  } else if (alphabet === 'l') {
    return 12;
  } else if (alphabet === 'm') {
    return 13;
  } else if (alphabet === 'n') {
    return 14;
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
