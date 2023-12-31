const sendMessage = require('./send_message.js');
const sendTemplate = require('./send_templates.js');
const axios = require('axios');
const { confirmDataPurchaseResponse } = require('./helper_functions.js')
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
const BotUsers = require('../models/fb_bot_users.js');
const handleFirstMonthBonus = require('../modules/monthly_bonuses.js');
const { text } = require('express');
const { promises } = require('nodemailer/lib/xoauth2/index.js');


// function to response to newConversations
async function sendNewConversationResponse(event) {
  const senderId = event.sender.id;
  const userName = null //await getUserName(senderId);

  await sendMessage(senderId, { text: `Hy ${userName ? userName : ''} i am BotSub virtual assitance.` });
  await sendMessage(senderId, { text: `Kindly enter referral code below \nIf no referral code enter 0` });

  // adding new botuser
  const newBotUser = new BotUsers({
    id: senderId,
    nextAction: 'referralCode'
  });
  await newBotUser.save();
  console.log('end of new bot user', newBotUser);
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
  const message = { text: 'Enter phone number to deliver value to' };
  console.log('in offerselected', payload);
  await sendMessage(senderId, message);
  await BotUsers.updateOne({ id: senderId }, {
    $set: {
      nextAction: 'phoneNumber',
      purchasePayload: payload
    }
  });
}; // end of offerSelected


// ==============================================================
// function to respond to purchaseAirtime
async function sendPurchaseAirtimeResponse(event) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Select network for airtime purchase' });
  await sendTemplate(senderId, airtimeNetworks1);
  await sendTemplate(senderId, airtimeNetworks2);
}; // end of sendPurchaseAirtimeResponse


// function to handdle mtnAirtime
async function airtimePurchase(event, payload) {
  const senderId = event.sender.id;
  payload.transactionType = 'airtime';
  console.log('in airtime purchase', payload);

  await sendMessage(senderId, { text: `Enter ${payload.network} airtime amount` });
  await BotUsers.updateOne({ id: senderId }, {
    $set: {
      nextAction: 'enterAirtimeAmount',
      purchasePayload: payload,
    },
  });
}; // end of mtnAirtimePurchase


//============================================

// issue Report responses
async function issueReport(event) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Please enter a detailed explation of your issue' });
  await BotUsers.updateOne({ id: senderId }, {
    $set: { nextAction: 'enterIssue' }
  });
}; // end of issueReport


//===============================================
// generic responsese

// function to generate account number
async function generateAccountNumber(event) {
  let payload;
  let response;
  const senderId = event.sender.id;
  try {
    const botUser = await BotUsers.findOne({ id: senderId }).select('email purchasePayload referrer firstPurchase');
    console.log('generateAccountNumber', botUser);

    if (botUser.purchasePayload.$isEmpty()) return noTransactFound(senderId);

    payload = botUser.purchasePayload.toObject();
    payload.email = botUser.email;
    payload.bot = true;
    payload.firstPurchase = botUser.firstPurchase;
    payload['senderId'] = senderId;
    let test = payload;
    console.log('in generate account number: ', payload, test);
    await sendMessage(senderId, { text: 'Make transfer to the account details below. \nPlease note that the account details below is valid only for this transaction and expires 1Hour from now.' });
    await sendMessage(senderId, { text: 'Value would automatically delivered by our system once payment is made' });

    response = await axios.post(`https://${process.env.HOST}/gateway/transfer-account`, payload);
    response = await response.data;
    console.log(response);

    if (response.status === 'success') {
      const data = response.meta.authorization;
      await sendMessage(senderId, { text: 'Bank Name: ' + data.transfer_bank });
      await sendMessage(senderId, { text: 'Account Name: BotSub' });
      await sendMessage(senderId, { text: 'Account Number: 👇' });
      await sendMessage(senderId, { text: data.transfer_account });
      await sendMessage(senderId, { text: 'Amount: ₦' + data.transfer_amount });
      // removing purchasePayload
      cancelTransaction(event);
      return;
    };
    throw 'error occured while trying to transfer account'
  } catch (err) {
    await sendMessage(senderId, { text: 'An error occured \nPlease reclick make purchase button' });
    await confirmDataPurchaseResponse(senderId);
    console.log('Error getting transfer account:', err);
  };
}; // end of generateAccountNumber


// function to chanege email b4 transaction
async function changeMailBeforeTransact(event) {
  const senderId = event.sender.id;
  const user = await BotUsers.findOne({ id: senderId });
  console.log('changeEmailBeforeTransact', !user.purchasePayload);

  if (user.purchasePayload.$isEmpty()) {
    noTransactFound(senderId);
    // updating database
    await BotUsers.updateOne({ id: senderId }, {
      $set: { nextAction: null }
    });
    return;
  };

  await sendMessage(senderId, { text: 'Enter new email \n\nEnter Q to cancel' });
  await BotUsers.updateOne({ id: senderId }, {
    $set: { nextAction: 'changeEmailBeforeTransact' }
  });
}; // end of changeMailBeforeTransact


// function to changePhoneNumber
async function changePhoneNumber(event) {
  const senderId = event.sender.id;
  const user = await BotUsers.findOne({ id: senderId });

  if (user.purchasePayload.$isEmpty()) {
    noTransactFound(senderId);
    // updating database
    await BotUsers.updateOne({ id: senderId }, {
      $set: { nextAction: null }
    });
    return;
  };

  await sendMessage(senderId, { text: 'Enter new phone number \n\nEnter Q to cancel' });
  await BotUsers.updateOne({ id: senderId }, {
    $set: { nextAction: 'changePhoneNumberBeforeTransact' }
  });
}; // end of  changeNumber


// function to  transaction
async function cancelTransaction(event) {
  const senderId = event.sender.id;

  // delete purchase payload here
  await reset(senderId);
  await sendMessage(senderId, { text: 'Transaction Cancled' });
  await sendMessage(senderId, { text: 'What do you want to do next' });
  await sendTemplate(senderId, responseServices);
  await sendTemplate(senderId, responseServices2);
  await reset(senderId);
}; // end of cancelTransaction


// helper to help in resetting
const reset = async (senderId) => {
  await BotUsers.updateOne({ id: senderId }, {
    $set: {
      nextAction: null,
      purchasePayload: {},
    },
  });
}; // end of reset helpers


// function to respond to view data prices
async function showDataPrices(event) {
  const senderId = event.sender.id;
  const datas = {
    MTN: "1",
    Airtel: "4",
    "9mobile": "3",
    Glo: "2",
  };
  const keys = Object.keys(datas);

  async function processKeysSequentially() {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const message = {
        text: `${i !== 0 ? ".\n\n" : ""}${key} Data Offers`,
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


// function to retry failed delivery
async function retryFailed(event, payload) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: "Reinitiating transaction....." });
  await axios
    .post(`https://${process.env.HOST}/front-api/retry?transaction_id=${payload.transaction_id}&tx_ref=${payload.tx_ref}`)
    .catch((error) => console.log(error));
  //retryFailedHelper(payload.transaction_id, payload.tx_ref, false);
}; // end of retry failed delivery


// functon to handle failedMonthlyDeliveryBonus
async function handleRetryFailedMonthlyDelivery(event, payload) {
  const senderId = event.sender.id;
  console.log('in handle monthlty failed');
  return handleFirstMonthBonus(payload.email, payload.number, payload.networkID, senderId, payload.retry);
};  // end of handleRetryFailedMonthlyDelivery



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
  retryFailed,
  handleRetryFailedMonthlyDelivery
};