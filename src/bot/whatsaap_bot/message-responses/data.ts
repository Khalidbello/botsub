import WhatsaapBotUsers from '../../../models/whatsaap_bot_users';
import { networkDetailsType } from '../../../types/bot/module-buy-data-types';
import { formDataOffers } from '../../modules/buy-data';
import { computeDiscount, mapAlpaheToNum } from '../../modules/helper_function_2';
import { validateNumber } from '../../modules/helper_functions';
import { confirmDataPurchaseResponseW } from '../helper_functions';
import sendMessageW from '../send_message_w';
import { cancelTransactionW } from './generic';
import fs from 'fs';

const buyDataTextW = `Select network for data Purchase \n\n A. MTN \n B. Glo \n C. 9mobile \n D. Airtel \n\n X. cancel`;
const confirmPurchaseTextW = ``;

// function to handle buy data selected
async function handleBuyDataW(messageObj: any) {
  const senderId = messageObj.from;

  sendMessageW(senderId, buyDataTextW);
  await WhatsaapBotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'selectDataNetwork' },
    }
  );
} // end of sendEmailEnteredResponse

// functiion to data network selected
const handleDataNetWorkSelectedW = async (messageObj: any, transactNum: number) => {
  const senderId = messageObj.from;
  const message: string = messageObj.text ? messageObj.text.body.toLowerCase() : '';
  let index: number = 0;

  try {
    if (message === 'x') return cancelTransactionW(senderId, false);

    // Read data-details.json file
    let dataDetails: any = await fs.promises.readFile('files/data-details.json', 'utf-8');
    dataDetails = JSON.parse(dataDetails);

    // set message to match data details index
    if (message === 'a') {
      index = 1;
    } else if (message === 'b') {
      index = 2;
    } else if (message === 'c') {
      index = 3;
    } else if (message === 'd') {
      index = 4;
    } else {
      await sendMessageW(senderId, 'Invalid resposne entred.');
      return sendMessageW(senderId, buyDataTextW);
    }
    // Get details of user selected network
    const networkDetails: networkDetailsType = dataDetails[index];
    const { network, networkID } = networkDetails['1'];
    const response = await formDataOffers(networkDetails, transactNum);

    if (index === 4)
      await sendMessageW(
        senderId,
        'For all 7 days offers, ensure the line been recharged has no outstanding debt.\nThank you.'
      );
    await sendMessageW(senderId, response);

    // Update bot user info
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'selectDataOffer',
          'purchasePayload.network': network,
          'purchasePayload.networkID': networkID,
          'purchasePayload.transactionType': 'data',
        },
      }
    );
  } catch (err) {
    console.error('An error occurred in handleDataNetWorkSelectedW', err);
    await sendMessageW(senderId, 'An error occurred, please try again. \n\nOr enter X to cancel');
  }
};

// funciton to handle network data offer selected
const handleOfferSelectedW = async (messageObj: any, transactNum: number) => {
  const senderId = messageObj.from;
  const message: string = messageObj.text ? messageObj.text.body.toLowerCase() : '';
  const discount = computeDiscount(transactNum);

  try {
    if (message.toLocaleLowerCase() === 'x') return cancelTransactionW(senderId, false);
    const user = await WhatsaapBotUsers.findOne({ id: senderId }).select('purchasePayload');
    const network: any = user?.purchasePayload?.network; // a string
    const networkID: any = user?.purchasePayload?.networkID; // a number
    let dataDetails: any = await fs.promises.readFile('files/data-details.json'); // get data details
    dataDetails = JSON.parse(dataDetails);
    const networkDetails: networkDetailsType = dataDetails[networkID]; // details of user selected network
    const dataOffer = networkDetails[mapAlpaheToNum(message)]; // the offer user selected

    if (!dataOffer) {
      return handleDataNetWorkSelectedW(messageObj, transactNum);
    }

    sendMessageW(senderId, `Enter phone number for ${network} data purchase`);

    // update user document
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterPhoneNumber',
          'purchasePayload.price': dataOffer.price - discount,
          'purchasePayload.size': dataOffer.size,
          'purchasePayload.index': dataOffer.index,
          'purchasePayload.planID': dataOffer.planID,
          'purchasePayload.product': `${dataOffer.size} ${dataOffer.network} data`,
          'purchasePayload.transactionType': 'data',
        },
      }
    );
  } catch (err) {
    console.error('An error occured in handleOfferSelectedW', err);
    sendMessageW(senderId, 'An error occured plase enter resposne again.  \n Or enter X to cancel');
  }
};

// functiion to respond to phone number entred
const handlePhoneNumberEntredW = async (messageObj: any) => {
  const senderId = messageObj.from;
  const message: string = messageObj.text ? messageObj.text.body : '';

  try {
    if (message.toLowerCase() === 'x') return cancelTransactionW(senderId, false);

    const validatedNum = validateNumber(message);
    const user = await WhatsaapBotUsers.findOne({ id: senderId });

    // to run if number valid and user has provided email
    if (validatedNum && user?.email) {
      await WhatsaapBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            nextAction: 'confirmProductPurchase',
            'purchasePayload.phoneNumber': validatedNum,
          },
        }
      );
      await sendMessageW(senderId, 'Phone  number recieved.');
      await confirmDataPurchaseResponseW(senderId, user, validatedNum);
      return;
    }

    // to run if number is valid but user has never provided email
    if (validatedNum && !user?.email) {
      sendMessageW(
        senderId,
        'Please enter your email. \nReciept would be sent to the provided email'
      );

      await WhatsaapBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            nextAction: 'enterEmailToProceedWithPurchase',
            'purchasePayload.phoneNumber': validatedNum,
          },
        }
      );
      return;
    }

    sendMessageW(
      senderId,
      'Phone number not valid. \nPlease enter a valid phone number. \n\nEnter X to cancel.'
    );
  } catch (err) {
    console.error('An error occured in phoneNumberEntred', err);
    sendMessageW(
      senderId,
      'An error occured plase enter resposne again.  \n\nOr enter X to cancel'
    );
  }
};

export {
  buyDataTextW,
  confirmPurchaseTextW,
  handleBuyDataW,
  handleDataNetWorkSelectedW,
  handleOfferSelectedW,
  handlePhoneNumberEntredW,
};
