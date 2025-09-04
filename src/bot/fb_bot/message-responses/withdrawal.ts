import PaymentAccounts from '../../../models/payment-accounts';
import { BotUserType } from '../../grand_slam_offer/daily_participation_reminder';
import {
  fetchBankCodes,
  initiateUserAccountTransfer,
  validateBankAccount,
} from '../../whatsaap_bot/helper_fucntions_2';
import FBBotUsers from '../../../models/fb_bot_users';
import { sendMessage } from '../../modules/send_message';
import { cancelTransaction, defaultText } from './generic';
import { handleUserHasNoVirtualAcount } from './virtual-account';

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

const withdrawFromAccountBalance = async (event: any, user: BotUserType) => {
  const senderId = event.sender.id;
  //const message = event.message.text.trim();

  try {
    console.log('user in withdrawFromAccountBalance:::::::::;; ', senderId, user.id);
    let account = await PaymentAccounts.findOne({ refrence: senderId });

    if (!account) return handleUserHasNoVirtualAcount(user);

    await sendMessage(senderId, {
      text: `Your account balance is ₦${account.balance}. \n\nMinimum withdrawal is ₦100 \n\nAll withdrawl are charged at ₦30.`,
    });
    await sendMessage(senderId, {
      text: `Enter amount you wish to withdraw: \n\nEnter X to cancel.`,
    });

    await FBBotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterWithdrawalAmount' } });
  } catch (err) {
    console.error('An error occured in withdrawFromAccountBalance: ', err);
    await sendMessage(senderId, { text: 'Sorry an error occured.' });
    await sendMessage(senderId, { text: defaultText });
  }
};

const handleEnterWithdrawalAmount = async (event: any, user: BotUserType) => {
  const senderId = event.sender.id;
  const amount = event.message ? event.message.text.trim().toLowerCase() : '';

  try {
    if (amount === 'x') return cancelTransaction(senderId, false);

    const numbAmount = parseInt(amount);

    if (!numbAmount) {
      await sendMessage(senderId, {
        text: 'Please enter valid amount to withdraw: \n\nEnter  X to cancel.',
      });

      return;
    }

    if (numbAmount < 100) {
      await sendMessage(senderId, {
        text: 'Minimum withdrawal is ₦100. \nPlease enter an amount greater than ₦100 to withdraw: \n\nEnter X to cancel.',
      });

      return;
    }

    let account = await PaymentAccounts.findOne({ refrence: senderId });

    if ((account?.balance ? account.balance : 0) < numbAmount + 30) {
      await sendMessage(senderId, {
        text: `You can not withdraw ₦${numbAmount} as your account balance is ₦${account?.balance}. \n\n₦30 charges apply to all withdrawals.`,
      });

      await cancelTransaction(event.sender.id, true);

      return;
    }

    await sendMessage(senderId, {
      text: 'Enter first 3 letters of bank you wish to withdraw to: \n\nEnter X to cancel.',
    });

    await FBBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterBankNameFirst3Alpha',
          'withdrawalData.amount': numbAmount,
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handelSelectBank: ', err);
    await sendMessage(senderId, { text: 'An error occured.' });
    await sendMessage(senderId, {
      text: 'Please enter withdrawal amount: \n\nEnter  X to cancel.',
    });
  }
};

const handleEnterBankNameFirst3Alpha = async (event: any, user: BotUserType) => {
  const senderId = event.sender.id;
  const bankName = event.message ? event.message.text.trim().toLowerCase() : '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  try {
    if (bankName === 'x') return cancelTransaction(senderId, false);

    if (!bankName || bankName.length !== 3)
      return sendMessage(senderId, {
        text: 'Please provide exactly 3 starting letters of your bank name.',
      });

    const bankNames = await fetchBankCodes('NG', process.env.FLW_SCRT_KEY as string, bankName);

    if (!bankNames)
      return sendMessage(senderId, {
        text: 'No bank found for the. \n\nPlease enter 3 starting letters of your bank name. \n\n Enter X to cancel.',
      });

    let message = 'Please select your bank\n';

    bankNames.forEach((bank: any, index: number) => {
      if (index < alphabet.length) {
        message += `\n ${alphabet[index]}. ${bank.name}`;
      }
    });
    message += '\n\nEnter X to cancel';

    sendMessage(senderId, { text: message });

    await FBBotUsers.updateOne(
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
    await sendMessage(senderId, { text: 'An error occured.' });
    sendMessage(senderId, {
      text: 'Please enter 3 starting letters of your bank name. \n\nEnter X to cancel.',
    });
  }
};

