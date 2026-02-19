import { Response } from 'express';
import BotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';

// Messaging Modules
import { sendMessage as sendMessageFB } from '../fb_bot/modules/send_message';

// Unified Handlers
import { free3gbParticipationReminder } from '../grand_slam_offer/unified/daily_participation_reminder';
import {
  deliverFree3GB,
  phoneNumberToClaimFree3GBEntered,
  selectFree3GBClaimNetworkSelected,
} from '../grand_slam_offer/unified/offer_claiming';
import { cancelTransaction, isDateGreaterThan10Minutes, updateLastMesageDate } from './utility_2';
import {
  DEFAULT_MESSAGE,
  handleBvnEntered,
  handleDefaultMessage,
  handleEmailEntered,
  handlePhoneNumberEntered,
} from './send_message_generic';
import {
  handleConfirmWithdrawal,
  handleEnterAccountNumberForWithdrawal,
  handleEnterBankNameFirst3Alpha,
  handleEnterWithdrawalAmount,
  handleSelectBank,
} from './send_message_withdrawal';
import { handleReportIssueResponse } from './send_message_report_issue';
import { enteredEmailForAccount } from './send_message_v_account';
import {
  handleDataNetWorkSelected,
  handleEnterPhoneNumberForData,
  handleOfferSelected,
} from './send_messages_data';
import {
  handleAirtimeNetworkSelected,
  handleEnterAirtimeAmount,
  handleEnterAirtimePhoneNumber,
} from './send_messages_airtime';
import { sendNewConversationResponse } from './send_new_user_message';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { handleConfirmProductPurchase, handleSelectPaymentMethod } from './send_message_generic_2';

/**
 * Platform Configuration Resolver
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? BotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessageFB(id, { text }) : sendMessageW(id, text),
  isFB: platform === 'FB',
});

async function processMessage(platform: 'FB' | 'WA', event: any, res: Response) {
  const config = getPlatformConfig(platform);
  // 1. Extract Platform-Specific Sender and Message
  const senderId = config.isFB ? event?.sender?.id : event?.from;

  try {
    const message: string = (config.isFB ? event.message?.text : event?.text?.body)
      ?.trim()
      .toLowerCase();

    // 2. Fetch User from appropriate Collection
    const user: any = await config.model.findOne({ id: senderId });

    console.log('User in processs message >>>>>>>>>>>> ', platform, user);
    if (!user) return sendNewConversationResponse(senderId, platform);

    // 3. Bot Response Toggle Logic
    if (user?.botResponse === false) {
      updateLastMesageDate(senderId, platform);

      if (message !== 'activate') {
        return console.log(`Bot Auto response is off for ${platform} user: `, senderId);
      } else {
        await config.send(
          senderId,
          'Bot auto-response has been reactivated. You will now receive automatic replies.'
        );
        await config.model.updateOne({ id: senderId }, { $set: { botResponse: true } });
      }
    }

    // 4. Session Timeout Logic (10 Mins)
    const lastMessage = new Date(user?.lastMessage);
    if (isDateGreaterThan10Minutes(lastMessage)) {
      await free3gbParticipationReminder(user, platform);
      await config.send(senderId, DEFAULT_MESSAGE);
      await cancelTransaction(senderId, platform, false);
      return updateLastMesageDate(senderId, platform);
    }

    updateLastMesageDate(senderId, platform);

    // 5. Maintenance Mode
    if (process.env.MAINTENANCE === 'true') {
      return config.send(
        senderId,
        `BotSub is temporarily undergoing maintenance to resolve a compliance-related issue (CAC). \n\nRest assured, your funds remain secure.`
      );
    }

    const nextAction = user?.nextAction;
    const transactNum = user?.transactNum || 0;

    //console.log('user data in process message: ', user);
    /**
     * 6. ROUTING LOGIC
     * All parameters passed to functions remain exactly as defined in your original code.
     */

    // Data Purchase
    // if (nextAction === 'selectDataNetwork')
    //   return handleDataNetWorkSelected(senderId, message, platform, transactNum);

    // phone number for data purchase
    if (nextAction === 'enterDataPhoneNumber')
      return handleEnterPhoneNumberForData(senderId, message, platform, transactNum);
    if (nextAction === 'selectDataOffer')
      return handleOfferSelected(senderId, message, platform, transactNum, user);

    // Airtime
    // if (nextAction === 'selectAritimeNetwork')
    //   return handleAirtimeNetworkSelected(senderId, message, platform);

    if (nextAction === 'enterAirtimePhoneNumber')
      return handleEnterAirtimePhoneNumber(senderId, message, platform);

    if (nextAction === 'enterAirtimeAmount')
      return handleEnterAirtimeAmount(senderId, message, platform, user);

    // Generic Flows
    // if (nextAction === 'enterPhoneNumber')
    //   return handlePhoneNumberEntered(senderId, message, platform);

    if (nextAction === 'confirmProductPurchase')
      return handleConfirmProductPurchase(senderId, message, platform, transactNum);
    if (nextAction === 'changePhoneNumberBeforeTransact')
      return handlePhoneNumberEntered(senderId, message, platform, user);
    if (nextAction === 'changeEmailBeforeTransact')
      return handleEmailEntered(senderId, message, platform, true);
    if (nextAction === 'enterEmailFirst') return handleEmailEntered(senderId, message, platform);

    // Payments & Accounts
    if (nextAction === 'selectAccount')
      return handleSelectPaymentMethod(senderId, message, platform, transactNum);
    if (nextAction === 'enterMailForAccount')
      return enteredEmailForAccount(senderId, message, platform);
    if (nextAction === 'enterBvn') return handleBvnEntered(senderId, message, platform, user);

    // Support
    if (nextAction === 'enterIssue') return handleReportIssueResponse(senderId, message, platform);

    // Grand Slam Offer
    if (nextAction === 'selectFree3GBClaimNetwork')
      return selectFree3GBClaimNetworkSelected(event, user, platform);
    if (nextAction === 'enterPhoneNumberToClaimFree3GB')
      return phoneNumberToClaimFree3GBEntered(event, user, platform);
    if (nextAction === 'deliverFree3GB') return deliverFree3GB(event, user, platform);

    // Withdrawals
    if (nextAction === 'enterWithdrawalAmount')
      return handleEnterWithdrawalAmount(senderId, message, platform);
    if (nextAction === 'enterBankNameFirst3Alpha')
      return handleEnterBankNameFirst3Alpha(senderId, message, platform);
    if (nextAction === 'selectBank') return handleSelectBank(senderId, message, platform, user);
    if (nextAction === 'enterWithdrawalAccount')
      return handleEnterAccountNumberForWithdrawal(senderId, message, platform, user);
    if (nextAction === 'confirmWithdrawal')
      return handleConfirmWithdrawal(senderId, message, platform, user);

    // Default Fallback
    handleDefaultMessage(senderId, message, platform, user);
  } catch (err) {
    console.error('An error occured in process message ' + platform, ' >>>>>>>>>> ', err);
    await config.send(senderId, 'An error occured');
    await config.send(senderId, DEFAULT_MESSAGE);
  }
}

export default processMessage;
