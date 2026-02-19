import fs from 'fs';
import { sendMessage } from '../fb_bot/modules/send_message';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { networkDetailsType } from '../../types/bot/module-buy-data-types';
import { DEFAULT_MESSAGE } from './send_message_generic';
/**
 * Platform Configuration Resolver
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  isFB: platform === 'FB',
});

/**
 * UNIFIED: Show Data Prices
 * Replaces platform-specific price display functions
 */
const showDataPrices = async (senderId: string, platform: 'FB' | 'WA', transactNum: number) => {
  const config = getPlatformConfig(platform);

  try {
    const dataDetailString = await fs.promises.readFile('files/data-details.json', 'utf-8');
    const dataDetails: { [key: string]: networkDetailsType } = JSON.parse(dataDetailString);

    const networkIDs = Object.keys(dataDetails);

    for (const networkID of networkIDs) {
      const plans = dataDetails[networkID];
      const planIndices = Object.keys(plans);

      // Header for specific network (e.g., MTN data offers)
      let text = `*${plans['1'].network}* data offers \n`;

      for (const index of planIndices) {
        const plan = plans[index];
        const finalPrice = plan.price;

        text += `\n ${index}. ${plan.size} ₦${finalPrice} Validity - ${plan.validity}`;
      }

      // Send the formatted list for this network
      await config.send(senderId, text);
    }

    // Return to main menu/default prompt
    await config.send(senderId, DEFAULT_MESSAGE);
  } catch (err) {
    console.error(`An error occurred in showDataPrices [${platform}]:`, err);
    await config.send(senderId, 'An error occurred fetching data prices.');
    await config.send(senderId, DEFAULT_MESSAGE);
  }
};

export { showDataPrices };
