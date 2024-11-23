import {
  airtimePurchase,
  cancelTransaction,
  changeMailBeforeTransact,
  changePhoneNumber,
  //handleRetryFailedMonthlyDelivery,
  issueReport,
  retryFailed,
  selectPurchaseMethod,
  sendAirtelOffers,
  sendGloOffers,
  sendMtnOffers,
  sendNewConversationResponse,
  sendNineMobileOffers,
  sendPurchaseAirtimeResponse,
  sendPurchaseDataReponse,
  showAccountDetails,
  showDataPrices,
} from './post-back-responses/postback_responses';
import { defaultMessageHandler } from './message-responses/generic';
import { sendMessage } from './modules/send_message';
import { Response } from 'express';

const processPostback = async (event: any, res: Response): Promise<void> => {
  // first set nextAction to null
  if (process.env.botMaintenance === 'true')
    return sendMessage(event.sender.id, {
      text: 'Sorry network services are currenly down and would be restored by 10:30 PM',
    });

  if (event.postback.payload == 'newConversation') {
    return sendNewConversationResponse(event);
  }

  let payload = event.postback.payload;
  try {
    payload = JSON.parse(payload);
    console.log('postback payload', payload);
  } catch (err) {
    console.error(err, 'no payload');
  }

  const payloadTitle = payload.title;
  console.log('postback payload title', payloadTitle);
  return defaultMessageHandler(event, true, 0);
}; // end of processPostback

export { processPostback };
