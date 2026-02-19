import FBBotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { airtimeNetworkType } from '../../types/bot/module-airtime-types';
import { sendMessage } from '../fb_bot/modules/send_message';
import { BotUserType } from '../grand_slam_offer/daily_participation_reminder';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { getNetworkAndLocalNumber } from './phone_number_checker';
import { confirmProductPurchaseResponse, validateAmount } from './utility_1';
import { cancelTransaction } from './utility_2';

/**
 * Platform Configuration Resolver
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
});

const airtimeNetworkMenu =
  'Select network for Airtime purchase. \n\n A. MTN. \n B. GLO. \n C. Airtel. \n D. 9mobile. \n\n X. cancel.';

/**
 * Handle initial Buy Airtime command
 */
const handleBuyAirtime = async (senderId: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);

  try {
    await config.send(senderId, 'Enter phone number for airtime purchase: \n\nEnter X to cancel.');
    await config.model.updateOne(
      { id: senderId },
      { $set: { nextAction: 'enterAirtimePhoneNumber' } }
    );
  } catch (err) {
    console.error(`Error in handleBuyAirtime [${platform}]:`, err);
    await config.send(senderId, 'An error occurred, please try again. \n\nEnter X to cancel');
  }
};

/**
 * Handle selection of network
 */
const handleAirtimeNetworkSelected = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA'
) => {
  const config = getPlatformConfig(platform);
  const input = message.trim().toLowerCase();

  try {
    const airtimeNetwork: airtimeNetworkType = {
      a: { network: 'MTN', id: 1 },
      b: { network: 'GLO', id: 2 },
      c: { network: 'Airtel', id: 4 },
      d: { network: '9mobile', id: 3 },
    };

    if (input === 'x') {
      await config.send(senderId, 'Tranction canceled.');
      return cancelTransaction(senderId, platform, true);
    }

    if (!airtimeNetwork[input]) {
      await config.send(senderId, 'Invalid response received');
      await config.send(senderId, airtimeNetworkMenu);
      return;
    }

    await config.send(senderId, 'Enter airtime amount. \n\nEnter X to cancel.');
    await config.model.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterAirtimeAmount',
          'purchasePayload.network': airtimeNetwork[input].network,
          'purchasePayload.networkID': airtimeNetwork[input].id,
        },
      }
    );
  } catch (err) {
    console.error(`Error in handleAirtimeNetworkSelected [${platform}]:`, err);
    await config.send(senderId, 'An error occurred, please try again. \n\nOr enter X to cancel');
  }
};

/**
 * Handle airtime purchase phone number entry
 */

const handleEnterAirtimePhoneNumber = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA'
) => {
  const config = getPlatformConfig(platform);

  try {
    const input = message.trim().toLowerCase();
    let index: number = 0;

    if (input === 'x') {
      await config.send(senderId, 'Transaction canceld.');
      return await cancelTransaction(senderId, platform, true);
    }
    const numberResult = await getNetworkAndLocalNumber(input);
    // Airtel 9mobile MTN Glo

    const selectionMap: Record<string, number> = { MTN: 1, Glo: 2, '9mobile': 3, Airtel: 4 };

    if (!selectionMap[numberResult.network]) {
      await config.send(senderId, 'Invalid phone number.');
      return await config.send(
        senderId,
        'Enter phone number for airtime purcahse: \n\nEnter X to cancel.'
      );
    }

    await config.send(
      senderId,
      `Enter ${numberResult.network} airtime amount:  \n\nEnter X to cancel.`
    );

    await config.model.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterAirtimeAmount',
          'purchasePayload.phoneNumber': numberResult.number,
          'purchasePayload.transactionType': 'airtime',
          'purchasePayload.network': numberResult.network,
          'purchasePayload.networkID': selectionMap[numberResult.network],
        },
      }
    );
  } catch (err) {
    console.error('An error occured in >>>>>>>>>>>>>>>>>>>>>.handleEnterAirtimePhoneNumber ', err);
    await config.send(senderId, 'Something went wrong.');
    config.send(senderId, 'Enter phone number for Airtime purcahse: \n\nEnter X to cancel.');
  }
};

/**
 * Handle amount entry
 */
const handleEnterAirtimeAmount = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);

  try {
    const input = message.trim().toLowerCase();

    if (input === 'x') {
      await config.send(senderId, 'Tranction canceled.');
      return cancelTransaction(senderId, platform, true);
    }

    const amountValid = await validateAmount(input);
    if (!amountValid) {
      return config.send(
        senderId,
        'Invalid amount entered.\nAirtime amount should be at least ₦100. \n\nEnter X to cancel.'
      );
    }

    await config.model.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'confirmProductPurchase',
          'purchasePayload.price': parseFloat(input),
          'purchasePayload.product': `₦${input} ${user?.purchasePayload?.network} airtime.`,
        },
      }
    );
    await confirmProductPurchaseResponse(senderId, platform);
  } catch (err) {
    console.error(`Error in handleEnterAirtimeAmount [${platform}]:`, err);
    await config.send(
      senderId,
      'An error occurred. \n\nAirtime amount should be at least ₦100. \n\nEnter X to cancel.please try again.'
    );
  }
};

export {
  handleBuyAirtime,
  handleAirtimeNetworkSelected,
  handleEnterAirtimeAmount,
  handleEnterAirtimePhoneNumber,
};
