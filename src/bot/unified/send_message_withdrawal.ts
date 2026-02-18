import FBBotUsers from '../../models/fb_bot_users';
import PaymentAccounts from '../../models/payment-accounts';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { BotUserType } from '../grand_slam_offer/daily_participation_reminder';
import { sendMessage } from '../fb_bot/modules/send_message';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { DEFAULT_MESSAGE } from './send_message_generic';
import { handleUserHasNoVirtualAcount } from './send_message_v_account';
import {
  cancelTransaction,
  fetchBankCodes,
  initiateUserAccountTransfer,
  validateBankAccount,
} from './utility_2';

// --- Shared Constants & Helpers ---
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphaMapping: Record<string, number> = {
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

const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  platformLabel: platform === 'FB' ? 'facebook' : 'whatsapp',
});

// --- Unified Functions ---

const withdrawFromAccountBalance = async (
  senderId: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);
  try {
    let account = await PaymentAccounts.findOne({ refrence: senderId });
    if (!account) return handleUserHasNoVirtualAcount(user, platform);

    await config.send(
      senderId,
      `Your account balance is ₦${account.balance}. \n\nMinimum withdrawal is ₦100 \n\nAll withdrawals are charged at ₦30.`
    );
    await config.send(senderId, `Enter amount you wish to withdraw: \n\nEnter X to cancel.`);

    await config.model.updateOne(
      { id: senderId },
      { $set: { nextAction: 'enterWithdrawalAmount' } }
    );
  } catch (err) {
    console.error('Error in withdrawFromAccountBalance:', err);
    await config.send(senderId, 'Sorry, an error occurred.');
    await config.send(senderId, DEFAULT_MESSAGE);
  }
};

const handleEnterWithdrawalAmount = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA'
) => {
  const config = getPlatformConfig(platform);
  const amount = message.trim().toLowerCase();

  try {
    if (amount === 'x') return cancelTransaction(senderId, platform, false);
    const numbAmount = parseInt(amount);

    if (!numbAmount || numbAmount < 100) {
      return config.send(
        senderId,
        'Minimum withdrawal is ₦100. Please enter a valid amount: \n\nEnter X to cancel.'
      );
    }

    let account = await PaymentAccounts.findOne({ refrence: senderId });
    if ((account?.balance || 0) < numbAmount + 30) {
      await config.send(
        senderId,
        `Insufficient balance. Your balance is ₦${account?.balance}. ₦30 charges apply.`
      );
      return cancelTransaction(senderId, platform, true);
    }

    await config.send(
      senderId,
      'Enter first 3 letters of bank you wish to withdraw to: \n\nEnter X to cancel.'
    );
    await config.model.updateOne(
      { id: senderId },
      { $set: { nextAction: 'enterBankNameFirst3Alpha', 'withdrawalData.amount': numbAmount } }
    );
  } catch (err) {
    await config.send(
      senderId,
      'An error occurred. Please enter withdrawal amount: \n\nEnter X to cancel.'
    );
  }
};

const handleEnterBankNameFirst3Alpha = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA'
) => {
  const config = getPlatformConfig(platform);
  const bankQuery = message.trim().toLowerCase();

  try {
    if (bankQuery === 'x') return cancelTransaction(senderId, platform, false);
    if (bankQuery.length !== 3)
      return config.send(senderId, 'Please provide exactly 3 starting letters.');

    const bankNames = await fetchBankCodes('NG', process.env.FLW_SCRT_KEY as string, bankQuery);
    if (!bankNames || bankNames.length === 0)
      return config.send(senderId, 'No bank found. Try again or enter X to cancel.');

    let response = 'Please select your bank\n';
    bankNames.forEach((bank: any, i: number) => {
      if (i < alphabet.length) response += `\n ${alphabet[i]}. ${bank.name}`;
    });
    response += '\n\nEnter X to cancel';

    await config.send(senderId, response);
    await config.model.updateOne(
      { id: senderId },
      { $set: { nextAction: 'selectBank', 'withdrawalData.bankListing': bankNames } }
    );
  } catch (err) {
    await config.send(senderId, 'An error occurred. Enter 3 letters of your bank name:');
  }
};

const handleSelectBank = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);
  const selection = message.trim().toLowerCase();

  try {
    if (selection === 'x') return cancelTransaction(senderId, platform, false);
    const bank = user.withdrawalData.bankListing[alphaMapping[selection]];

    if (!bank) {
      await config.send(senderId, 'Invalid response. Please select from the list:');
      return; // You might want to re-display the list here
    }

    await config.send(
      senderId,
      `Enter ${bank.name} account number for withdrawal: \n\nEnter X to cancel.`
    );
    await config.model.updateOne(
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
    await config.send(senderId, 'An error occurred selecting bank.');
  }
};

const handleEnterAccountNumberForWithdrawal = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);
  const accNum = message.trim();

  try {
    if (accNum.toLowerCase() === 'x') return cancelTransaction(senderId, platform, false);

    const check = await validateBankAccount(accNum, user.withdrawalData.bank.code);
    if (!check.valid) {
      return config.send(
        senderId,
        `Invalid account number for ${user.withdrawalData.bank.name}. Try again:`
      );
    }

    const summary = `Account Name: ${check.data.account_name}\nAccount Number: ${check.data.account_number}\nBank: ${user.withdrawalData.bank.name}\nAmount: ₦${user.withdrawalData.amount}\n\nA. Make transfer\n\nEnter X to cancel.`;
    await config.send(senderId, `Confirm details:\n\n${summary}`);

    await config.model.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'confirmWithdrawal',
          'withdrawalData.accountNumber': accNum,
          'withdrawalData.accountName': check.data.account_name,
        },
      }
    );
  } catch (err) {
    await config.send(senderId, 'Error validating account. Please try again.');
  }
};

const handleConfirmWithdrawal = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);
  const input = message.trim().toLowerCase();

  try {
    if (input === 'x') return cancelTransaction(senderId, platform, false);
    if (input !== 'a')
      return config.send(senderId, 'Invalid response. Enter A to confirm or X to cancel.');

    // Note: FB used $dec while WA used $inc with negative. Standardized to $inc negative.
    const updatedAcc = await PaymentAccounts.findOneAndUpdate(
      { id: user.id },
      { $inc: { balance: -(user.withdrawalData.amount + 50) } },
      { new: true }
    );

    const initiated = await initiateUserAccountTransfer(
      user,
      platform,
      updatedAcc?.balance as number
    );

    if (!initiated) {
      await PaymentAccounts.updateOne(
        { id: user.id },
        { $inc: { balance: user.withdrawalData.amount + 50 } }
      );
      throw new Error('Transfer initiation failed');
    }

    await config.send(
      senderId,
      'Transfer successfully initiated. You will receive a notification shortly.'
    );
  } catch (err) {
    await config.send(senderId, 'An error occurred during transfer. Please try again.');
  }
};

export {
  withdrawFromAccountBalance,
  handleEnterWithdrawalAmount,
  handleEnterBankNameFirst3Alpha,
  handleSelectBank,
  handleEnterAccountNumberForWithdrawal,
  handleConfirmWithdrawal,
};
