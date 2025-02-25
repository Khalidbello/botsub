import { Response } from 'express';
import * as fs from 'fs';
import { sendMessage } from '../modules/send_message';
import BotUsers from '../../models/fb_bot_users';

import { sendNewConversationResponse } from './post-back-responses/postback_responses';
import {
  handleDataNetWorkSelected,
  handleOfferSelected,
  handlePhoneNumberEntred,
} from './message-responses/data';
import {
  handleAirtimeNetworkSelected,
  handleEnterAirtimeAmount,
} from './message-responses/airtime';
import { handleConfirmProductPurchase } from './message-responses/data-2';
import {
  cancelTransaction,
  defaultMessageHandler,
  defaultText,
  handleChangeNumberBeforeTransaction,
  handleNewEmailBeforeTransasctionEntred,
} from './message-responses/generic';
import { handleEnterEmailToProcedWithPurchase } from './message-responses/generic-2';
import { handleSelectPaymentMethod } from './message-responses/message-responses2';
import { enteredEmailForAccount, handleBvnEntred } from './message-responses/virtual-account';
import { handleReportIssueResponse } from './message-responses/report-issue';
import { updateLastMesageDate } from '../modules/helper_function_2';
import { isDateGreaterThan10Minutes } from '../whatsaap_bot/helper_functions';

async function processMessage(event: any, res: Response) {
  // check user previousky stored action to determine how to respond to user messages
  const senderId = event?.sender?.id;

  if (process.env.MAINTENANCE === 'true') {
    updateLastMesageDate(senderId); // update user last messgae

    return sendMessage(event.sender.id, {
      text: 'BotSub is currently under maintenance. \nCheck back later.',
    }); // emergency response incase of bug fixes
  }

  const user = await BotUsers.findOne({ id: senderId }).select(
    '_id lastMessage purchasePayload nextAction transactNum botResponse'
  );

  console.log('user mongo db payload process message', senderId, user);

  if (!user) return sendNewConversationResponse(event);

  let transactionType;

  try {
    transactionType = user?.purchasePayload?.transactionType;
  } catch (err) {
    console.error('no transactionType in process message');
  }

  // check if bot auto response is active and activate if command deems
  if (user?.botResponse === false) {
    updateLastMesageDate(event.sender.id); // update user last messgae

    const senderId = event.sender.id;
    const message: string = event.message.text.trim().toLowerCase();

    if (message.toLowerCase() !== 'activate') {
      return console.log('Bot Auto response if off for user: ', senderId);
    } else {
      await sendMessage(senderId, {
        text: 'Bot auto-response has been reactivated. You will now receive automatic replies.',
      });
      await BotUsers.updateOne({ id: senderId }, { $set: { botResponse: true } });
    }
  }

  // check users last message if it is greater than 10 mins, reset user next action and send default text
  // @ts-ignore
  const lastMessage = new Date(user?.lastMessage);
  const isLastMessgeGreaterThan10mins = isDateGreaterThan10Minutes(lastMessage);

  if (isLastMessgeGreaterThan10mins) {
    cancelTransaction(senderId, true);
    sendMessage(senderId, { text: defaultText });

    return updateLastMesageDate(event.sender.id); // update user last messgae
  }

  const nextAction = user?.nextAction;

  // fuctionalities for data purchase
  if (nextAction === 'selectDataNetwork')
    return handleDataNetWorkSelected(event, user?.transactNum || 0);
  if (nextAction === 'selectDataOffer') return handleOfferSelected(event, user?.transactNum || 0);

  // controls for buy airtime
  if (nextAction === 'selectAritimeNetwork') return handleAirtimeNetworkSelected(event);
  if (nextAction === 'enterAirtimeAmount') return handleEnterAirtimeAmount(event);

  // generic fuctionalites
  if (nextAction === 'enterPhoneNumber') return handlePhoneNumberEntred(event);
  if (nextAction === 'confirmProductPurchase')
    return handleConfirmProductPurchase(event, user?.transactNum || 0);
  if (nextAction === 'changePhoneNumberBeforeTransact')
    return handleChangeNumberBeforeTransaction(event);
  if (nextAction === 'changeEmailBeforeTransact')
    return handleNewEmailBeforeTransasctionEntred(event);
  if (nextAction === 'enterEmailToProceedWithPurchase')
    return handleEnterEmailToProcedWithPurchase(event);

  if (nextAction === 'selectAccount') return handleSelectPaymentMethod(event, user?.transactNum);
  // handlers related to virtual account
  if (nextAction === 'enterMailForAccount') return enteredEmailForAccount(event);
  if (nextAction === 'enterBvn') return handleBvnEntred(event);

  // controls related to issue report
  if (nextAction === 'enterIssue') return handleReportIssueResponse(event);

  // rferral related switch
  // if (nextAction === 'referralCode') return sendReferralCodeRecieved(event);
  // if (nextAction === 'referralBonusPhoneNumber') return referralBonusPhoneNumberRecieved(event);
  // if (nextAction === 'changeReferralBonusPhoneNumber') return changeReferralBonusPhoneNumber(event);

  // default message handler
  defaultMessageHandler(event, true, user?.transactNum || 4);
} // end of process message switch

export default processMessage;
