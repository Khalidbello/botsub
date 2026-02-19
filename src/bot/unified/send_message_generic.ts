import emailValidator from 'email-validator';

import FBBotUsers from '../../models/fb_bot_users';
import { sendMessage } from '../fb_bot/modules/send_message';
import { handleBuyAirtime, handleEnterAirtimePhoneNumber } from './send_messages_airtime';
import { handleBuyData, handleEnterPhoneNumberForData } from './send_messages_data';
import { confirmProductPurchaseResponse, validateNumber } from './utility_1';
import { cancelTransaction } from './utility_2';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { createVAccount } from '../../modules/gateway';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { showAccountDetails } from './send_message_v_account';
import { claimFree3GB } from '../grand_slam_offer/unified/offer_claiming';
import { BotUserType } from '../grand_slam_offer/daily_participation_reminder';
import { showDataPrices } from './data_prices';
import { handleReportIssue } from './send_message_report_issue';
import { free3gbParticipationReminder } from '../grand_slam_offer/unified/daily_participation_reminder';
import { selectPaymentMethodPrompt } from './utility_4';
import { getNetworkAndLocalNumber } from './phone_number_checker';

// --- Constants ---

const DEFAULT_MESSAGE =
  'Hi what can i do for you today. \n\n A. Buy data \n B. Buy airtime. \n C. Claim Free 3GB \n D. My account. \n E. Show data prices' +
  '\n F. Report issue. \n\nContact BotSub Customer Support: https://wa.me/09166871328';

// --- Platform Config Resolver ---
const getPlatformConfig: any = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  label: platform === 'FB' ? 'facebook' : 'whatsapp',
});

// --- Core Handlers ---

/**
 * Main Menu / Default Handler
 */
const handleDefaultMessage = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);

  try {
    const text = message.trim().toLowerCase();

    if (text === 'x') return cancelTransaction(senderId, platform, true);

    if (text === 'a' || text === '1') return handleBuyData(senderId, platform);
    if (text === 'b' || text === '2') return handleBuyAirtime(senderId, platform);
    if (text === 'c' || text === '3') return claimFree3GB(senderId, user, platform);
    if (text === 'd' || text === '4') return showAccountDetails(senderId, user, platform);
    if (text === 'e' || text === '5') return showDataPrices(senderId, platform, user.transactNum);
    if (text === 'f' || text === '6') return handleReportIssue(senderId, platform);

    await free3gbParticipationReminder(user, platform);
    await config.send(senderId, DEFAULT_MESSAGE);
  } catch (err) {
    console.error('An error occured in handleDefaultMessage: ', err);
    await config.send(senderId, 'An error occurd.');
    await config.send(senderId, DEFAULT_MESSAGE);
  }
};

/**
 * Shared Email Handler (Used for first-time email and pre-transaction updates)
 */
const handleEmailEntered = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  edit = false
) => {
  const config = getPlatformConfig(platform);
  try {
    const email = message.trim();

    if (email.toLowerCase() === 'x') {
      if (edit) {
        await config.send(senderId, 'Change of email canceled.');
        return confirmProductPurchaseResponse(senderId, platform);
      }
      return cancelTransaction(senderId, platform, true);
    }

    if (emailValidator.validate(email)) {
      await config.model.updateOne(
        { id: senderId },
        {
          $set: {
            email,
            nextAction: 'confirmProductPurchase',
          },
        },
        { upsert: true }
      );
      await config.send(senderId, 'Email saved.');
      return confirmProductPurchaseResponse(senderId, platform);
    } else {
      await config.send(
        senderId,
        'The email format you entered is invalid. \n\nEnter a valid email: \n\nEnter X to cancel.'
      );
    }
  } catch (err) {
    console.error('An error occured in handleEmailEntered >>>>>>>>>>>>>>>>> ', err);
    await config.send(senderId, 'Something went wrong.');
    await config.send(senderId, 'Enter a valid email: \n\nEnter X to cancel.');
  }
};

/**
 * Shared change of phone number handler
 */
const handlePhoneNumberEntered = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);
  try {
    if (message.toLowerCase() === 'x') {
      await config.send(senderId, 'Change of phone number canceled.');

      return confirmProductPurchaseResponse(senderId, platform);
    }

    const numberResult = await getNetworkAndLocalNumber(message);

    if (numberResult.network === 'unknown') throw 'Phone number not valid';

    if (user?.purchasePayload.transactionType === 'data')
      return handleEnterPhoneNumberForData(
        senderId,
        numberResult.number,
        platform,
        user?.transactNum
      );
    if (user?.purchasePayload.transactionType === 'airtime')
      return handleEnterAirtimePhoneNumber(senderId, numberResult.number, platform);

    await config.send(senderId, 'Something went wrong.');
    cancelTransaction(senderId, platform, true);
  } catch (err) {
    console.error('An error occured in handlePhoneNumberEntered >>>>>>>>>>>>>>>. ', err);
    await config.send(senderId, 'Something went wrong.');
    await config.send(senderId, 'Enter a valid phone number. \n\nEnter X to cancel.');
  }
};

/**
 * Virtual Account / BVN Handler
 */
const handleBvnEntered = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);
  const bvn = message.trim();

  if (bvn.toLowerCase() === 'x') {
    await config.send(senderId, 'Virtual account creation canceled.');
    if (user.purchasePayload.product && user.purchasePayload.phoneNumber) {
      await config.send(senderId, selectPaymentMethodPrompt);
      return await config.model.updateOne(
        { id: senderId },
        { $set: { nextAction: 'selectAccount' } }
      );
    }
    return await config.send(senderId, DEFAULT_MESSAGE);
  }

  const parsedBvn = parseInt(bvn);
  if (!isNaN(parsedBvn) && bvn.length === 11) {
    const user = await config.model.findOne({ id: senderId }).select('email');
    await config.model.updateOne({ id: senderId }, { $set: { nextAction: null } });
    await createVAccount(user?.email, senderId, bvn, platform, 0);
  } else {
    await config.send(
      senderId,
      'The NIN/BVN entered is invalid. Please enter a valid NIN/BVN. \n\nEnter X to cancel.'
    );
  }
};

// --- Exports ---
export {
  DEFAULT_MESSAGE,
  handleDefaultMessage,
  handleEmailEntered,
  handlePhoneNumberEntered,
  handleBvnEntered,
  getPlatformConfig,
};
