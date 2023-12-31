// message responses
const emailValidator = require('email-validator');
const sendMessage = require('./send_message.js');
const sendTemplate = require('./send_templates.js');
const { responseServices, responseServices2 } = require('./templates.js');
const {
  noTransactFound,
  validateNumber,
  validateAmount,
  confirmDataPurchaseResponse,
  helperConfirmPurchase,
} = require('./helper_functions.js');
const getUserName = require('./get_user_info.js');
const BotUsers = require('../models/fb_bot_users.js');
const { cancelTransaction } = require('./postback_responses.js');


// function to respond to unexpected message
async function defaultMessageHandler(event) {
  const senderId = event.sender.id;
  const userName = null; //await getUserName(senderId);

  await sendMessage(senderId, { text: `Hy ${userName || ''} what can i do for you` });
  await sendTemplate(senderId, responseServices);
  sendTemplate(senderId, responseServices2);
}; // end of defaultMessenger


// function to handle first email
async function sendEmailEnteredResponse(event) {
  const senderId = event.sender.id;
  const email = event.message.text.trim();

  if (email.toLowerCase() === 'q') return cancelTransaction(event);
  if (emailValidator.validate(email)) {
    await sendMessage(senderId, { text: 'email saved \nYou can change email when ever you want' });
    const saveEmail = await BotUsers.updateOne({ id: senderId },
      {
        $set: {
          email: email,
          nextAction: null
        }
      },
      { upsert: true }
    );
    console.log('in save enail', saveEmail);
    await confirmDataPurchaseResponse(senderId);
  } else {
    const response = {
      text: 'the email format you entered is invalid \nPlease enter a valid email.',
    };
    await sendMessage(senderId, response);
  };
}; // end of sendEmailEnteredResponse



//==================================================
// airtime purchase response function

// function to handle airtime amount entred
async function sendAirtimeAmountReceived(event) {
  const senderId = event.sender.id;
  const amount = event.message.text.trim();
  const userData = await BotUsers.findOne({ id: senderId }).select('purchasePayload');

  if (amount.toLowerCase() === 'q') return cancelTransaction(event);
  if (await validateAmount(amount)) {
    await sendMessage(senderId, { text: 'Amount recieved' });
    await sendMessage(senderId, {
      text: ` Enter ${userData.purchasePayload.network} phone number for airtime purchase. \nEnter Q to cancel`,
    });

    await BotUsers.updateOne({ id: senderId }, {
      $set: {
        nextAction: 'phoneNumber',
        'purchasePayload.price': parseInt(amount),
        'purchasePayload.product': `₦${amount} Airtime`,
        'purchasePayload.transactionType': 'airtime',
      }
    });
    return null;
  };
  await sendMessage(senderId, {
    text: 'Invalid amount entered \nPlease enter a valid amount. \nEnter Q to cancel',
  });
}; // end of sendAirtimeAmountReceived


// function to handle phone number entred
async function sendPhoneNumberEnteredResponses(event) {
  const senderId = event.sender.id;
  const phoneNumber = event.message.text.trim();
  const validatedNum = validateNumber(phoneNumber);
  let user;

  if (phoneNumber.toLowerCase() === 'q') return cancelTransaction(event);
  if (validatedNum) {
    await sendMessage(senderId, { text: 'phone  number recieved' });
    user = await BotUsers.findOne({ id: senderId });
    if (user.email) {
      await BotUsers.updateOne({ id: senderId }, {
        $set: {
          nextAction: null,
          'purchasePayload.phoneNumber': validatedNum,
        }
      });
      await confirmDataPurchaseResponse(senderId);
      return;
    };

    await sendMessage(senderId, {
      text: 'Please enter your email. \nReciept would be sent to the provided email',
    });

    await BotUsers.updateOne({ id: senderId }, {
      $set: {
        nextAction: 'enterEmailFirst',
        'purchasePayload.phoneNumber': phoneNumber,
      }
    });
    return;
  };
  await sendMessage(senderId, {
    text: 'Phone number not valid. \nPlease enter a valid phone number. \nEnter Q to cancel.',
  });
}; // end of sendPhoneNumberEnteredResponses


// function to handle change of email before transaction
async function newEmailBeforeTransactResponse(event, transactionType) {
  const senderId = event.sender.id;
  const email = event.message.text.trim();

  if (email.toLowerCase() === 'q') {
    await sendMessage(senderId, { text: 'Change email cancled' });
    return await helperConfirmPurchase(transactionType, senderId);
  };
  
  if (emailValidator.validate(email)) {
    await BotUsers.updateOne({ id: senderId }, {
      $set: {
        nextAction: null,
        email: email,
      }
    });
    await sendMessage(senderId, { text: 'Email changed successfully.' });
    return helperConfirmPurchase(transactionType, senderId);
  } else {
    const response = {
      text: 'the email format you entered is invalid. \nPlease enter a valid email. \nEnter Q to cancel.',
    };
    await sendMessage(senderId, response);
  };
}; // end of newEmailBeforeTransactResponse




// function to handle change of phoneNumber
async function newPhoneNumberBeforeTransactResponse(event, transactionType) {
  const senderId = event.sender.id;
  const phoneNumber = event.message.text.trim();
  const validatedNum = validateNumber(phoneNumber);

  if (phoneNumber.toLowerCase() === 'q') {
    await sendMessage(senderId, { 'text': 'Change phone number cancled'});
    return await helperConfirmPurchase(transactionType, senderId);
  };

  if (validatedNum) {
    await BotUsers.updateOne({ id: senderId }, {
      $set: {
        nextAction: null,
        'purchasePayload.phoneNumber': validatedNum,
      }
    });
    await sendMessage(senderId, { text: 'Phone number changed successfully' });
    console.log('transactionType', transactionType);
    helperConfirmPurchase(transactionType, senderId);
  } else {
    const response = {
      text: 'The phone number you entered is invalid. \nPlease enter a valid phone number. \nEnter Q to cancel.',
    };
    await sendMessage(senderId, response);
  };
}; // end of newPhoneNumberBeforeTransactResponse


// function to handle issue reporting
async function reportIssue(event) {
  const senderId = event.sender.id;

  await sendMessage(senderId, {
    text: 'Your issue have beign directed to BotSub support team. \nSorry for any inconveniences caused.',
  });
  await BotUsers.updateOne({ id: senderId }, {
    $set: {
      nextAction: null,
    }
  });
};  // end of report issue function


module.exports = {
  defaultMessageHandler,
  sendEmailEnteredResponse,
  sendAirtimeAmountReceived,
  sendPhoneNumberEnteredResponses,
  newEmailBeforeTransactResponse,
  newPhoneNumberBeforeTransactResponse,
  reportIssue,
};
