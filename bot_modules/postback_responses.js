import sendMessage from './send_message.js';

import sendTemplate from './send_templates.js';

import axios from 'axios';

import getUserName from './get_user_info.js';

import { dateFormatter, noTransactFound } from './helper_functions.js';

import {
  responseServices,
  dataNetworks1,
  dataNetworks2,
  generateFacebookPosts,
  airtimeNetworks1,
  airtimeNetworks2,
} from './templates.js';

import { createClient } from './../modules/mongodb.js';

// function to response to newConversations
export async function sendNewConversationResponse(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  const userName = await getUserName(senderId);
  let response = {
    text: `Hy ${userName ? userName : ''} i am BotSub virtual assitance.`,
  };
  await sendMessage(senderId, response);

  response = {
    text: `What can i do for you today`,
  };
  await sendMessage(senderId, response);

  sendTemplate(senderId, responseServices);

  // adding one
  await collection.replaceOne({ id: senderId }, { id: senderId });
  console.log('end of new conversation');
} // end of newConversationResponse

// function to respond when buy data button is clicked
export async function sendPurchaseDataReponse(event) {
  const senderId = event.sender.id;
  const message1 = {
    text: 'Select network for data purchase',
  };

  await sendMessage(senderId, message1);
  await sendTemplate(senderId, dataNetworks1);
  await sendTemplate(senderId, dataNetworks2);
} // end of data purchaseResponse

// function to send mtn offers
export async function sendMtnOffers(event) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select MTN data offer',
  };

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('1', 'MTN');
  console.log('MTN offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplate(senderId, offers[i]);
    //i++;
  }
} // end sendMtnOffers

// function to send airtel offers
export async function sendAirtelOffers(event) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select Airtel data offer',
  };

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('3', 'Airtel');
  console.log('Airtel offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplate(senderId, offers[i]);
    //i++;
  }
} // end sendAirtelOffers

// function to send glo offers
export async function sendGloOffers(event) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select Glo data offer',
  };

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('1', 'MTN');
  console.log('Glo offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplate(senderId, offers[i]);
    //i++;
  }
} // end sendGloOffers

// functiin to send 9mobile offers
export async function sendNineMobileOffers(event) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select 9mobile data offer',
  };

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('1', 'MTN');
  console.log('9mobile offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplate(senderId, offers[i]);
    //i++;
  }
} // end sendNineMobileOffers

// function to respond when an offer is selected
export async function offerSelected(event, payload) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);

  const message = {
    text: 'Enter phone number to deliver value to',
  };
  await sendMessage(senderId, message);

  const filter = { id: senderId };
  const update = {
    $set: {
      nextAction: 'phoneNumber',
      purchasePayload: payload,
    },
  };

  await collection.updateOne(filter, update);
  client.close();
} // end of offerSelected

// ================================================
// section airtime purchase

// function to respond to purchaseAirtime
export async function sendPurchaseAirtimeResponse(event) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Select network for airtime purchase' });
  await sendTemplate(senderId, airtimeNetworks1);
  await sendTemplate(senderId, airtimeNetworks2);
} // end of sendPurchaseAirtimeResponse

// function to handdle mtnAirtime
export async function airtimePurchase(event, payload) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  console.log('in airtime purchase');

  await sendMessage(senderId, { text: `Enter ${payload.network} airtime amount` });

  // updating database
  const filter = { id: senderId };
  const update = {
    $set: {
      nextAction: 'enterAirtimeAmount',
      purchasePayload: payload,
    },
  };

  await collection.updateOne(filter, update);
  client.close();
} // end of mtnAirtimePurchase

//============================================
// issue Report responses

export async function issueReport(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);

  await sendMessage(senderId, { text: 'Pls enter a detailed explation of your issue' });

  // updating database
  const filter = { id: senderId };
  const update = { $set: { nextAction: 'enterIssue' } };

  await collection.updateOne(filter, update);
}

