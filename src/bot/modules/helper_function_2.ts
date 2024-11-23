import BotUsers from '../../models/fb_bot_users';
import GeneratedOAccounts from '../../models/generated-o-accounts';

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
  reference: string
) => {
  try {
    const newAccount = new GeneratedOAccounts({
      user_id: userId,
      account_number: accountNumber,
      transactNum: transactNum,
      ref: reference,
      amount_to_be_paid: price,
      date: new Date(),
    });
    await newAccount.save();
    return true;
  } catch (err) {
    console.error('AN error occured writting new ot account', err);
    return false;
  }
};

export { computeDiscount, updateTransactNum, saveOneTimeAccount };
