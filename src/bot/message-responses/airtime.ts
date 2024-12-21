import BotUsers from '../../models/fb_bot_users';
import { airtimeNetworkType } from '../../types/bot/module-airtime-types';
import { validateAmount } from '../modules/helper_functions';
import { sendMessage } from '../modules/send_message';
import { cancelTransaction } from './generic';

// const function to respond to buy airtime
const handleBuyAirtime = async (event: any) => {
  const senderId = event.sender.id;

  try {
    await sendMessage(senderId, {
      text: 'Select network for Airtime purchase. \n\n A. MTN. \n B. GLO. \n C. Airtel. \n D. 9mobile. \n\n X. cancel.',
    });
    await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'selectAritimeNetwork' } });
  } catch (err) {
    console.error('An error occurred in handleBuyAirtime', err);
    await sendMessage(senderId, {
      text: 'An error occurred, please try again. \n\nEnter X to cancel',
    });
  }
};

// fucntion to handle selection of netework for airtime purchase
const handleAirtimeNetworkSelected = async (event: any) => {
  const senderId = event.sender.id;
  const message: string = event.message.text.trim().toLowerCase();
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

  try {
    if (message === 'x') return cancelTransaction(senderId, false);

    if (!airtimeNetwork[message]) {
      await sendMessage(senderId, {
        text: 'Invalid response recieved',
      });
      await sendMessage(senderId, {
        text: 'Select network for Airtime purchase. \n\n A. MTN. \n B. GLO. \n C. Airtel. \n D. 9mobile. \n\n X. cancel.',
      });
      return;
    }

    await sendMessage(senderId, { text: 'Enter airtime amount. \n\nEnter X to cancle.' });
    await BotUsers.updateOne(
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
    console.error('An error occurred in handleAirtimeNetworkSelected', err);
    await sendMessage(senderId, {
      text: 'An error occurred, please try again. \n\nOr enter X to cancel',
    });
  }
}; // end of handleAirtimeNetworkSelected

// function to handle enter airtime amount
const handleEnterAirtimeAmount = async (event: any) => {
  const senderId = event.sender.id;
  const message: string = event.message.text.trim();

  try {
    if (message.toLowerCase() === 'x') return cancelTransaction(senderId, false);
    const amountValid = await validateAmount(message);
    console.log('Amont validdddddddddddddddd', amountValid);
    if (!amountValid)
      return sendMessage(senderId, {
        text: 'Invalid amount entered.\nAir amount should be      at least 100. \n\nEnter X to cancel.',
      });

    const user = await BotUsers.findOne({ id: senderId });

    await sendMessage(senderId, {
      text: `Enter phone number for ${user?.purchasePayload?.network} airtime purchase.  \n\nEnter X to cancel.`,
    });

    await BotUsers.updateOne(
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
    await sendMessage(senderId, {
      text: 'An error occurred, please try again. \n\nOr enter X to cancel',
    });
  }
};

export { handleBuyAirtime, handleAirtimeNetworkSelected, handleEnterAirtimeAmount };
