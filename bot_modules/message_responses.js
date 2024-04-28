// message responses
const emailValidator = require('email-validator');
const sendMessage = require('./send_message.js');
const sendTemplate = require('./send_templates.js');
const { responseServices, responseServices2, responseServices3 } = require('./templates.js');
const {
  noTransactFound,
  validateNumber,
  validateAmount,
  confirmDataPurchaseResponse,
  helperConfirmPurchase,
} = require('./helper_functions.js');
const getUserName = require('./get_user_info.js');
const BotUsers = require('./../models/fb_bot_users.js');
const ReportedIssues = require('./../models/reported-issues.js');
const { cancelTransaction } = require('./postback_responses.js');
const { createVAccount } = require('./../modules/gateway.js');
const { generateRandomString } = require('./../modules/helper_functions.js');


// function to respond to unexpected message
async function defaultMessageHandler(event, message = false) {
  const senderId = event.sender.id;
  let text;
  const userName = await getUserName(senderId);

  if (message) {
    text = event.message.text.trim();
    if (text.toLowerCase() === 'q') {
      await cancelTransaction(senderId);
      return;
    };
  };

  await sendMessage(senderId, { text: `Hy ${userName || ''} what can i do for you` });
  await sendTemplate(senderId, responseServices);
  await sendTemplate(senderId, responseServices2);
  sendTemplate(senderId, responseServices3);
}; // end of defaultMessenger


// function to handle first email
async function sendEmailEnteredResponse(event) {
  const senderId = event.sender.id;
  const email = event.message.text.trim();

  if (email.toLowerCase() === 'q') return (event);
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


// function to respod to emal entred, this function also calls create virtual acount function
async function enteredEmailForAccount(event) {
  const senderId = event.sender.id;
  const email = event.message.text.trim();

  if (email.toLowerCase() === 'q') {
    await sendMessage(senderId, { text: 'Creatioin of dedicatd virtiual account cancled.' });
    await sendMessage(senderId, { text: 'what do you want to do next.' });
    await sendTemplates(senderId, responseServices);
    await sendTemplates(senderId, responseServices2);
    await sendTemplates(senderId, responseServices3);

    // updaet user colletion
    await BotUsers.updateOne(
      { id: senderId },
      { $set: { nextAction: null } }
    );

    return;
  };

  if (emailValidator.validate(email.toLowerCase())) {
    const saveEmail = await BotUsers.updateOne({ id: senderId },
      {
        $set: {
          email: email,
          nextAction: 'enterBvn'
        }
      },
      { upsert: true }
    );

    await sendMessage(senderId, { text: 'please enter your BVN.' });
    return sendMessage(senderId, { text: 'In accordeance with CBN regulations, your BVN is required to create a virtual account. \nEnter Q to  cancel' });
  } else {
    sendMessage(senderId, { text: "The email you entred is invalid. \nPlease enter a valid email for the creation of dedicated virtual account. \n\nEner Q to cancel" });
  };
}; // end of sendEmailEntere



// funtion to handle bvn entred
async function bvnEntred(event) {
  const senderId = event.sender.id;
  let bvn = event.message.text.trim();
  let parsedBvn;

  if (bvn.toLowerCase() === 'q') {
    await sendMessage(senderId, { text: 'Creatioin of dedicated virtiual account cancled.' });
    await sendMessage(senderId, { text: 'what do you want to do next.' });
    await sendTemplate(senderId, responseServices);
    await sendTemplate(senderId, responseServices2);
    await sendTemplate(senderId, responseServices3);

    // updaet user colletion
    await BotUsers.updateOne(
      { id: senderId },
      { $set: { nextAction: null } }
    );
    return;
  };

  parsedBvn = parseInt(bvn);
  bvn = parsedBvn.toString();

  // Check if the parsed number is an integer and has exactly 11 digits
  if (!isNaN(parsedBvn) && Number.isInteger(parsedBvn) && bvn.length === 11) {
    const user = await BotUsers.findOne({ id: senderId }).select('email');
    createVAccount(user.email, senderId, bvn, 'facebook');

    // upate user database
    await BotUsers.updateOne(
      { id: senderId },
      { $set: { nextAction: null } }
    );
  } else {
    await sendMessage(senderId, { text: 'The BVN  you entred is invalid. \n\nPlease enter a valid BVN. \n\nEnter Q to cancle.' })
  };
}; // end of bvnEntred



//==================================================
// airtime purchase response function

// function to handle airtime amount entred
async function sendAirtimeAmountReceived(event) {
  const senderId = event.sender.id;
  const amount = event.message.text.trim();
  const userData = await BotUsers.findOne({ id: senderId }).select('purchasePayload');

  if (amount.toLowerCase() === 'q') return cancelTransaction(senderId);
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

  if (phoneNumber.toLowerCase() === 'q') return cancelTransaction(senderId);
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
    await sendMessage(senderId, { 'text': 'Change phone number cancled' });
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
  const message = event.message.text.trim();
  const date = new Date();
  const id = generateRandomString(10);

  if (!message) {
    await sendMessage(senderId, {
      text: 'Sorry issue report can not be empty.'
    });
    return;
  };

  const issue = new ReportedIssues({
    id,
    description: message,
    date,
    reporterId: senderId,
    platformType: 'facebook',
    status: true,
  });

  await issue.save()
    .then(async (data) => {
      sendMessage(senderId, {
        text: 'Your issue have beign directed to BotSub support team. \nSorry for any inconveniences caused.',
      });

      await BotUsers.updateOne({ id: senderId }, {
        $set: {
          nextAction: null,
        }
      });
    })
    .catch((err) => {
      sendMessage(senderId, {
        text: 'Sorry somrthing went wrong. \nPlease enter issue again',
      });
    });
};  // end of report issue function


module.exports = {
  defaultMessageHandler,
  sendEmailEnteredResponse,
  sendAirtimeAmountReceived,
  sendPhoneNumberEnteredResponses,
  newEmailBeforeTransactResponse,
  newPhoneNumberBeforeTransactResponse,
  enteredEmailForAccount,
  bvnEntred,
  reportIssue,
};