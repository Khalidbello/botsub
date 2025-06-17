import axios from 'axios';
import PaymentAccounts from '../../../models/payment-accounts';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import { validateNigerianAccountNumber } from '../../../modules/helper_functions';
import { BotUserType } from '../../grand_slam_offer/daily_participation_reminder';
import sendMessageW from '../send_message_w';
import { defaaultMessageW } from './message_responses';
import { handleUserHasNoVirtualAcountW } from './virtual-account';
import { cancelTransactionW } from './generic';
import {
  fetchBankCodes,
  initiateUserAccountTransfer,
  validateBankAccount,
} from '../helper_fucntions_2';

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
  y: 23,
  z: 23,
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
    await sendMessageW(
      senderId,
      `Enter account number you wish to withdraw to: \n\nEnter X to cancel.`
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      { $set: { nextAction: 'enterAccountNumberForWithdrawal' } }
    );
  } catch (err) {
    console.error('An error occured in withdrawFromAccountBalance: ', err);
    await sendMessageW(senderId, 'Sorry an error occured.');
    await sendMessageW(senderId, defaaultMessageW);
  }
};

// function to handle account number entered
const handleEnterAccountNumberForWithdrawalW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const accountNumber = messageObj?.text ? messageObj.text.body.toLowerCase() : '';

  try {
    if (accountNumber === 'x') return cancelTransactionW(senderId, false);

    const isAccountNumberValid = validateNigerianAccountNumber(accountNumber);

    if (!isAccountNumberValid) {
      await sendMessageW(
        senderId,
        'The account number you entred is not valid. \n\nPlease enter a valid account number: \n\nEnter X to cancel'
      );
      return;
    }

    sendMessageW(
      senderId,
      'Enter the first three letters of your bank name. \n\nEnter X to cancel.'
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterBankNameFirst3AlphaW',
          'withdrawalData.accountNumber': accountNumber,
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handleEnterAccountNumberForWithdrawal: ', err);
    await sendMessageW(senderId, 'An error occured.');
    await sendMessageW(senderId, 'Please enter withdrawal account number: ');
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

    const isAccountDetailsValid = await validateBankAccount(
      user.withdrawalData.accountNumber,
      bank.code
    );

    //console.log('Acconunt details: ', isAccountDetailsValid);

    if (!isAccountDetailsValid.valid) {
      sendMessageW(
        senderId,
        'The account details you provided is not valid. please start over again.\n\nEnter X to cancel.'
      );
      return cancelTransactionW(senderId, true);
    }

    sendMessageW(
      senderId,
      `If account details is not correct kindly cancel transfer. 
      \n\nAccount Name: ${isAccountDetailsValid.data.account_name} \nAccount number: ${isAccountDetailsValid.data.account_number} \nBank name: ${bank.name}
      \n\nEnter transfer amount: \n\nEnter X to cancel.`
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterWithdrawalAmount',
          'withdrawalData.bankName': bank.name,
          'withdrawalData.accountName': isAccountDetailsValid.data.account_name,
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

const handleEnterWithdrawalAmountW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const amount = messageObj.text ? messageObj.text.body.toLowerCase() : '';
  const miniMesseger = async () => {
    await sendMessageW(
      senderId,
      `If account details is not correct kindly cancel transfer. 
    \n\nAccount Name: ${user.withdrawalData.accountName} \nAccount number: ${user.withdrawalData.accountNumber} \nBank name: ${user.withdrawalData.bankName}
    \n\nEnter transfer amount: \n\nEnter X to cancel.`
    );
  };

  try {
    if (amount === 'x') return cancelTransactionW(senderId, false);

    const numbAmount = parseInt(amount);

    if (!numbAmount) {
      await sendMessageW(senderId, 'Please enter valid amount to withdraw');
      await miniMesseger();
      return;
    }

    if (numbAmount < 100) {
      await sendMessageW(senderId, 'Minimum withdrawal is 100.');
      await miniMesseger();
      return;
    }

    let account = await PaymentAccounts.findOne({ refrence: senderId });

    if ((account?.balance ? account.balance : 0) < numbAmount + 30) {
      await sendMessageW(
        senderId,
        `You can not withdraw ${numbAmount} as your account balance is ${account?.balance}`
      );

      await miniMesseger();
      return;
    }

    // confirm withdrawal
    sendMessageW(
      senderId,
      `If account details is not correct kindly cancel transfer. 
    \n\nAccount Name: ${user.withdrawalData.accountName} \nAccount number: ${user.withdrawalData.accountNumber} \nBank name: ${user.withdrawalData.bankName} \nAmount: ${numbAmount}
    \n\nA. Make transfer \n\nEnter X to cancel.`
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'confirmTransfer',
          'withdrawalData.amount': numbAmount,
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handelSelectBank: ', err);
    await sendMessageW(senderId, 'An error occured.');
    await miniMesseger();
  }
};

const handelConfirmTransferW = async (messageObj: any, user: BotUserType) => {
  const senderId = messageObj.from;
  const message = messageObj.text ? messageObj.text.body.toLowerCase() : '';
  const miniMesseger = async () => {
    sendMessageW(
      senderId,
      `Confirm transfer, if account details is not correct kindly cancel transfer. 
    \n\nAccount Name: ${user.withdrawalData.accountName} \nAccount number: ${user.withdrawalData.accountNumber} \nBank name: ${user.withdrawalData.bankName} \nAmount: ${user.withdrawalData.amount}
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
      { $dec: { balance: -(user.withdrawalData.amount + 50) } }
    );

    const initiated = await initiateUserAccountTransfer(user); // initiate transfer

    if (!initiated) {
      await PaymentAccounts.updateOne(
        { id: user.id },
        { $dec: { balance: user.withdrawalData.amount + 50 } }
      );
      throw 'Transfer quing failed';
    }

    sendMessageW(
      senderId,
      'Transfer successfully initiated, you will recieve a notificaion on tranfer status in 1 minutess....'
    );
  } catch (err) {
    console.error('An error occured in handelConfirmTransferW: ', err);
    await sendMessageW(senderId, 'An error occured.');
    await miniMesseger();
  }
};

export {
  withdrawFromAccountBalanceW,
  handleEnterAccountNumberForWithdrawalW,
  handleEnterBankNameFirst3AlphaW,
  handelSelectBankW,
  handleEnterWithdrawalAmountW,
  handelConfirmTransferW,
};
