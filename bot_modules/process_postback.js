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
} = require('./postback_responses.js');

const sendMessage = require('./send_message.js');

//import {createClient} from "./../modules/mongodb.js";

async function processPostback(event, res) {
  // first set nextAction to null
  if (event.postback.payload == 'newConversation') {
    return sendNewConversationResponse(event);
  };
  //return sendMessage(event.sender.id, {"text": "sorry botsub is currently maintenance"});
  
  let payload = event.postback.payload;
  try {
    payload = JSON.parse(payload);
    console.log('postback payload', payload);
  } catch (err) {};

  const payloadTitle = payload.title;
  console.log('postback payload title', payloadTitle);

  switch (payloadTitle) {
    case 'newConversation':
      sendNewConversationResponse(event);
      break;
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
    case 'offerSelected':
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
    default:
      break;
  }
} // end of processPostback

module.exports = processPostback;