//===============================================
// generic responses

// function to generate account number
export async function generateAccountNumber(event) {
  let returnFalse;
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  const user = await collection.findOne({ id: senderId });
  console.log('generateAccountNumber', user);

  if (!user.purchasePayload) return noTransactFound(senderId);

  const payload = user.purchasePayload;
  payload.email = user.email;

  let response = await axios
    .post(`https://${process.env.HOST}/gateway/transfer-account`, payload)
    .catch((error) => {
      returnFalse = true;
      console.log('Error getting transfer account:', error);
    });

  if (returnFalse) {
    client.close();
    await sendMessage(senderId, { text: 'Ana error occured \nPlease start a new transaction' });
    await cancelTransaction(event, true);
    return;
  }

  response = await response.data;
  console.log(response);

  if (response.status === 'success') {
    const data = response.meta.authorization;
    await sendMessage(senderId, { text: 'make transfer to the account below' });
    await sendMessage(senderId, { text: 'value would be delivered once purchase is made' });
    await sendMessage(senderId, { text: 'Account Name: ' + data.transfer_bank });
    await sendMessage(senderId, { text: 'Account Number: 👇' });
    await sendMessage(senderId, { text: data.transfer_account });
    await sendMessage(senderId, { text: 'Amount: #' + data.transfer_amount });
    await sendMessage(senderId, {
      text: 'Account Expiry: ' + dateFormatter(data.account_expiration),
    });
  } else {
    await sendMessage(senderId, { text: 'An error occured \nPlease start a new transaction' });
  }
  // removing purchasePayload
  cancelTransaction(event, true);
  client.close();
} // end of generateAccountNumber

// function to chanege email b4 transaction
export async function changeMailBeforeTransact(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);

  const user = await collection.findOne({ id: senderId });
  console.log('changeEmailBeforeTransact', user);

  if (!user.purchasePayload) {
    noTransactFound(senderId);

    // updating database
    const filter = { id: senderId };
    const update = { $set: { nextAction: null } };

    await collection.updateOne(filter, update);
    client.close();
    return;
  }

  await sendMessage(senderId, { text: 'Enter new email \n\nEnter Q to cancel' });

  const filter = { id: senderId };
  const update = { $set: { nextAction: 'changeEmailBeforeTransact' } };

  await collection.updateOne(filter, update);
  client.close();
} // end of changeMailBeforeTransact

// function to changePhoneNumber
export async function changePhoneNumber(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);

  const user = await collection.findOne({ id: senderId });
  console.log('changePhoneNumber', user);

  if (!user.purchasePayload) {
    noTransactFound(senderId);

    // updating database
    const filter = { id: senderId };
    const update = { $set: { nextAction: null } };

    await collection.updateOne(filter, update);
    client.close();
    return;
  }

  await sendMessage(senderId, { text: 'Enter new phone number \n\nEnter Q to cancel' });

  const filter = { id: senderId };
  const update = { $set: { nextAction: 'changePhoneNumberBeforeTransact' } };

  await collection.updateOne(filter, update);
  client.close();
} // end of  changeNumber

// function to cancel transaction
export async function cancelTransaction(event, end = false) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  //const user = collection.findOne({_id: senderId});

  // delete purchase payload here
  if (end) {
    await sendMessage(senderId, { text: 'Transaction Concluded' });
    const filter = { id: senderId };
    const update = {
      $set: {
        nextAction: null,
        purchasePayload: null,
      },
    };

    await collection.updateOne(filter, update);
    client.close();
    return;
  }

  await sendMessage(senderId, { text: 'Transaction Cancled' });
  await sendMessage(senderId, { text: 'What do you want to do next' });
  await sendTemplate(senderId, responseServices);

  const filter = { id: senderId };
  const update = {
    $set: {
      nextAction: null,
      purchasePayload: null,
    },
  };

  await collection.updateOne(filter, update);
  client.close();
} // end of cancelTransaction
