import BotUsers from '../../models/fb_bot_users';
import {
  changeMailBeforeTransact,
  changePhoneBeforeTransaction,
  confirmDataPurchaseResponse,
} from '../modules/buy-data';
import { sendMessage } from '../modules/send_message';
import { cancelTransaction, selectPurchaseMethod } from './generic';

const handleConfirmProductPurchase = async (event: any, transactNum: number) => {
  const senderId = event.sender.id;
  const message: string = event.message.text.trim().toLowerCase();

  try {
    if (message === 'x') return cancelTransaction(senderId, false);

    const user = await BotUsers.findOne({ id: senderId });

    if (message === 'a') return selectPurchaseMethod(event, transactNum);
    if (message === 'b') return changePhoneBeforeTransaction(event);
    if (message === 'c') return changeMailBeforeTransact(event);

    await sendMessage(senderId, { text: 'Invalid response recieved.' });
    confirmDataPurchaseResponse(senderId, user, null);
  } catch (err) {
    console.error('An error occured in phoneNumberEntred', err);
    sendMessage(senderId, {
      text: 'An error occured plase enter resposne again.  \n\n Enter X to cancel',
    });
  }
};

export { handleConfirmProductPurchase };
