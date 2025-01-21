import axios from 'axios';
import BotUsers from '../../../models/fb_bot_users';
import { checkDataStatus, handleDataNetworkNotAvailable } from '../../modules/data-network-checker';
import { getUserName } from '../../modules/get_user_info';
import {
  confirmDataPurchaseResponse,
  noTransactFound,
  remindToFundWallet,
} from '../../modules/helper_functions';
import { sendMessage } from '../../modules/send_message';
import sendTemplates from '../../modules/send_templates';
import {
  airtimeNetworks1,
  airtimeNetworks2,
  dataNetworks1,
  dataNetworks2,
  generateFacebookPosts,
  responseServices,
  responseServices2,
  responseServices3,
} from '../templates/templates';
import PaymentAccounts from '../../../models/payment-accounts';
import { makePurchase } from '../../../modules/v-account-make-purcchase';
import handleFirstMonthBonus from '../../../modules/monthly_bonuses';
import { defaaultMessage } from '../../fb-bot/message-responses/message_responses';
import { defaultText } from '../../fb-bot/message-responses/generic';

// function to response to newConversations
async function sendNewConversationResponse(event: any) {
  const senderId = event.sender.id;
  const userName = await getUserName(senderId);

  // await sendMessage(senderId, {
  //   text: `Hy ${userName ? userName : ''} i am BotSub virtual assitance.`,
  // });
  // await sendMessage(senderId, {
  //   text: `Kindly enter referral code below \nIf no referral code enter 0`,
  // });

  // // adding new botuser
  // const newBotUser = new BotUsers({
  //   id: senderId,
  //   transactNum: 0,
  //   botResponse: true,
  //   nextAction: 'referralCode',
  // });

  // run with out requesting referral code
  await sendMessage(senderId, {
    text: `Hy ${userName ? userName : ''} i am BotSub virtual assitance.`,
  });

  const user = await BotUsers.findOne({ id: senderId });

  if (!user) {
    await sendMessage(senderId, {
      text: 'Welcome to BotSub, Get data offers for as low as ₦200/GB. \nHurry while it last!',
    });
    // adding new botuser
    const newBotUser = new BotUsers({
      id: senderId,
      transactNum: 0,
      botResponse: true,
      nextAction: null,
      referrer: 0,
      firstPurchase: true,
    });
    newBotUser.save();
  }

  await sendMessage(senderId, { text: defaultText });
} // end of newConversationResponse

// function to respond when buy data button is clicked
async function sendPurchaseDataReponse(event: any) {
  const senderId = event.sender.id;
  const message1 = {
    text: 'Select network for data purchase',
  };

  await sendMessage(senderId, message1);
  await sendTemplates(senderId, dataNetworks1);
  await sendTemplates(senderId, dataNetworks2);
} // end of data purchaseResponse

// function to send mtn offers
async function sendMtnOffers(event: any) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select MTN data offer',
  };
  // check if data network is active before proceeding
  const check = await checkDataStatus('MTN');

  if (!check) return handleDataNetworkNotAvailable(senderId, 'MTN');

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('1', 'MTN');
  console.log('MTN offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplates(senderId, offers[i]);
    //i++;
  }
} // end sendMtnOffers

// function to send airtel offers
async function sendAirtelOffers(event: any) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select Airtel data offer',
  };
  // check if data network is active before proceeding
  const check = await checkDataStatus('Airtel');

  if (!check) return handleDataNetworkNotAvailable(senderId, 'Airtel');

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('4', 'Airtel');
  console.log('Airtel offers', offers.length);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplates(senderId, offers[i]);
    //i++;
  }
} // end sendAirtelOffers

// function to send glo offers
async function sendGloOffers(event: any) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select Glo data offer',
  };
  // check if data network is active before proceeding
  const check = await checkDataStatus('Glo');

  if (!check) return handleDataNetworkNotAvailable(senderId, 'Glo');

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('2', 'Glo');
  console.log('Glo offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplates(senderId, offers[i]);
    //i++;
  }
} // end sendGloOffers

