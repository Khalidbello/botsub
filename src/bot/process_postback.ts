import { defaultMessageHandler } from "./message-responses/message_responses";
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
  showDataPrices
} from "./post-back-responses/postback_responses";
import { changeReferralBonusPhoneNumber, deliverReferralBonus, referralBonusOfferSelected, selectReferralOffers, showMyReferrals, showReferralCode } from "./post-back-responses/referral_postback_responses";
import { sendMessage } from "./modules/send_message";
import { Response } from "express";


const processPostback = async (event: any, res: Response): Promise<void> => {
  // first set nextAction to null
  if (process.env.botMaintenance === 'true') return sendMessage(event.sender.id, { text: 'Sorry network services are currenly down and would be restored by 10:30 PM' });

  if (event.postback.payload == 'newConversation') {
    return sendNewConversationResponse(event);
  };

  let payload = event.postback.payload;
  try {
    payload = JSON.parse(payload);
    console.log('postback payload', payload);
  } catch (err) {
    console.error(err, 'no payload');
  };

  const payloadTitle = payload.title;
  console.log('postback payload title', payloadTitle);

  switch (payloadTitle) {
    // case 'dataPurchase':
    //   sendPurchaseDataReponse(event);
    //   break;
    // case 'mtnOffers':
    //   sendMtnOffers(event);
    //   break;
    // case 'airtelOffers':
    //   sendAirtelOffers(event);
    //   break;
    // case 'gloOffers':
    //   sendGloOffers(event);
    //   break;
    // case '9mobileOffers':
    //   sendNineMobileOffers(event);
    //   break;
    // case 'airtimePurchase':
    //   sendPurchaseAirtimeResponse(event);
    //   break;
    // case 'enterAirtimeAmount':
    //   airtimePurchase(event, payload);
    //   break;
    // case 'makePurchase':
    //   selectPurchaseMethod(event);
    //   break;
    // case 'changeMailBeforeTransact':
    //   changeMailBeforeTransact(event);
    //   break;
    // case 'changePhoneNumber':
    //   changePhoneNumber(event);
    //   break;
    // case 'cancel':
    //   cancelTransaction(event.sender.id, true);
    //   break;
    // case 'issueReport':
    //   issueReport(event);
    //   break;
    // case 'dataPrices':
    //   showDataPrices(event);
    //   break;
    // case 'retryFailed':
    //   retryFailed(event, payload);
    //   break;
    // case 'failedMonthlyBonusRetry':
    //   //handleRetryFailedMonthlyDelivery(event, payload);
    //   break;
    // case 'myAccount':
    //   showAccountDetails(event);
    //   break;


    // // referral related
    // case 'referAFriend':
    //   showReferralCode(event);
    //   break;
    // case 'myReferrals':
    //   showMyReferrals(event, payload);
    //   break;
    // case 'claimReferralBonus':
    //   selectReferralOffers(event, payload);
    //   break;
    // case 'referralBonusOfferSelected':
    //   referralBonusOfferSelected(event, payload);
    //   break;
    // case 'deliverReferralBonus':
    //   deliverReferralBonus(event);
    //   break;
    // case 'changeReferralBonusPhoneNumber':
    //   changeReferralBonusPhoneNumber(event);
    //   break;
    default:
      defaultMessageHandler(event, false);
      break;
  }
} // end of processPostback


export { processPostback };