import PaymentAccounts from '../../../models/payment-accounts';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import { BotUserType } from '../../grand_slam_offer/daily_participation_reminder';
import {
  fetchBankCodes,
  initiateUserAccountTransfer,
  validateBankAccount,
} from '../../whatsaap_bot/helper_fucntions_2';
import sendMessageW from '../send_message_w';
import { cancelTransactionW } from './generic';
import { defaaultMessageW } from './message_responses';
import { handleUserHasNoVirtualAcountW } from './virtual-account';

// bank listing alpah mapping
const alphaMapping = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
  i: 8,
  j: 9,
  k: 10,
  l: 11,
  m: 12,
  n: 13,
  o: 14,
  p: 15,
  q: 16,
  r: 17,
  s: 18,
  t: 19,
  u: 20,
  v: 21,
  w: 22,
  x: 23,
  y: 24,
  z: 25,
};

const withdrawFromAccountBalanceW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;

  try {
    let account = await PaymentAccounts.findOne({ refrence: senderId });

    if (!account) return handleUserHasNoVirtualAcountW(user);

    await sendMessageW(
      senderId,
      `Your account balance is ₦${account.balance}. \n\nMinimum withdrawal is ₦100 \n\nAll withdrawl are charged at ₦30.`
    );
    await sendMessageW(senderId, `Enter amount you wish to withdraw: \n\nEnter X to cancel.`);

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      { $set: { nextAction: 'enterWithdrawalAmount' } }
    );
  } catch (err) {
    console.error('An error occured in withdrawFromAccountBalance: ', err);
    await sendMessageW(senderId, 'Sorry an error occured.');
    await sendMessageW(senderId, defaaultMessageW);
  }
};

const handleEnterWithdrawalAmountW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const amount = messageObj.text ? messageObj.text.body.toLowerCase() : '';

  try {
    if (amount === 'x') return cancelTransactionW(senderId, false);

    const numbAmount = parseInt(amount);

    if (!numbAmount) {
      await sendMessageW(
        senderId,
        'Please enter valid amount to withdraw: \n\nEnter  X to cancel.'
      );
      //await miniMesseger();
      return;
    }

    if (numbAmount < 100) {
      await sendMessageW(
        senderId,
        'Minimum withdrawal is ₦100. \nPlease enter an amount greater than ₦100 to withdraw: \n\nEnter X to cancel.'
      );

      return;
    }

    let account = await PaymentAccounts.findOne({ refrence: senderId });

    if ((account?.balance ? account.balance : 0) < numbAmount + 30) {
      await sendMessageW(
        senderId,
        `You can not withdraw ₦${numbAmount} as your account balance is ₦${account?.balance}. \n\n₦30 charges apply to all withdrawals.`
      );

      await cancelTransactionW(messageObj.from, true);

      return;
    }

    await sendMessageW(
      senderId,
      'Enter first 3 letters of bank you wish to withdraw to: \n\nEnter X to cancel.'
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterBankNameFirst3AlphaW',
          'withdrawalData.amount': numbAmount,
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handelSelectBank: ', err);
    await sendMessageW(senderId, 'An error occured.');
    await sendMessageW(senderId, 'Please enter withdrawal amount: \n\nEnter  X to cancel.');
  }
};

const handleEnterBankNameFirst3AlphaW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const bankName = messageObj.text ? messageObj.text.body.toLowerCase() : '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  try {
    if (bankName === 'x') return cancelTransactionW(senderId, false);

    if (!bankName || bankName.length !== 3)
      return sendMessageW(senderId, 'Please provide exactly 3 starting letters of your bank name.');

    const bankNames = await fetchBankCodes('NG', process.env.FLW_SCRT_KEY as string, bankName);

    if (!bankNames)
      return sendMessageW(
        senderId,
        'No bank found for the. \n\nPlease enter 3 starting letters of your bank name. \n\n Enter X to cancel.'
      );

    let message = 'Please select your bank\n';

    bankNames.forEach((bank: any, index: number) => {
      if (index < alphabet.length) {
        message += `\n ${alphabet[index]}. ${bank.name}`;
      }
    });
    message += '\n\nEnter X to cancel';

    sendMessageW(senderId, message);

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'selectBank',
          'withdrawalData.bankListing': bankNames,
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handleAccountNameFirst3AlphaW: ', err);
    await sendMessageW(senderId, 'An error occured.');
    sendMessageW(
      senderId,
      'Please enter 3 starting letters of your bank name. \n\nEnter X to cancel.'
    );
  }
};

