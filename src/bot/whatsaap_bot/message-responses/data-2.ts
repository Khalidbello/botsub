import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import {
  changeMailBeforeTransactW,
  changePhoneBeforeTransactionW,
  confirmDataPurchaseResponseW,
} from '../helper_functions';
import sendMessageW from '../send_message_w';
import { cancelTransactionW, selectPurchaseMethodW } from './generic';

const handleConfirmProductPurchaseW = async (messageObj: any, transactNum: number) => {
  const senderId = messageObj.from;
  const message: string = messageObj?.text?.body.toLowerCase();

  try {
    if (message === 'x') return cancelTransactionW(senderId, false);

    const user = await WhatsappBotUsers.findOne({ id: senderId });

    if (message === 'a') return selectPurchaseMethodW(messageObj, transactNum);
    if (message === 'b') return changePhoneBeforeTransactionW(messageObj);
    if (message === 'c') return changeMailBeforeTransactW(messageObj);

    await sendMessageW(senderId, 'Invalid response recieved.');
    confirmDataPurchaseResponseW(senderId, user, null);
  } catch (err) {
    console.error('An error occured in phoneNumberEntred', err);
    sendMessageW(senderId, 'An error occured plase enter resposne again.  \n\n Enter X to cancel');
  }
};

export { handleConfirmProductPurchaseW };
