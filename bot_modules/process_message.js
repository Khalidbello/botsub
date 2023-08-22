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

const createClient = require('./../modules/mongodb.js');

async function processMessage(event, res) {
  // check user previousky stored action to determine
  // how to respond to user messages
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  //await collection.drop();

  const user = await collection.findOne({ id: senderId });
  console.log('user mongo db payload process message', user);

  if (!user) {
    client.close();
    return sendNewConversationResponse(event);
  }

  // check if its a cancel request
  if (event.message.text.toLowerCase() === 'q') return cancelTransaction(event);

  //const user = await usersAction.get(senderId);
  let transactionType;
  try {
    transactionType = user.purchasePayload.transactionType;
  } catch (err) {
    console.log('no transactionType');
  }

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
    /*await sendMessage(senderId, { text: "Hy what can i do for you" })
      sendTemplate(senderId, responseServices);*/
  }
} // end

module.exports = processMessage;
