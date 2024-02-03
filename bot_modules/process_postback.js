const {
  sendNewConversationResponse,
  sendPurchaseDataReponse,
  sendMtnOffers,
  sendAirtelOffers,
  sendNineMobileOffers,
  sendGloOffers,
  offerSelected,
  sendPurchaseAirtimeResponse,
  airtimePurchase,
  changeMailBeforeTransact,
  changePhoneNumber,
  cancelTransaction,
  issueReport,
  showDataPrices,
  retryFailed,
  handleRetryFailedMonthlyDelivery,
  selectPurchaseMethod,
  showAccountDetails,
} = require('./postback_responses.js');
const {
  selectReferralOffers,
  showReferralCode,
  showMyReferrals,
  referralBonusOfferSelected,
  changeReferralBonusPhoneNumber,
  deliverReferralBonus,
} = require('./referral_postback_responses.js');
const { defaultMessageHandler } = require('./message_responses.js');

async function processPostback(event, res) {
  // first set nextAction to null
  if (process.env.botMaintenance === 'true') return sendMessage(event.sender.id, { text: 'Sorry network services are currenly down and would be restored by 10:30 PM' });

  if (event.postback.payload == 'newConversation') {
    return sendNewConversationResponse(event);
  };

  let payload = event.postback.payload;
  try {
    payload = JSON.parse(payload);
    console.log('postback payload', payload);
  } catch (err) { console.log(err, 'no payload') };

  const payloadTitle = payload.title;
  console.log('postback payload title', payloadTitle);

  switch (payloadTitle) {
    case 'dataPurchase':
      sendPurchaseDataReponse(event);
      break;
    case 'mtnOffers':
      sendMtnOffers(event);
      break;
    case 'airtelOffers':
      sendAirtelOffers(event);
      break;
    case 'gloOffers':
      sendGloOffers(event);
      break;
    case '9mobileOffers':
      sendNineMobileOffers(event);
      break;
    case 'offerSelectedd':
      offerSelected(event, payload);
      break;
    case 'airtimePurchase':
      sendPurchaseAirtimeResponse(event);
      break;
    case 'enterAirtimeAmount':
      console.log('airtume amount');
      airtimePurchase(event, payload);
      break;
    case 'makePurchase':
      selectPurchaseMethod(event);
      break;
    case 'changeMailBeforeTransact':
      changeMailBeforeTransact(event);
      break;
    case 'changePhoneNumber':
      changePhoneNumber(event);
      break;
    case 'cancel':
      cancelTransaction(event);
      break;
    case 'issueReport':
      issueReport(event);
      break;
    case 'dataPrices':
      showDataPrices(event);
      break;
    case 'retryFailed':
      retryFailed(event, payload);
      break;
    case 'failedMonthlyBonusRetry':
      handleRetryFailedMonthlyDelivery(event, payload);
      break;
      case 'myAccount':
        showAccountDetails(event);
        break;


    // referral related
    case 'referAFriend':
      showReferralCode(event);
      break;s
    case 'myReferrals':
      showMyReferrals(event, payload);
      break;
    case 'claimReferralBonus':
      selectReferralOffers(event, payload);
      break;
    case 'referralBonusOfferSelected':
      referralBonusOfferSelected(event, payload);
      break;
    case 'deliverReferralBonus':
      deliverReferralBonus(event);
      break;
    case 'changeReferralBonusPhoneNumber':
      changeReferralBonusPhoneNumber(event);
      break;
    default:
      defaultMessageHandler(event);
      break;
  }
} // end of processPostback

module.exports = processPostback;