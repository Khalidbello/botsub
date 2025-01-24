import { networkDetailsType } from '../../../types/bot/module-buy-data-types';
import { computeDiscount } from '../../modules/helper_function_2';
import { sendMessage } from '../../modules/send_message';
import { defaultText } from './generic';
import fs from 'fs';

const showDataPrices = async (event: any, transactNum: number) => {
  const senderId = event.sender.id;
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

      await sendMessage(senderId, { text: text });
    }
    await sendMessage(senderId, { text: defaultText });
  } catch (err) {
    console.error('An error occured in showDataPrices', err);
    await sendMessage(senderId, { text: 'An error occured.' });
    await sendMessage(senderId, { text: defaultText });
  }
};

export { showDataPrices };
