import emailValidator from 'email-validator';
import FBBotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { createVAccount } from '../../modules/gateway';
import { DEFAULT_MESSAGE } from './send_message_generic';
import { BotUserType } from '../grand_slam_offer/daily_participation_reminder';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { sendMessage } from '../fb_bot/modules/send_message';
import PaymentAccounts from '../../models/payment-accounts';
import { confirmProductPurchaseResponse } from './utility_1';

// --- Platform Config Resolver ---
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  label: platform === 'FB' ? 'facebook' : 'whatsapp',
});

// --- Core Logic ---

/**
 * Prompt user to provide info if they don't have a virtual account
 */
const handleUserHasNoVirtualAcount = async (user: BotUserType, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);

  if (!user?.email) {
    await config.send(user.id, 'You do not have a permanent account number yet.');
    await config.send(
      user.id,
      'Kindly enter your email to create your permanent account number. \nEnter X to quit'
    );
    await config.model.updateOne({ id: user.id }, { $set: { nextAction: 'enterMailForAccount' } });
    return;
  }

  await config.send(user.id, 'You do not have a permanent account number yet.');
  await config.send(
    user.id,
    'Kindly enter your NIN to create a permanent account number. \n\nYour NIN is required in compliance with CBN regulation. \n\nEnter X to quit.'
  );
  await config.model.updateOne({ id: user.id }, { $set: { nextAction: 'enterBvn' } });
};

/**
 * Display account details or trigger creation flow
 */
const showAccountDetails = async (senderId: string, user: BotUserType, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);
  const account = await PaymentAccounts.findOne({ refrence: senderId });

  if (!account) {
    return handleUserHasNoVirtualAcount(user, platform);
  }

  await config.send(
    senderId,
    `Your dedicated virtual account details: \n\nBank Name: ${account.bankName} \nAccount Name: ${account.accountName} \nAccount Balance: ₦${account.balance}`
  );
  await config.send(senderId, 'Account Number: ');
  await config.send(senderId, account.accountNumber as string);
  await config.send(senderId, 'Fund your dedicated virtual account and enjoy smooth purchases.');
};

/**
 * Handles email entry specifically for account creation
 */
const enteredEmailForAccount = async (senderId: string, message: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);
  const email = message.trim();

  if (email.toLowerCase() === 'x') {
    await config.send(senderId, 'Creation of dedicated virtual account canceled.');
    await config.send(senderId, DEFAULT_MESSAGE);
    await config.model.updateOne({ id: senderId }, { $set: { nextAction: null } });
    return;
  }

  if (emailValidator.validate(email.toLowerCase())) {
    await config.model.updateOne(
      { id: senderId },
      { $set: { email: email, nextAction: 'enterBvn' } },
      { upsert: true }
    );

    await config.send(senderId, 'Please enter your NIN.');
    return config.send(
      senderId,
      'In accordance with CBN regulations, your NIN is required to create a virtual account. \n\nEnter X to cancel'
    );
  } else {
    await config.send(
      senderId,
      'The email you entered is invalid. \nPlease enter a valid email for the creation of dedicated virtual account. \n\nEnter X to cancel'
    );
  }
};

/**
 * Handles NIN (BVN) entry and triggers gateway creation
 */
const handleBvnEntered = async (senderId: string, message: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);
  const bvn = message.trim();
  const user = await config.model.findOne({ id: senderId }).select('purchasePayload email');

  // Cancel logic
  if (bvn.toLowerCase() === 'x') {
    if (user?.purchasePayload?.price) {
      const updatedUser = await config.model.findOneAndUpdate(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } },
        { new: true }
      );
      await config.send(senderId, 'Creation of permanent account number canceled.');
      // Direct call to unified response function
      return confirmProductPurchaseResponse(senderId, platform);
    }

    await config.send(senderId, 'Creation of dedicated virtual account canceled.');
    await config.send(senderId, DEFAULT_MESSAGE);
    await config.model.updateOne({ id: senderId }, { $set: { nextAction: null } });
    return;
  }

  // Validation and Gateway Call
  const parsedBvn = parseInt(bvn);
  const bvnStr = parsedBvn.toString();

  if (!isNaN(parsedBvn) && bvnStr.length === 11) {
    // Direct call to unified gateway function
    return createVAccount(user?.email, senderId, bvnStr, platform, 0);
  } else {
    await config.send(
      senderId,
      'The NIN you entered is invalid. \n\nPlease enter a valid NIN. \n\nEnter X to cancel.'
    );
  }
};

// --- Exports ---
export {
  handleUserHasNoVirtualAcount,
  showAccountDetails,
  enteredEmailForAccount,
  handleBvnEntered,
};
