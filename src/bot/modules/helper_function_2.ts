import BotUsers from '../../models/fb_bot_users';
import GeneratedOAccounts from '../../models/generated-o-accounts';
import { generateRandomString } from '../../modules/helper_functions';
const FlutterWave = require('flutterwave-node-v3');

// fucntion to calculate user current data prices discount
const computeDiscount = (transactNum: number): number => {
  if (transactNum > 7) return 0;
  if (transactNum === 7) return 10;
  if (transactNum === 6) return 20;
  if (transactNum === 5) return 30;
  if (transactNum === 4) return 40;
  if (transactNum === 3) return 50;
  if (transactNum === 2) return 60;
  if (transactNum < 2) return 70;
  return 0;
};

// function to increase the number of transaction the user has carried out
const updateTransactNum = async (userId: string): Promise<boolean> => {
  try {
    await BotUsers.updateOne({ id: userId }, { $inc: { transactNum: 1 } });
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
export {
  computeDiscount,
  updateTransactNum,
  saveOneTimeAccount,
  generateOneTimeAccountHelper,
  checkPaymentValidity,
};
