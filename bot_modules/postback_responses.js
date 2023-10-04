const sendMessage = require('./send_message.js');

const sendTemplate = require('./send_templates.js');

const axios = require('axios');

const getUserName = require('./get_user_info.js');

const { dateFormatter, noTransactFound } = require('./helper_functions.js');

const {
  responseServices,
  responseServices2,
  dataNetworks1,
  dataNetworks2,
  generateFacebookPosts,
  airtimeNetworks1,
  airtimeNetworks2,
} = require('./templates.js');

const createClient = require('./../modules/mongodb.js');



// function to response to newConversations
async function sendNewConversationResponse(event) {
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

  await sendTemplate(senderId, responseServices);
  sendTemplate(senderId, responseServices2);
  // adding one
  await collection.updateOne(
    { id: senderId },
    { $set: { id: senderId } },
    { upsert: true }
  );
  console.log('end of new conversation');
}; // end of newConversationResponse



// function to respond when buy data button is clicked
async function sendPurchaseDataReponse(event) {
  const senderId = event.sender.id;
  const message1 = {
    text: 'Select network for data purchase',
  };

  await sendMessage(senderId, message1);
  await sendTemplate(senderId, dataNetworks1);
  await sendTemplate(senderId, dataNetworks2);
}; // end of data purchaseResponse



// function to send mtn offers
async function sendMtnOffers(event) {
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
  };
}; // end sendMtnOffers



// function to send airtel offers
async function sendAirtelOffers(event) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select Airtel data offer',
  };

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('4', 'Airtel');
  console.log('Airtel offers', offers.length);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplate(senderId, offers[i]);
    //i++;
  };
}; // end sendAirtelOffers

// function to send glo offers
async function sendGloOffers(event) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select Glo data offer',
  };

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('2', 'Glo');
  console.log('Glo offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplate(senderId, offers[i]);
    //i++;
  };
}; // end sendGloOffers

// functiin to send 9mobile offers
async function sendNineMobileOffers(event) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select 9mobile data offer',
  };

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('3', '9mobile');
  console.log('9mobile offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplate(senderId, offers[i]);
    //i++;
  };
}; // end sendNineMobileOffers



// function to respond when an offer is selected
async function offerSelected(event, payload) {
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
}; // end of offerSelected




// ================================================
// section airtime purchase

// function to respond to purchaseAirtime
async function sendPurchaseAirtimeResponse(event) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Select network for airtime purchase' });
  await sendTemplate(senderId, airtimeNetworks1);
  await sendTemplate(senderId, airtimeNetworks2);
} // end of sendPurchaseAirtimeResponse

// function to handdle mtnAirtime
async function airtimePurchase(event, payload) {
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
}; // end of mtnAirtimePurchase



//============================================
// issue Report responses

async function issueReport(event) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);

  await sendMessage(senderId, { text: 'Pls enter a detailed explation of your issue' });

  // updating database
  const filter = { id: senderId };
  const update = { $set: { nextAction: 'enterIssue' } };

  await collection.updateOne(filter, update);
};

    

//===============================================
// generic responses

// function to generate account number
async function generateAccountNumber(event) {
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
  payload.bot = true;
  payload.senderId = senderId;

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
    await sendMessage(senderId, { text: 'make transfer to the account below. \nPlease note that the account details below is valid only for this transaction and expires 1Hour from now.' });
    await sendMessage(senderId, { text: 'value would be delivered once purchase is made' });
    await sendMessage(senderId, { text: 'Bank Name: ' + data.transfer_bank });
    await sendMessage(senderId, { text: 'Account Name: BotSub' });
    await sendMessage(senderId, { text: 'Account Number: 👇' });
    await sendMessage(senderId, { text: data.transfer_account });
    await sendMessage(senderId, { text: 'Amount: ₦' + data.transfer_amount });
    /*await sendMessage(senderId, {
      text: 'Account Expiry: ' + dateFormatter(data.account_expiration),
    });*/
  } else {
    await sendMessage(senderId, { text: 'An error occured \nPlease start a new transaction' });
  };
  // removing purchasePayload
  cancelTransaction(event, true);
  client.close();
}; // end of generateAccountNumber



// function to chanege email b4 transaction
async function changeMailBeforeTransact(event) {
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
  };

  await sendMessage(senderId, { text: 'Enter new email \n\nEnter Q to cancel' });

  const filter = { id: senderId };
  const update = { $set: { nextAction: 'changeEmailBeforeTransact' } };

  await collection.updateOne(filter, update);
  client.close();
}; // end of changeMailBeforeTransact



// function to changePhoneNumber
async function changePhoneNumber(event) {
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
  };

  await sendMessage(senderId, { text: 'Enter new phone number \n\nEnter Q to cancel' });

  const filter = { id: senderId };
  const update = { $set: { nextAction: 'changePhoneNumberBeforeTransact' } };

  await collection.updateOne(filter, update);
  client.close();
}; // end of  changeNumber




// function to cancel transaction
async function cancelTransaction(event, end = false) {
  const senderId = event.sender.id;
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FB_BOT_COLLECTION);
  //const user = collection.findOne({_id: senderId});

  // delete purchase payload here
  if (end) {
    //await sendMessage(senderId, { text: 'Transaction Concluded' });
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
  };

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
}; // end of cancelTransaction



// function to respond to view data prices
async function showDataPrices(event) {
  const senderId = event.sender.id;
  const datas = {
    MTN: "1",
    Airtel: "4",
    "9mobile": "3",
    Glo: "2",
  };

  /*Object.keys(datas).map(async (key)=> {
    const message = {
      text: `${key} Data Offers`,
    };

    await sendMessage(senderId, message);
    const offers = await generateFacebookPosts(datas[key], '9mobile');
    console.log(`${key} offers`, offers);

    for (let i = 0; i < offers.length; i++) {
      await sendTemplate(senderId, offers[i]);
    };
  });*/
  const keys = Object.keys(datas);

  async function processKeysSequentially() {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const message = {
        text: `${i!==0 ? ".\n\n" : ""}${key} Data Offers`,
      };

      await sendMessage(senderId, message);
      const offers = await generateFacebookPosts(datas[key], key);
      console.log(`${key} offers`, offers);

      for (let j = 0; j < offers.length; j++) {
        await sendTemplate(senderId, offers[j]);
      };
    };
  };

  processKeysSequentially()
    .then(() => {
      console.log("All operations completed in order.");
    })
    .catch((error) => {
      console.error("An error occurred:", error);
    });
}; // end of showDataPrices




module.exports = {
  sendNewConversationResponse,
  sendPurchaseDataReponse,
  sendMtnOffers,
  sendAirtelOffers,
  sendGloOffers,
  sendNineMobileOffers,
  offerSelected,
  sendPurchaseAirtimeResponse,
  airtimePurchase,
  issueReport,
  generateAccountNumber,
  changeMailBeforeTransact,
  changePhoneNumber,
  cancelTransaction,
  showDataPrices,
};
