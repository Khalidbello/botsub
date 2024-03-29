const fsP = require('fs').promises;
const sendMessage = require('./send_message.js');
const { responseServices } = require('./templates.js');
const sendTemplate = require('./send_templates.js');
const { sendNewConversationResponse, cancelTransaction } = require('./postback_responses.js');
const {
  sendEmailEnteredResponse,
  sendPhoneNumberEnteredResponses,
  newEmailBeforeTransactResponse,
  newPhoneNumberBeforeTransactResponse,
  sendAirtimeAmountReceived,
  defaultMessageHandler,
  enteredEmailForAccount,
  bvnEntred,
  reportIssue,
} = require('./message_responses.js');
const {
  sendReferralCodeRecieved,
  referralBonusPhoneNumberRecieved,
  changeReferralBonusPhoneNumber,
} = require('./referral_message_responses.js');
const BotUsers = require('../models/fb_bot_users.js');
const { trusted } = require('mongoose');


async function processMessage(event, res) {
  // check user previousky stored action to determine
  // how to respond to user messages
  if (process.env.botMaintenance === 'true') return sendMessage(event.sender.id, { text: 'Sorry network services are currenly down and would be restored by 10:30 PM' }); // emergency response incase of bug fixes

  const senderId = event.sender.id;
  const user = await BotUsers.findOne({ 'id': senderId }).select('_id purchasePayload nextAction');
  console.log('user mongo db payload process message', user);

  if (!user) {
    return sendNewConversationResponse(event);
  };

  //const user = await usersAction.get(senderId);
  let transactionType;
  try {
    transactionType = user.purchasePayload.transactionType;
  } catch (err) {
    console.log('no transactionType');
  };

  switch (user.nextAction) {
    case 'enterEmailFirst':
      sendEmailEnteredResponse(event);
      break;
    case 'phoneNumber':
      sendPhoneNumberEnteredResponses(event);
      break;
    case 'enterAirtimeAmount':
      sendAirtimeAmountReceived(event, transactionType);
      break;
    case 'changeEmailBeforeTransact':
      newEmailBeforeTransactResponse(event, transactionType);
      break;
    case 'changePhoneNumberBeforeTransact':
      newPhoneNumberBeforeTransactResponse(event, transactionType);
      break;
    case 'enterMailForAccount':
      enteredEmailForAccount(event);
      break;
    case 'enterBvn':
      bvnEntred(event);
      break;
    case 'enterIssue':
      reportIssue(event);
      break;
    

    // rferral related switch
    case 'referralCode':
      sendReferralCodeRecieved(event);
      break;
    case 'referralBonusPhoneNumber':
      referralBonusPhoneNumberRecieved(event);
      break;
    case 'changeReferralBonusPhoneNumber':
      changeReferralBonusPhoneNumber(event);
      break;
    default:
      defaultMessageHandler(event, true);
  };
}; // end of process message switch

module.exports = processMessage;