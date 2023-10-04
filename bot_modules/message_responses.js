// message responses
const fsP = require('fs').promises;

const emailValidator = require('email-validator');

const sendMessage = require('./send_message.js');

const { sendNewConversationResponse } = require('./postback_responses.js');

const sendTemplate = require('./send_templates.js');

const { responseServices, responseServices2 } = require('./templates.js');

const {
  noTransactFound,
  validateNumber,
  confirmDataPurchaseResponse,
  validateAmount,
} = require('./helper_functions.js');

const getUserName = require('./get_user_info.js');

const createClient = require('./../modules/mongodb.js');

// function to respond to unexpected message
async function defaultMessageHandler(event) {
  const senderId = event.sender.id;
  const userName = null; //await getUserName(senderId);

  await sendMessage(senderId, { text: `Hy ${userName || ''} what can i do for you` });
  await sendTemplate(senderId, responseServices);
  sendTemplate(senderId, responseServices2);
} // end of defaultMessenger

// function to handle first email
async function sendEmailEnteredResponse(event) {
  const senderId = event.sender.id;
  const client = createClient();
  const email = event.message.text;

  if (emailValidator.validate(email)) {
    const response = {
      text: 'email saved \nYou can change email when ever you want',
    };
    await sendMessage(senderId, response);

    // updatimg database
    await client.connect();
    const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
    const filter = { id: senderId };
    const update = {
      $set: {
        email: email,
        nextAction: null,
      },
    };
    await collection.updateOne(filter, update);
    client.close();

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
  const client = createClient();
  const amount = event.message.text.trim();

  if (await validateAmount(amount)) {
    await sendMessage(senderId, { text: 'Amount recieved' });
    await sendMessage(senderId, {
      text: 'Enter phone number for airtime purchase. \nEnter Q to cancel',
    });

    await client.connect();
    const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
    const filter = { id: senderId };
    const update = {
      $set: {
        nextAction: 'phoneNumber',
        'purchasePayload.price': amount,
        'purchasePayload.product': `₦${amount} Airtime`,
      },
    };

    await collection.updateOne(filter, update);
    client.close();
    return null;
  };
  await sendMessage(senderId, {
    text: 'Invalid amount entered \nPlease enter a valid amount. \nEnter Q to cancel',
  });
}; // end of sendAirtimeAmountReceived




// function to handle phone number entred
async function sendPhoneNumberEnteredResponses(event) {
  const senderId = event.sender.id;
  const client = createClient();
  const phoneNumber = event.message.text.trim();
  const validatedNum = validateNumber(phoneNumber);

  if (validatedNum) {
    await sendMessage(senderId, { text: 'phone  number recieved' });
    await client.connect();

    const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
    const user = await collection.findOne({ id: senderId });
    const filter = { id: senderId };

    if (user.email) {
      const update = {
        $set: {
          nextAction: null,
          'purchasePayload.phoneNumber': phoneNumber,
        },
      };
      await collection.updateOne(filter, update);
      await confirmDataPurchaseResponse(senderId);
      return;
    }

    await sendMessage(senderId, {
      text: 'Please enter your email. \nReciept would be sent to the provided email',
    });

    const update = {
      $set: {
        nextAction: 'enterEmailFirst',
        'purchasePayload.phoneNumber': phoneNumber,
      },
    };
    await collection.updateOne(filter, update);
    return null;
  }
  await sendMessage(senderId, {
    text: 'Phone number not valid. \nPlease enter a valid phone number. \nEnter Q to cancel.',
  });
}; // end of sendPhoneNumberEnteredResponses

// function to handle change of email before transaction
async function newEmailBeforeTransactResponse(event, transactionType) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  const user = await collection.findOne({ id: senderId });

  if (!user.purchasePayload) return noTransactFound(senderId);

  const email = event.message.text.trim();

  if (emailValidator.validate(email)) {
    // updating database
    const filter = { id: senderId };
    const update = {
      $set: {
        nextAction: null,
        email: email,
      },
    };

    await collection.updateOne(filter, update);

    await sendMessage(senderId, { text: 'Email changed successfully.' });
    // peform next action dependent on trasactionType
    if (transactionType === 'data') {
      await confirmDataPurchaseResponse(senderId);
    } else if (transactionType === 'airtime') {
      confirmDataPurchaseResponse(senderId);
    }
  } else {
    const response = {
      text: 'the email format you entered is invalid. \nPlease enter a valid email. \nEnter Q to cancel.',
    };
    await sendMessage(senderId, response);
  }
  client.close();
} // end of newEmailBeforeTransactResponse

// function to handle change of phoneNumber
async function newPhoneNumberBeforeTransactResponse(event, transactionType) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  const user = await collection.findOne({ id: senderId });

  if (!user.purchasePayload) return noTransactFound(senderId);

  const phoneNumber = event.message.text.trim();

  if (validateNumber(phoneNumber)) {
    // updating database
    const filter = { id: senderId };
    const update = {
      $set: {
        nextAction: null,
        'purchasePayload.phoneNumber': phoneNumber,
      },
    };

    await collection.updateOne(filter, update);

    await sendMessage(senderId, { text: 'Phone number changed successfully' });
    console.log('transactionType', transactionType);
    // peform next action dependent on trasactionType
    if (transactionType === 'data') {
      await confirmDataPurchaseResponse(senderId);
    } else if (transactionType === 'airtime') {
      confirmDataPurchaseResponse(senderId);
    }
  } else {
    const response = {
      text: 'The phone number you entered is invalid. \nPlease enter a valid phone number. \nEnter Q to cancel.',
    };
    await sendMessage(senderId, response);
  }
} // end of newPhoneNumberBeforeTransactResponse

async function reportIssue(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);

  await sendMessage(senderId, {
    text: 'Your issue have beign directed to BotSub support team. \nSorry for any inconveniences caused.',
  });

  const filter = { id: senderId };
  const update = {
    $set: {
      nextAction: null,
    },
  };

  await collection.updateOne(filter, update);
}

module.exports = {
  defaultMessageHandler,
  sendEmailEnteredResponse,
  sendAirtimeAmountReceived,
  sendPhoneNumberEnteredResponses,
  newEmailBeforeTransactResponse,
  newPhoneNumberBeforeTransactResponse,
  reportIssue,
};
