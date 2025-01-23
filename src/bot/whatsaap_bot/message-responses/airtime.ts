import WhatsaapBotUsers from '../../../models/whatsaap_bot_users';
import { airtimeNetworkType } from '../../../types/bot/module-airtime-types';
import { validateAmount } from '../../modules/helper_functions';
import sendMessageW from '../send_message_w';
import { cancelTransactionW } from './generic';

// const function to respond to buy airtime
const handleBuyAirtimeW = async (messageObj: any) => {
  const senderId = messageObj.from;

  try {
    await sendMessageW(
      senderId,
      'Select network for Airtime purchase. \n\n A. MTN. \n B. GLO. \n C. Airtel. \n D. 9mobile. \n\n X. cancel.'
    );
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      { $set: { nextAction: 'selectAritimeNetwork' } }
    );
  } catch (err) {
    console.error('An error occurred in handleBuyAirtimeW', err);
    await sendMessageW(senderId, 'An error occurred, please try again. \n\nEnter X to cancel');
  }
};

// fucntion to handle selection of netework for airtime purchase
const handleAirtimeNetworkSelectedW = async (messageObj: any) => {
  const senderId = messageObj.from;

  try {
    const message: string = messageObj?.text?.body.trim().toLowerCase(); // Message text
    const airtimeNetwork: airtimeNetworkType = {
      a: {
        network: 'MTN',
        id: 1,
      },
      b: {
        network: 'GLO',
        id: 2,
      },
      c: {
        network: 'Airtel',
        id: 4,
      },
      d: {
        network: '9mobile',
        id: 3,
      },
    };

    if (message === 'x') return cancelTransactionW(senderId, false);

    if (!airtimeNetwork[message]) {
      await sendMessageW(senderId, 'Invalid response recieved');
      await sendMessageW(
        senderId,
        'Select network for Airtime purchase. \n\n A. MTN. \n B. GLO. \n C. Airtel. \n D. 9mobile. \n\n X. cancel.'
      );
      return;
    }

    await sendMessageW(senderId, 'Enter airtime amount. \n\nEnter X to cancel.');
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterAirtimeAmount',
          'purchasePayload.network': airtimeNetwork[message].network,
          'purchasePayload.networkID': airtimeNetwork[message].id,
        },
      }
    );
  } catch (err) {
    console.error('An error occurred in handleAirtimeNetworkSelectedW', err);
    await sendMessageW(senderId, 'An error occurred, please try again. \n\nOr enter X to cancel');
  }
}; // end of handleAirtimeNetworkSelectedW

// function to handle enter airtime amount
const handleEnterAirtimeAmountW = async (messageObj: any) => {
  const senderId = messageObj.from;
  const message: string = messageObj.text ? messageObj.text.body : '';

  try {
    if (message.toLowerCase() === 'x') return cancelTransactionW(senderId, false);
    const amountValid = await validateAmount(message);
    //console.log('Amont validdddddddddddddddd in whatsaap bot', amountValid);

    if (!amountValid)
      return sendMessageW(
        senderId,
        'Invalid amount entered.\nAir amount should be      at least 100. \n\nEnter X to cancel.'
      );

    const user = await WhatsaapBotUsers.findOne({ id: senderId });

    await sendMessageW(
      senderId,
      `Enter phone number for ${user?.purchasePayload?.network} airtime purchase.  \n\nEnter X to cancel.`
    );

    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterPhoneNumber',
          'purchasePayload.price': parseFloat(message),
          'purchasePayload.product': `${message} ${user?.purchasePayload?.network} airtime.`,
          'purchasePayload.transactionType': 'airtime',
        },
      }
    );
  } catch (err) {
    console.error('An error occurred in handleAirtimeAmount: ', err);
    await sendMessageW(senderId, 'An error occurred, please try again. \n\nOr enter X to cancel');
  }
};

export { handleBuyAirtimeW, handleAirtimeNetworkSelectedW, handleEnterAirtimeAmountW };
