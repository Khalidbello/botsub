import BotUsers from '../../models/fb_bot_users';
import { networkDetailsType } from '../../types/bot/module-buy-data-types';
import { confirmDataPurchaseResponse, formDataOffers } from '../modules/buy-data';
import { checkDataStatus, handleDataNetworkNotAvailable } from '../modules/data-network-checker';
import { computeDiscount, mapAlpaheToNum } from '../modules/helper_function_2';
import { validateNumber } from '../modules/helper_functions';
import { sendMessage } from '../modules/send_message';
import { cancelTransaction } from './generic';
import fs from 'fs';

const buyDataText = `Select network for data Purchase \n\n A. MTN \n B. Glo \n C. 9mobile \n D. Airtel \n\n X. cancle`;
const confirmPurchaseText = ``;

// function to handle buy data selected
async function handleBuyData(event: any) {
  const senderId = event.sender.id;

  sendMessage(senderId, { text: buyDataText });
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'selectDataNetwork' },
    }
  );
} // end of sendEmailEnteredResponse

// functiion to data network selected
const handleDataNetWorkSelected = async (event: any, transactNum: number) => {
  const senderId = event.sender.id;
  const message: string = event.message.text.trim().toLowerCase();
  let index: number = 0;

  try {
    if (message === 'x') return cancelTransaction(senderId, false);

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
      await sendMessage(senderId, { text: 'Invalid resposne entred.' });
      return sendMessage(senderId, { text: buyDataText });
    }
    // Get details of user selected network
    const networkDetails: networkDetailsType = dataDetails[index];
    const { network, networkID } = networkDetails['1'];
    let check = await checkDataStatus(network); // check if network available for purchase

    // // check if network aavilable if not return to select network for data purchase
    // if (!check) {
    //   await handleDataNetworkNotAvailable(senderId, network);
    //   return handleBuyData(event);
    // }

    const response = await formDataOffers(networkDetails, transactNum);
    await sendMessage(senderId, { text: response });

    // Update bot user info
    await BotUsers.updateOne(
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
    console.error('An error occurred in handleDataNetWorkSelected', err);
    await sendMessage(senderId, {
      text: 'An error occurred, please try again. \n\nOr enter X to cancle',
    });
  }
};

// funciton to handle network data offer selected
const handleOfferSelected = async (event: any, transactNum: number) => {
  const senderId = event.sender.id;
  const message: string = event.message.text.trim().toLowerCase();
  const discount = computeDiscount(transactNum);

  try {
    if (message.toLocaleLowerCase() === 'x') return cancelTransaction(senderId, false);
    const user = await BotUsers.findOne({ id: senderId }).select('purchasePayload');
    const network: any = user?.purchasePayload?.network; // a string
    const networkID: any = user?.purchasePayload?.networkID; // a number
    let check = await checkDataStatus(network); // check if network available for purchase

    // check if network aavilable if not return to select network for data purchase
    // if (!check) {
    //   await handleDataNetworkNotAvailable(senderId, network);
    //   return handleBuyData(event);
    // }

    let dataDetails: any = await fs.promises.readFile('files/data-details.json'); // get data details
    dataDetails = JSON.parse(dataDetails);
    const networkDetails: networkDetailsType = dataDetails[networkID]; // details of user selected network
    const dataOffer = networkDetails[mapAlpaheToNum(message)]; // the offer user selected

    if (!dataOffer) {
      await sendMessage(senderId, { text: 'Invalid response entred.' });
      return handleDataNetWorkSelected(event, transactNum);
    }

    sendMessage(senderId, { text: `Enter phone number for ${network} data purchase` });

    // update user document
    await BotUsers.updateOne(
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
    console.error('An error occured in handleOfferSelected', err);
    sendMessage(senderId, {
      text: 'An error occured plase enter resposne again.  \n Or enter X to cancle',
    });
  }
};

// functiion to respond to phone number entred
const handlePhoneNumberEntred = async (event: any) => {
  const senderId = event.sender.id;
  const message: string = event.message.text.trim();

  try {
    if (message.toLowerCase() === 'x') return cancelTransaction(senderId, false);

    const validatedNum = validateNumber(message);
    const user = await BotUsers.findOne({ id: senderId });

    // to run if number valid and user has provided email
    if (validatedNum && user?.email) {
      await BotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            nextAction: 'confirmProductPurchase',
            'purchasePayload.phoneNumber': validatedNum,
          },
        }
      );
      await sendMessage(senderId, { text: 'Phone  number recieved.' });
      await confirmDataPurchaseResponse(senderId, user, validatedNum);
      return;
    }

    // to run if number is valid but user has never provided email
    if (validatedNum && !user?.email) {
      sendMessage(senderId, {
        text: 'Please enter your email. \nReciept would be sent to the provided email',
      });

      await BotUsers.updateOne(
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

    sendMessage(senderId, {
      text: 'Phone number not valid. \nPlease enter a valid phone number. \nEnter X to cancle.',
    });
  } catch (err) {
    console.error('An error occured in phoneNumberEntred', err);
    sendMessage(senderId, {
      text: 'An error occured plase enter resposne again.  \n Or enter X to cancle',
    });
  }
};

export {
  buyDataText,
  confirmPurchaseText,
  handleBuyData,
  handleDataNetWorkSelected,
  handleOfferSelected,
  handlePhoneNumberEntred,
};