// functiin to send 9mobile offers
async function sendNineMobileOffers(event: any) {
  const senderId = event.sender.id;
  const message = {
    text: 'Select 9mobile data offer',
  };
  // check if data network is active before proceeding
  const check = await checkDataStatus('9mobile');

  if (!check) return handleDataNetworkNotAvailable(senderId, '9mobile');

  await sendMessage(senderId, message);
  const offers = await generateFacebookPosts('3', '9mobile');
  console.log('9mobile offers', offers);

  for (let i = 0; i < offers.length; i++) {
    await sendTemplates(senderId, offers[i]);
    //i++;
  }
} // end sendNineMobileOffers

// function to respond when an offer is selected
async function offerSelected(event: any, payload: any) {
  const senderId = event.sender.id;
  const message = { text: 'Enter phone number to deliver value to' };

  await sendMessage(senderId, message);
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: {
        nextAction: 'phoneNumber',
        purchasePayload: payload,
      },
    }
  );
} // end of offerSelected

// ==============================================================
// function to respond to purchaseAirtime
async function sendPurchaseAirtimeResponse(event: any) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Select network for airtime purchase' });
  await sendTemplates(senderId, airtimeNetworks1);
  await sendTemplates(senderId, airtimeNetworks2);
} // end of sendPurchaseAirtimeResponse

// function to handdle mtnAirtime
async function airtimePurchase(event: any, payload: any) {
  const senderId = event.sender.id;
  payload.transactionType = 'airtime';
  console.log('in airtime purchase', payload);

  await sendMessage(senderId, { text: `Enter ${payload.network} airtime amount` });
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: {
        nextAction: 'enterAirtimeAmount',
        purchasePayload: payload,
      },
    }
  );
} // end of mtnAirtimePurchase

//============================================

// issue Report responses
async function issueReport(event: any) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Please enter a detailed explation of your issue' });
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'enterIssue' },
    }
  );
} // end of issueReport

//===============================================
// generic responsese

// function to generate account number
async function generateAccountNumber(event: any) {
  let payload, response;
  const senderId = event.sender.id;

  try {
    const botUser = await BotUsers.findOne({ id: senderId }).select(
      'email purchasePayload referrer firstPurchase'
    );
    console.log('generateAccountNumber', botUser);

    // @ts-expect-error
    if (!botUser.purchasePayload.transactionType) return noTransactFound(senderId);

    // @ts-expect-error
    payload = botUser.purchasePayload.toObject();
    payload.email = botUser?.email;
    payload.bot = true;
    payload.firstPurchase = botUser?.firstPurchase;
    payload['senderId'] = senderId;
    let test = payload;

    // check if data network is active bbefore proceeding
    let check = await checkDataStatus(payload.network);

    if (!check) return handleDataNetworkNotAvailable(senderId, payload.network);

    console.log('in generate account number: ', payload, test);
    await sendMessage(senderId, {
      text: 'Make transfer to the account details below. \nPlease note that the account details below is valid only for this transaction and expires 1Hour from now.',
    });
    await sendMessage(senderId, {
      text: 'Value would automatically delivered by our system once payment is made',
    });

    response = await axios.post(`https://${process.env.HOST}/gateway/transfer-account`, payload);
    response = await response.data;
    console.log('get payment account respinse::::::::::::::; ', response);

    if (response.status === 'success') {
      const data = response.meta.authorization;
      await sendMessage(senderId, { text: 'Bank Name: ' + data.transfer_bank });
      await sendMessage(senderId, { text: 'Account Name: BotSub FLW' });
      await sendMessage(senderId, { text: 'Account Number: 👇' });
      await sendMessage(senderId, { text: data.transfer_account });
      await sendMessage(senderId, { text: 'Amount: ₦' + data.transfer_amount });
      // removing purchasePayload
      cancelTransaction(senderId, true);
      return;
    }
    throw response;
  } catch (err) {
    await sendMessage(senderId, { text: 'An error occured \nPlease reclick make purchase button' });
    await confirmDataPurchaseResponse(senderId);
    console.error('Error getting transfer account:', err);
    console.error('error in genrate accon number', err);
  }
} // end of generateAccountNumber

