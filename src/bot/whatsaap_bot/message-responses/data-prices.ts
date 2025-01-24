import { networkDetailsType } from '../../../types/bot/module-buy-data-types';
import { computeDiscount } from '../../modules/helper_function_2';
import sendMessageW from '../send_message_w';
import { defaultTextW } from './generic';
import fs from 'fs';

const showDataPricesW = async (messageObj: any, transactNum: number) => {
  const senderId = messageObj.from;
  const discount = computeDiscount(transactNum);

  try {
    const dataDetailString: any = await fs.promises.readFile('files/data-details.json', 'utf-8');
    const dataDetails: { [key: string]: networkDetailsType } = JSON.parse(dataDetailString);
    const length = Object.keys(dataDetails).length;

    for (let i = 1; i < length + 1; i++) {
      const lenght = Object.keys(dataDetails[i]).length;
      let text = `${dataDetails[i]['1'].network} data offers \n`;

      for (let j = 1; j < lenght + 1; j++) {
        text += `\n ${j}. ${dataDetails[i][j].size} ₦${dataDetails[i][j].price - discount} ${
          dataDetails[i][j].validity
        }`;
      }

      await sendMessageW(senderId, text);
    }
    await sendMessageW(senderId, defaultTextW);
  } catch (err) {
    console.error('An error occured in showDataPrices', err);
    await sendMessageW(senderId, 'An error occured.');
    await sendMessageW(senderId, defaultTextW);
  }
};

export { showDataPricesW };
