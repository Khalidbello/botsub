import BotUsers from '../../models/fb_bot_users';
import { confirmDataPurchaseResponse } from '../modules/buy-data';
import { sendMessage } from '../modules/send_message';
import { generateAccountNumber } from './generic';

const handleSelectPaymentMethod = async (event: any, transactNum: any) => {
  try {
    const senderId = event.sender.id;
    const message = event.message.text.trim().toLowerCase();

    if (message === 'x') {
      const user = await BotUsers.findOneAndUpdate(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } }
      );
      await sendMessage(senderId, { text: 'Payment method selection cancled.' });
      await confirmDataPurchaseResponse(senderId, user, null);
      return;
    }
    if (message === 'a') {
      sendMessage(senderId, {
        text: ' Kindly enter your BVN to create a permanent account number. \n\nYour BVN is required in compliance with CBN regulation. \n\nEnter X to quit.',
      });
      await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterBvn' } });
    }
    if (message === 'b') {
      await generateAccountNumber(event, transactNum);
      return;
    }
  } catch (err: any) {
    console.error('An error occured in handleSelectPaymentMethod: ', err);
  }
};

export { handleSelectPaymentMethod };
