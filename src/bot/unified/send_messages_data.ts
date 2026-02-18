import fs from 'fs';
import FBBotUsers from '../../models/fb_bot_users';
import { confirmProductPurchaseResponse, validateNumber } from './utility_1';
import { cancelTransaction, mapAlphaToNum } from './utility_2';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { sendMessage } from '../fb_bot/modules/send_message';
import { networkDetailsType } from '../../types/bot/module-buy-data-types';
import { formDataOffers } from './utility_3';

/**
 * Resolves platform-specific dependencies dynamically
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: async (id: string, text: string) => {
    return platform === 'FB' ? await sendMessage(id, { text }) : await sendMessageW(id, text);
  },
  // You can add the validation/winners logic here as well
});

// Constants
const buyDataText = `Select network for data Purchase \n\n A. MTN \n B. Glo \n C. 9mobile \n D. Airtel \n\n X. cancel`;

/**
 * UNIFIED: Handle Buy Data Initial Command
 */
async function handleBuyData(senderId: string, platform: 'FB' | 'WA') {
  const config = getPlatformConfig(platform);

  await config.send(senderId, buyDataText);
  await config.model.updateOne({ id: senderId }, { $set: { nextAction: 'selectDataNetwork' } });
}

/**
 * UNIFIED: Handle Data Network Selection
 */
const handleDataNetWorkSelected = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  transactNum: number
) => {
  const config = getPlatformConfig(platform);

  try {
    const input = message.trim().toLowerCase();
    let index: number = 0;

    if (input === 'x') {
      await config.send(senderId, 'Tranction canceled.');
      return cancelTransaction(senderId, platform, true);
    }

    let dataDetails = JSON.parse(await fs.promises.readFile('files/data-details.json', 'utf-8'));

    const selectionMap: Record<string, number> = { a: 1, b: 2, c: 3, d: 4 };
    index = selectionMap[input];

    if (!index) {
      await config.send(senderId, 'Invalid response entered.');
      return config.send(senderId, buyDataText);
    }

    const networkDetails: networkDetailsType = dataDetails[index];
    const { network, networkID } = networkDetails['1'];
    const response = await formDataOffers(networkDetails, transactNum);

    if (index === 4) {
      await config.send(
        senderId,
        'For all 7 days offers, ensure the line being recharged has no debt.'
      );
    }

    await config.send(senderId, response);

    await config.model.updateOne(
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
    console.error(`Error in handleDataNetWorkSelected [${platform}]`, err);
    await config.send(senderId, 'An error occurred, please try again. \n\nOr enter X to cancel');
  }
};

/**
 * UNIFIED: Handle Offer Selection
 */
const handleOfferSelected = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  transactNum: number
) => {
  const config = getPlatformConfig(platform);

  try {
    const input = message.trim().toLowerCase();

    if (input === 'x') {
      await config.send(senderId, 'Transaction canceled.');
      return cancelTransaction(senderId, platform, true);
    }

    const user = await config.model.findOne({ id: senderId }).select('purchasePayload');
    const networkID: any = user?.purchasePayload?.networkID;

    let dataDetails = JSON.parse(await fs.promises.readFile('files/data-details.json', 'utf-8'));
    const networkDetails: networkDetailsType = dataDetails[networkID];
    const dataOffer = networkDetails[mapAlphaToNum(input)];

    if (!dataOffer) {
      await config.model.updateOne({ id: senderId }, { $set: { nextAction: 'selectDataNetwork' } });
      return handleDataNetWorkSelected(senderId, message, platform, transactNum);
    }

    await config.send(
      senderId,
      `Enter phone number for ${user?.purchasePayload?.network} data purchase`
    );

    await config.model.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'enterPhoneNumber',
          'purchasePayload.price': dataOffer.price,
          'purchasePayload.size': dataOffer.size,
          'purchasePayload.sizeN': dataOffer.sizeN,
          'purchasePayload.index': dataOffer.index,
          'purchasePayload.planID': dataOffer.planID,
          'purchasePayload.product': `${dataOffer.size} ${dataOffer.network} data`,
          'purchasePayload.transactionType': 'data',
        },
      }
    );
  } catch (err) {
    await config.send(senderId, 'An error occurred. Please enter response again.');
  }
};

/**
 * UNIFIED: Handle Phone Number Entry
 */
const handlePhoneNumberEntered = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA'
) => {
  const config = getPlatformConfig(platform);

  try {
    const input = message.trim();

    if (input.toLowerCase() === 'x') return cancelTransaction(senderId, platform, false);

    const validatedNum = validateNumber(input);
    const user = await config.model.findOne({ id: senderId });

    if (validatedNum) {
      await config.model.updateOne(
        { id: senderId },
        { $set: { 'purchasePayload.phoneNumber': validatedNum } }
      );

      if (user?.email) {
        await config.model.updateOne(
          { id: senderId },
          { $set: { nextAction: 'confirmProductPurchase' } }
        );
        await config.send(senderId, 'Phone number received.');
        // Ensure confirmDataPurchaseResponse is also updated to be platform-agnostic
        return await confirmProductPurchaseResponse(senderId, platform);
      } else {
        await config.send(senderId, 'Please enter your email for the receipt.');
        await config.model.updateOne(
          { id: senderId },
          { $set: { nextAction: 'enterEmailToProceedWithPurchase' } }
        );
        return;
      }
    }

    await config.send(
      senderId,
      'Phone number not valid. \nPlease enter a valid phone number. \nEnter X to cancel.'
    );
  } catch (err) {
    await config.send(senderId, 'An error occurred. Please try again.');
  }
};

export { handleBuyData, handleDataNetWorkSelected, handleOfferSelected, handlePhoneNumberEntered };
