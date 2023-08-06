// message responses
import { default as fs } from 'node:fs';
const fsP = fs.promises;

import emailValidator from 'email-validator';

import sendMessage from './send_message.js';

import { sendNewConversationResponse } from './postback_responses.js';

import sendTemplate from './send_templates.js';

import { responseServices } from './templates.js';

import {
  noTransactFound,
  validateNumber,
  confirmDataPurchaseResponse,
  validateAmount,
} from './helper_functions.js';

import getUserName from './get_user_info.js';

import { createClient } from './../modules/mongodb.js';

// function to respond to unexpected message
export async function defaultMessageHandler(event) {
  const senderId = event.sender.id;
  const userName = await getUserName(senderId);

  await sendMessage(senderId, { text: `Hy ${userName || ''} what can i do for you` });
  sendTemplate(senderId, responseServices);
} // end of defaultMessenger

// function to handle first email
export async function sendEmailEnteredResponse(event) {
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
  }
} // end of sendEmailEnteredResponse

//==================================================
// airtime purchase response function

// function to handle airtime amount entred
export async function sendAirtimeAmountReceived(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  const amount = event.message.text.trim();

  if (await validateAmount(amount)) {
    await sendMessage(senderId, { text: 'Amount recieved' });
    await sendMessage(senderId, {
      text: 'Enter phone number for airtime purchase. \nEnter Q to cancel',
    });

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
  }
  await sendMessage(senderId, {
    text: 'Invalid amount entered \nPlease enter a valid amount. \nEnter Q to cancel',
  });
  client.close();
} // end of sendAirtimeAmountReceived

// function to handle phone number entred
export async function sendPhoneNumberEnteredResponses(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  const phoneNumber = event.message.text.trim();
  const validatedNum = validateNumber(phoneNumber);

  if (validatedNum) {
    await sendMessage(senderId, { text: 'phone  number recieved' });

    let nextAction = '';
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
  client.close();
} // end of sendPhoneNumberEnteredResponses

// function to handle change of email before transaction
export async function newEmailBeforeTransactResponse(event, transactionType) {
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
export async function newPhoneNumberBeforeTransactResponse(event, transactionType) {
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

export async function reportIssue(event) {
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
