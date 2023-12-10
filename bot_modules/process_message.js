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
  reportIssue,
} = require('./message_responses.js');
const { ObjectId } = require('mongodb');
const BotUsers = require('./../models/bot_users.js');


async function processMessage(event, res) {
  // check user previousky stored action to determine
  // how to respond to user messages
  if (process.env.botMaintenance === 'true') return sendMessage(event.sender.id, { text: 'Sorry BotSub is currently under maintenance' }); // emergency response incase of bug fixes

  const senderId = event.sender.id;
  const user = await BotUsers.findOne({  'id': senderId })
  console.log('user mongo db payload process message', user);

  if (!user) {
    return sendNewConversationResponse(event);
  };

  // check if its a cancel request
  if (event.message.text.toLowerCase() === 'q') return cancelTransaction(event);

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
    case 'enterIssue':
      reportIssue(event);
      break;
    default:
      defaultMessageHandler(event);
  };
}; // end of process message switch

module.exports = processMessage;