const handelSelectBankW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bankName = messageObj.text ? messageObj.text.body.toLowerCase() : '';

  try {
    if (bankName === 'x') return cancelTransactionW(senderId, false);

    // @ts-expect-error jsut shhh
    const bank = user.withdrawalData.bankListing[alphaMapping[bankName]];
    console.log('Bank Name in handelSelectBankW: ', bank);

    if (!bank) {
      let message = 'Please select your bank\n';

      await sendMessageW(senderId, 'In valid response recieved.');

      user.withdrawalData.bankListing.forEach((bank: any, index: number) => {
        if (index < alphabet.length) {
          message += `\n ${alphabet[index]}. ${bank.name}`;
        }
      });
      message += '\n\nEnter X to cancel';

      await sendMessageW(senderId, message);

      return;
    }

    await sendMessageW(
      senderId,
      `Enter ${bank.name} account number for withdrawal: \n\nEnter X to cancel.`
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterWithdrawalAccount',
          'withdrawalData.bank': { ...bank },
          'withdrawalData.bankListing': [],
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handelSelectBank: ', err);
    await sendMessageW(senderId, 'An error occured.');

    let message = 'Please select your bank\n';

    user.withdrawalData.bankListing.forEach((bank: any, index: number) => {
      if (index < alphabet.length) {
        message += `\n ${alphabet[index]}. ${bank.name}`;
      }
    });
    message += '\n\nEnter X to cancel.';

    sendMessageW(senderId, message);
  }
};

// function to handle account number entered
const handleEnterAccountNumberForWithdrawalW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const accountNumber = messageObj?.text ? messageObj.text.body.toLowerCase() : '';

  try {
    if (accountNumber === 'x') return cancelTransactionW(senderId, false);

    const isAccountDetailsValid = await validateBankAccount(
      accountNumber,
      user.withdrawalData.bank.code
    );

    console.log(' (account number) Acconunt details: ', isAccountDetailsValid);

    if (!isAccountDetailsValid.valid) {
      sendMessageW(
        senderId,
        `The ${user.withdrawalData.bank.name} account number you provided is not valid. \n\nPlease enter a valid account number: \n\nEnter X to cancel.`
      );

      return;
    }

    // confirm withdrawal
    await sendMessageW(
      senderId,
      `If account details is not correct kindly cancel transfer.
    \n\nAccount Name: ${isAccountDetailsValid.data.account_name} \nAccount number: ${isAccountDetailsValid.data.account_number} \nBank name: ${user.withdrawalData.bank.name} \nAmount: ₦${user.withdrawalData.amount}
    \n\nA. Make transfer \n\nEnter X to cancel.`
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'confirmWithdrawal',
          'withdrawalData.accountNumber': accountNumber,
          'withdrawalData.accountName': isAccountDetailsValid.data.account_name,
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handleEnterAccountNumberForWithdrawal: ', err);
    await sendMessageW(senderId, 'An error occured.');
    await sendMessageW(
      senderId,
      `Please enter  ${user.withdrawalData.bank.name} account number for withdrawal : \n\nEnter X to cancel.`
    );
  }
};

const handleConfirmWithdrawalW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const message = messageObj.text ? messageObj.text.body.toLowerCase() : '';
  const miniMesseger = async () => {
    sendMessageW(
      senderId,
      `Confirm transfer, if account details is not correct kindly cancel transfer. 
    \n\nAccount Name: ${user.withdrawalData.accountName} \nAccount number: ${user.withdrawalData.accountNumber} \nBank name: ${user.withdrawalData.bank.name} \nAmount: ₦${user.withdrawalData.amount}
    \n\nA. Make transfer \n\nEnter X to cancel.`
    );
  };

  try {
    if (message === 'x') return cancelTransactionW(senderId, false);

    if (message !== 'a') {
      await sendMessageW(senderId, 'The response you entred is not valid.');
      await miniMesseger();
      return;
    }

    await PaymentAccounts.updateOne(
      { id: user.id },
      { $dec: { balance: user.withdrawalData.amount + 50 } }
    );

    const initiated = await initiateUserAccountTransfer(user, 'whatsapp'); // initiate transfer

    if (!initiated) {
      await PaymentAccounts.updateOne(
        { id: user.id },

        { $inc: { balance: user.withdrawalData.amount + 50 } }
      );
      throw 'Transfer quing failed';
    }

    sendMessageW(
      senderId,
      'Transfer successfully initiated, you will recieve a notificaion on tranfer status in 2 minutes....'
    );
  } catch (err) {
    console.error('An error occured in handelConfirmTransferW: ', err);
    await sendMessageW(senderId, 'An error occured.');
    await miniMesseger();
  }
};

export {
  withdrawFromAccountBalanceW,
  handleEnterWithdrawalAmountW,
  handleEnterBankNameFirst3AlphaW,
  handelSelectBankW,
  handleEnterAccountNumberForWithdrawalW,
  handleConfirmWithdrawalW,
};
