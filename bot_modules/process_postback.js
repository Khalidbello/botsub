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
  generateAccountNumber,
  changeMailBeforeTransact,
  changePhoneNumber,
  cancelTransaction,
  issueReport,
  showDataPrices,
  retryFailed,
  handleRetryFailedMonthlyDelivery,
} = require('./postback_responses.js');
const {
  selectReferralOffers,
  showReferralCode,
  showMyReferrals,
  remindReferree } = require('./postback_responses_2.js');
const { defaultMessageHandler } = require('./message_responses.js');

async function processPostback(event, res) {
  // first set nextAction to null
  if (process.env.botMaintenance === 'true') return sendMessage(event.sender.id, { text: 'Sorry BotSub is currently under maintenance' }); // emergency response incase of bug fixes

  if (event.postback.payload == 'newConversation') {
    return sendNewConversationResponse(event);
  };

  let payload = event.postback.payload;
  try {
    payload = JSON.parse(payload);
    console.log('postback payload', payload);
  } catch (err) { console.log('no payload') };

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
    case 'offerSelec':
      offerSelected(event, payload);
      break;
    case 'airtimePurchase':
      sendPurchaseAirtimeResponse(event);
      break;
    case 'enterAirtimeAmount':
      console.log('airtume amount');
      airtimePurchase(event, payload);
      break;
    case 'generateAccountNumber':
      generateAccountNumber(event);
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
    case 'referAFriend':
      showReferralCode(event);
      break;
    case 'myReferrals':
      showMyReferrals(event, payload);
      break;
    case 'remindReferree':
      remindReferree(event, payload);
      break;
    case 'selectReferralBonusOffer':
      selectReferralOffers(event);
      break;
    case 'referralBonusOfferSelected':
      referralBonusOfferSelected(event);
      break;
    case 'deliverReferralBons':
      deliverReferralBonus(event);
      break;
    default:
      defaultMessageHandler(event);
      break;
  }
} // end of processPostback

module.exports = processPostback;