const handelSelectBank = async (event: any, user: BotUserType) => {
  const senderId = event.sender.id;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  try {
    const bankName = event.message ? event.message.text.trim().toLowerCase() : '';

    if (bankName === 'x') return cancelTransaction(senderId, false);

    // @ts-expect-error jsut shhh
    const bank = user.withdrawalData.bankListing[alphaMapping[bankName]];
    console.log('Bank Name in handelSelectBank: ', bank);

    if (!bank) {
      let message = 'Please select your bank\n';

      await sendMessage(senderId, { text: 'In valid response recieved.' });

      user.withdrawalData.bankListing.forEach((bank: any, index: number) => {
        if (index < alphabet.length) {
          message += `\n ${alphabet[index]}. ${bank.name}`;
        }
      });
      message += '\n\nEnter X to cancel';

      await sendMessage(senderId, { text: message });

      return;
    }

    await sendMessage(senderId, {
      text: `Enter ${bank.name} account number for withdrawal: \n\nEnter X to cancel.`,
    });

    await FBBotUsers.updateOne(
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
    await sendMessage(senderId, { text: 'An error occured.' });

    let message = 'Please select your bank\n';

    user.withdrawalData.bankListing.forEach((bank: any, index: number) => {
      if (index < alphabet.length) {
        message += `\n ${alphabet[index]}. ${bank.name}`;
      }
    });
    message += '\n\nEnter X to cancel.';

    sendMessage(senderId, { text: message });
  }
};

// function to handle account number entered
const handleEnterAccountNumberForWithdrawal = async (event: any, user: BotUserType) => {
  const senderId = event.sender.id;
  const accountNumber = event?.message ? event.message.text.trim().toLowerCase() : '';

  try {
    if (accountNumber === 'x') return cancelTransaction(senderId, false);

    const isAccountDetailsValid = await validateBankAccount(
      accountNumber,
      user.withdrawalData.bank.code
    );

    console.log(' (account number) Acconunt details: ', isAccountDetailsValid);

    if (!isAccountDetailsValid.valid) {
      sendMessage(senderId, {
        text: `The ${user.withdrawalData.bank.name} account number you provided is not valid. \n\nPlease enter a valid account number: \n\nEnter X to cancel.`,
      });

      return;
    }

    // confirm withdrawal
    await sendMessage(senderId, {
      text: `If account details is not correct kindly cancel transfer.
    \n\nAccount Name: ${isAccountDetailsValid.data.account_name} \nAccount number: ${isAccountDetailsValid.data.account_number} \nBank name: ${user.withdrawalData.bank.name} \nAmount: ₦${user.withdrawalData.amount}
    \n\nA. Make transfer \n\nEnter X to cancel.`,
    });

    await FBBotUsers.updateOne(
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
    await sendMessage(senderId, { text: 'An error occured.' });
    await sendMessage(senderId, {
      text: `Please enter  ${user.withdrawalData.bank.name} account number for withdrawal : \n\nEnter X to cancel.`,
    });
  }
};

const handleConfirmWithdrawal = async (event: any, user: BotUserType) => {
  const senderId = event.sender.id;
  const message = event.message ? event.message.text.trim().toLowerCase() : '';
  const miniMesseger = async () => {
    sendMessage(senderId, {
      text: `Confirm transfer, if account details is not correct kindly cancel transfer. 
    \n\nAccount Name: ${user.withdrawalData.accountName} \nAccount number: ${user.withdrawalData.accountNumber} \nBank name: ${user.withdrawalData.bank.name} \nAmount: ₦${user.withdrawalData.amount}
    \n\nA. Make transfer \n\nEnter X to cancel.`,
    });
  };

  try {
    if (message === 'x') return cancelTransaction(senderId, false);

    if (message !== 'a') {
      await sendMessage(senderId, { text: 'The response you entred is not valid.' });
      await miniMesseger();
      return;
    }

    const balance = await PaymentAccounts.findOneAndUpdate(
      { id: user.id },
      { $dec: { balance: user.withdrawalData.amount + 50 } }
    );

    const initiated = await initiateUserAccountTransfer(
      user,
      'facebook',
      balance?.balance as number
    ); // initiate transfer

    if (!initiated) {
      await PaymentAccounts.updateOne(
        { id: user.id },

        { $inc: { balance: user.withdrawalData.amount + 50 } }
      );
      throw 'Transfer quing failed';
    }

    sendMessage(senderId, {
      text: 'Transfer successfully initiated, you will recieve a notificaion on tranfer status in 2 minutes....',
    });
  } catch (err) {
    console.error('An error occured in handelConfirmTransferW: ', err);
    await sendMessage(senderId, { text: 'An error occured.' });
    await miniMesseger();
  }
};

export {
  withdrawFromAccountBalance,
  handleEnterWithdrawalAmount,
  handleEnterBankNameFirst3Alpha,
  handelSelectBank,
  handleEnterAccountNumberForWithdrawal,
  handleConfirmWithdrawal,
};
