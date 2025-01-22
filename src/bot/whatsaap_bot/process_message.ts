import { Response } from 'express';
import * as fs from 'fs';
import sendMessageW from './send_message_w';
import WhatsaapBotUsers from '../../models/whatsaap_bot_users';

import { sendNewConversationResponseW } from './post-back-responses/postback_responses';
import {
  handleDataNetWorkSelectedW,
  handleOfferSelectedW,
  handlePhoneNumberEntredW,
} from './message-responses/data';
import {
  handleAirtimeNetworkSelectedW,
  handleEnterAirtimeAmountW,
} from './message-responses/airtime';
import { handleConfirmProductPurchaseW } from './message-responses/data-2';
import {
  defaultMessageHandlerW,
  handleChangeNumberBeforeTransactionW,
  handleNewEmailBeforeTransasctionEntredW,
} from './message-responses/generic';
import { handleEnterEmailToProcedWithPurchase } from './message-responses/generic-2';
import { handleSelectPaymentMethodW } from './message-responses/message-responses2';
import { enteredEmailForAccountW, handleBvnEntredW } from './message-responses/virtual-account';
import { handleReportIssueResponseW } from './message-responses/report-issue';

async function processMessageW(messageObj: any) {
  const senderId = messageObj.from; // Sender's phone number
  const text = messageObj.text ? messageObj.text.body : ''; // Message text

  if (process.env.MAINTENANCE === 'true')
    return sendMessageW(senderId, 'BotSub is currently under maintenance. \nCheck back later.'); // emergency response incase of bug fixes

  const user = await WhatsaapBotUsers.findOne({ id: senderId }).select(
    'purchasePayload nextAction transactNum botResponse'
  );
  console.log('user mongo db payload process message in whatsaap bot:   ', senderId, user, text);

  if (!user) return sendNewConversationResponseW(messageObj);

  let transactionType;
  try {
    transactionType = user?.purchasePayload?.transactionType;
  } catch (err) {
    console.error('no transactionType in process message');
  }

  // check if bot auto response is active and activate if command deems
  if (user?.botResponse === false) {
    const senderId = messageObj.sender.id;
    const message: string = messageObj.message.text.trim().toLowerCase();

    if (message !== 'activate') {
      return console.log('Bot Auto response if off for user: ', senderId);
    } else {
      await sendMessageW(
        senderId,
        'Bot auto-response has been reactivated. You will now receive automatic replies.'
      );
      await WhatsaapBotUsers.updateOne({ id: senderId }, { $set: { botResponse: true } });
    }
  }

  const nextAction = user?.nextAction;

  // fuctionalities for data purchase
  if (nextAction === 'selectDataNetwork')
    return handleDataNetWorkSelectedW(messageObj, user?.transactNum || 0);
  if (nextAction === 'selectDataOffer')
    return handleOfferSelectedW(messageObj, user?.transactNum || 0);

  // controls for buy airtime
  if (nextAction === 'selectAritimeNetwork') return handleAirtimeNetworkSelectedW(messageObj);
  if (nextAction === 'enterAirtimeAmount') return handleEnterAirtimeAmountW(messageObj);

  // generic fuctionalites
  if (nextAction === 'enterPhoneNumber') return handlePhoneNumberEntredW(messageObj);
  if (nextAction === 'confirmProductPurchase')
    return handleConfirmProductPurchaseW(messageObj, user?.transactNum || 0);
  if (nextAction === 'changePhoneNumberBeforeTransact')
    return handleChangeNumberBeforeTransactionW(messageObj);
  if (nextAction === 'changeEmailBeforeTransact')
    return handleNewEmailBeforeTransasctionEntredW(messageObj);
  if (nextAction === 'enterEmailToProceedWithPurchase')
    return handleEnterEmailToProcedWithPurchase(messageObj);

  if (nextAction === 'selectAccount')
    return handleSelectPaymentMethodW(messageObj, user?.transactNum);
  // handlers related to virtual account
  if (nextAction === 'enterMailForAccount') return enteredEmailForAccountW(messageObj);
  if (nextAction === 'enterBvn') return handleBvnEntredW(messageObj);

  // controls related to issue report
  if (nextAction === 'enterIssue') return handleReportIssueResponseW(messageObj);

  // rferral related switch
  // if (nextAction === 'referralCode') return sendReferralCodeRecieved(messageObj);
  // if (nextAction === 'referralBonusPhoneNumber') return referralBonusPhoneNumberRecieved(messageObj);
  // if (nextAction === 'changeReferralBonusPhoneNumber') return changeReferralBonusPhoneNumber(messageObj);

  // default message handler
  defaultMessageHandlerW(messageObj, true, user?.transactNum || 4);
} // end of process message switch

export default processMessageW;