// function to decide hoe the transaction would be carried out depedent wether user has a virtual account or not
async function selectPurchaseMethod(event: any) {
  const senderId = event.sender.id;
  const userAcount = await PaymentAccounts.findOne({ refrence: senderId });

  if (userAcount) return initMakePurchase(senderId);

  await generateAccountNumber(event);
} // end of selectPurchaseMehod

// functin to initiate tranacion for users with virtual account
async function initMakePurchase(senderId: any) {
  const userDet = BotUsers.findOne({ id: senderId }).select('purchasePayload email'); // requesting user transacion details
  const userAcount = PaymentAccounts.findOne({ refrence: senderId });
  const promises = [userDet, userAcount];
  const data = await Promise.all(promises);
  // @ts-expect-error
  const purchasePayload = data[0].purchasePayload;
  console.log('purchase ayload in initmakePurchase', purchasePayload);

  if (!purchasePayload?.transactionType) {
    await sendMessage(senderId, { text: 'No transaction found' });
    await sendMessage(senderId, { text: 'Please intiate a new transaction.' });
    await sendMessage(senderId, { text: defaaultMessage });
    // await sendTemplates(senderId, responseServices);
    // await sendTemplates(senderId, responseServices2);
    // await sendTemplates(senderId, responseServices3);
    await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
    return;
  }

  // @ts-expect-error
  if (purchasePayload.price > data[1].balance)
    return remindToFundWallet(
      senderId,
      // @ts-expect-error object might be null
      data[1].balance - purchasePayload.price,
      // @ts-expect-error object might be null
      data[1].balance,
      data[1]
    ); // returning function to remind user to fund wallet

  makePurchase(purchasePayload, 'facebook', senderId); // calling function to make function
} // end of function to initialise function

// function to chanege email b4 transaction
async function changeMailBeforeTransact(event: any) {
  const senderId = event.sender.id;
  const user = await BotUsers.findOne({ id: senderId });
  console.log('changeEmailBeforeTransact', !user?.purchasePayload);
  // @ts-expect-error
  if (user.purchasePayload.$isEmpty()) {
    noTransactFound(senderId);
    // updating database
    await BotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
    return;
  }

  await sendMessage(senderId, { text: 'Enter new email \n\nEnter Q to cancle' });
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'changeEmailBeforeTransact' },
    }
  );
} // end of changeMailBeforeTransact

// function to changePhoneNumber
async function changePhoneNumber(event: any) {
  const senderId = event.sender.id;
  const user = await BotUsers.findOne({ id: senderId });

  // @ts-expect-error
  if (user.purchasePayload.$isEmpty()) {
    noTransactFound(senderId);
    // updating database
    await BotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
    return;
  }

  await sendMessage(senderId, { text: 'Enter new phone number \n\nEnter Q to cancle' });
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'changePhoneNumberBeforeTransact' },
    }
  );
} // end of  changeNumber

// function to reset user payload
async function cancelTransaction(senderId: string, end: boolean) {
  await reset(senderId);
  console.log('condition in cancelTraanscation::::::  ', end);

  if (end) return;
  await sendMessage(senderId, { text: 'Transaction successfully canceled.' });
  sendMessage(senderId, { text: defaultText });
  // await sendMessage(senderId, { text: 'Transaction Cancled' });
  // await sendMessage(senderId, { text: 'What do you want to do next' });
  // await sendTemplates(senderId, responseServices);
  // await sendTemplates(senderId, responseServices2);
  // await sendTemplates(senderId, responseServices3);
} // end of cancelTransaction

