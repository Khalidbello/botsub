import WhatsaapBotUsers from '../../../models/whatsaap_bot_users';
import { confirmDataPurchaseResponseW } from '../helper_functions';
import sendMessageW from '../send_message_w';
import { generateAccountNumberW } from './generic';

const handleSelectPaymentMethodW = async (messageObj: any, transactNum: any) => {
  const senderId = messageObj.from;

  try {
    const message = messageObj?.text?.body.trim().toLowerCase();

    if (message === 'x') {
      const user = await WhatsaapBotUsers.findOneAndUpdate(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } }
      );
      await sendMessageW(senderId, 'Payment method selection cancled.');
      await confirmDataPurchaseResponseW(senderId, user, null);
      return;
    }

    if (message === 'a') {
      sendMessageW(
        senderId,
        ' Kindly enter your BVN to create a permanent account number. \n\nYour BVN is required in compliance with CBN regulation. \n\nEnter X to quit.'
      );
      await WhatsaapBotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterBvn' } });
      return;
    }

    if (message === 'b') {
      await generateAccountNumberW(messageObj, transactNum);
      // await sendMessageW(senderId, {
      //   text: 'Creation of one-time account is currently not available. \n\nKindly create a permanent account to proceed with transaction.',
      // });
      // sendMessageW(senderId, {
      //   text:
      //     'Select Payment method. \n\nA. Create a Permanent virtual account number. will be used for all future transactions.' +
      //     ' \n\nB. Use a one-time account number. Valid for this transaction only. \n\nEnter X to cancel.',
      // });
      return;
    }

    await sendMessageW(senderId, 'Invalid response recieved.');
    sendMessageW(
      senderId,
      'Select Payment method. \n\nA. Create a permanent account number, will be used for all future transactions.' +
        ' \n\nB. Create a one-time account number for this transaction only. \n\nEnter X to cancel.'
    );
  } catch (err: any) {
    sendMessageW(senderId, 'An error occured please try again.');
    sendMessageW(
      senderId,
      'Select Payment method. \n\nA. Create a permanent account number, will be used for all future transactions.' +
        ' \n\nB. Create a one-time account number for this transaction only. \n\nEnter X to cancel.'
    );
    console.error('An error occured in handleSelectPaymentMethodW: ', err);
  }
};

export { handleSelectPaymentMethodW };
