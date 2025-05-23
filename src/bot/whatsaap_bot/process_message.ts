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
  cancelTransactionW,
  defaultMessageHandlerW,
  defaultTextW,
  handleChangeNumberBeforeTransactionW,
  handleNewEmailBeforeTransasctionEntredW,
} from './message-responses/generic';
import { handleEnterEmailToProcedWithPurchase } from './message-responses/generic-2';
import { handleSelectPaymentMethodW } from './message-responses/message-responses2';
import { enteredEmailForAccountW, handleBvnEntredW } from './message-responses/virtual-account';
import { handleReportIssueResponseW } from './message-responses/report-issue';
import { isDateGreaterThan10Minutes, updateLastMesageDateW } from './helper_functions';

async function processMessageW(messageObj: any) {
  const senderId = messageObj.from; // Sender's phone number
  const text = messageObj.text ? messageObj.text.body : ''; // Message text

  if (process.env.MAINTENANCE === 'true') {
    updateLastMesageDateW(senderId); // update user last message date
    return sendMessageW(
      senderId,
      ` 
      Our bot is temporarily undergoing maintenance to resolve a compliance-related issue (CAC). 
      Rest assured, your wallet balances and funds remain 100% secure. We will notify you as soon as services are fully restored. 
      Thank you for your patience—please don’t hesitate to contact us (https://wa.me/09166871328) if you have any questions in the meantime.`
    ); // emergency response incase of bug fixes
  }

  const user = await WhatsaapBotUsers.findOne({ id: senderId }).select(
    'purchasePayload lastMessage nextAction transactNum botResponse'
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
    updateLastMesageDateW(senderId); // update user last message date

    if (text.toLowerCase() !== 'activate') {
      return console.log('Bot Auto response if off for user: ', senderId);
    } else {
      await sendMessageW(
        senderId,
        'Bot auto-response has been reactivated. You will now receive automatic replies.'
      );
      await WhatsaapBotUsers.updateOne({ id: senderId }, { $set: { botResponse: true } });
    }
  }

  // check users last message if it is greater than 10 mins, reset user next action and send default text
  // @ts-ignore
  const lastMessage = new Date(user?.lastMessage);
  const isLastMessgeGreaterThan10mins = isDateGreaterThan10Minutes(lastMessage);

  // console.log('time diffe in whatapp bot:::::::::::: ', isLastMessgeGreaterThan10mins);
  if (isLastMessgeGreaterThan10mins) {
    cancelTransactionW(senderId, true);
    sendMessageW(senderId, defaultTextW);

    return updateLastMesageDateW(senderId); // update user last message date
  }

  const nextAction = user?.nextAction;
  updateLastMesageDateW(senderId); // update user last message date

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