// helper to help in resetting
const reset = async (senderId: string) => {
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: {
        nextAction: null,
        purchasePayload: {},
      },
    }
  );
}; // end of reset helpers

// function to respond to view data prices
async function showDataPrices(event: any) {
  const senderId = event.sender.id;
  const datas: any = {
    MTN: '1',
    Airtel: '4',
    '9mobile': '3',
    Glo: '2',
  };
  const keys = Object.keys(datas);

  async function processKeysSequentially() {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const message = {
        text: `${i !== 0 ? '.\n\n' : ''}${key} Data Offers`,
      };

      await sendMessage(senderId, message);
      const offers = await generateFacebookPosts(datas[key], key);
      console.log(`${key} offers`, offers);

      for (let j = 0; j < offers.length; j++) {
        await sendTemplates(senderId, offers[j]);
      }
    }
  }

  processKeysSequentially()
    .then(() => {
      console.log('All operations completed in order.');
    })
    .catch((error) => {
      console.error('An error occurred:', error);
    });
} // end of showDataPrices

// function to retry failed delivery
async function retryFailed(event: any, payload: any) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Reinitiating transaction.....' });
  await axios
    .post(
      `https://${process.env.HOST}/front-api/retry?transaction_id=${payload.transaction_id}&tx_ref=${payload.tx_ref}`
    )
    .catch((error: Error) => console.log(error));
  //retryFailedHelper(payload.transaction_id, payload.tx_ref, false);
} // end of retry failed delivery

// // functon to handle failedMonthlyDeliveryBonus
// async function handleRetryFailedMonthlyDelivery(event: any, payload: any) {
//     const senderId = event.sender.id;
//     console.log('in handle monthlty failed'); id: string, purchasePayload: any, senderId: string, retry: boolean
//     return handleFirstMonthBonus(payload.email, payload.number, payload.networkID, senderId, payload.retry);
// };  // end of handleRetryFailedMonthlyDelivery

// function to show user account details
async function showAccountDetails(event: any) {
  const senderId = event.sender.id;
  let account = await PaymentAccounts.findOne({ refrence: senderId });

  if (!account) {
    const user = await BotUsers.findOne({ id: senderId }).select('email');
    if (!user?.email) {
      await sendMessage(senderId, { text: 'You do not have a dedicated virtual account yet.' });
      await sendMessage(senderId, {
        text: 'Kindly enter your email to create your virtual accont. \nEnter Q to quit',
      });
      await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterMailForAccount' } });
      return;
    }

    await sendMessage(senderId, { text: 'You do not a dedicated virtual account yet.' });
    sendMessage(senderId, {
      text: ' Kindly enter your BVN to create a virtul accunt. \n\nYour BVN is required in compliance with CBN regulation. \n\nEnter Q to quit.',
    });
    await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterBvn' } });
    return;
  }
  console.log('senderId:::::::;;;;; ', senderId, account);

  await sendMessage(senderId, { text: 'Your dedicated virtual account details: ' });
  await sendMessage(senderId, { text: `Bank Name: ${account.bankName}` });
  await sendMessage(senderId, { text: `Account Name: ${account.accountName}` });
  await sendMessage(senderId, { text: 'Acccount Number: ' });
  // @ts-expect-error
  await sendMessage(senderId, { text: account.accountNumber });
  await sendMessage(senderId, { text: `Account Balance: ₦${account.balance}` });
  sendMessage(senderId, {
    text: 'Fund your dedicated virtual account once and make mutltiple purchases seamlessly',
  });
} // end of showAccountDetails

export {
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
  selectPurchaseMethod,
  changeMailBeforeTransact,
  changePhoneNumber,
  cancelTransaction,
  showDataPrices,
  retryFailed,
  // handleRetryFailedMonthlyDelivery,
  showAccountDetails,
  initMakePurchase,
};
