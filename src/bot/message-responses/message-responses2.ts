import BotUsers from '../../models/fb_bot_users';
import { confirmDataPurchaseResponse } from '../modules/buy-data';
import { sendMessage } from '../modules/send_message';
import { generateAccountNumber } from './generic';

const handleSelectPaymentMethod = async (event: any, transactNum: any) => {
  const senderId = event.sender.id;

  try {
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
      // await generateAccountNumber(event, transactNum);
      const user = await BotUsers.findOneAndUpdate(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } }
      );
      await sendMessage(senderId, {
        text: 'Creation of one time account is currently not available. \nKindly create a permanent account to proceed  with purchase.',
      });
      await confirmDataPurchaseResponse(senderId, user, null);
      return;
    }

    await sendMessage(senderId, { text: 'Invalid response recieved.' });
    sendMessage(senderId, {
      text:
        'Select Payment method. \n\nA. Create a virtual account for quick and hassle-free future payments.' +
        ' \n\nB. Use a one-time account number for this transaction only. \n\nEnter X to cancle.',
    });
  } catch (err: any) {
    sendMessage(senderId, { text: 'An error occured please try again.' });
    sendMessage(senderId, {
      text:
        'Select Payment method. \n\nA. Create a virtual account for quick and hassle-free future payments.' +
        ' \n\nB. Use a one-time account number for this transaction only. \n\nEnter X to cancle.',
    });
    console.error('An error occured in handleSelectPaymentMethod: ', err);
  }
};

export { handleSelectPaymentMethod };
