import sendMessageW from './send_message_w';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { noTransactFoundW } from './message-responses/generic';

// function to form product response
async function confirmDataPurchaseResponseW(senderId: string, user: any, phoneNumber: any) {
  const message1 =
    'Product: ' +
    user?.purchasePayload?.product +
    '\nNetwork: ' +
    user?.purchasePayload?.network +
    '\nPrice: ' +
    '₦' +
    user?.purchasePayload?.price +
    '\nPhone Number: ' +
    (phoneNumber ? phoneNumber : user?.purchasePayload?.phoneNumber) +
    '\nEmail: ' +
    user?.email +
    '\n\n A. Make purchase. \n B. Change number. \n C. Change Email \n\n X. cancel transaction';
  await sendMessageW(senderId, message1);

  return WhatsappBotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'confirmProductPurchase' },
    }
  );
} // confirmPurchaseTemplate

// function to remind user to fund wallet
async function remindToFundWalletW(
  senderId: string,
  amount: number,
  balance: number,
  accountDetails: any
) {
  await sendMessageW(
    senderId,
    `Sorry your account balance is currently low. \n\nYour current account balance is: ₦${balance} \n\nKindly fund your permanent account with a minimum amount of ₦${Math.abs(
      amount
    )} \n\nBank Name: ${accountDetails.bankName} \nAccount Name: ${
      accountDetails.accountName
    } \nAccount Number:`
  );
  await sendMessageW(senderId, `${accountDetails.accountNumber}`);
  await sendMessageW(
    senderId,
    'purchase would be automatically made once account is funded. \n\nEnter X to cancel auto delivering on wallet funding.'
  );
  await WhatsappBotUsers.updateOne(
    { id: senderId },
    { $set: { 'purchasePayload.outStanding': true, 'purchasePayload.platform': 'whatsapp' } }
  );
} // end of remind to fund wallet

// function to chanege email b4 transaction
async function changeMailBeforeTransactW(messageObj: any) {
  const senderId = messageObj.from;
  const user = await WhatsappBotUsers.findOne({ id: senderId });
  // @ts-expect-error
  if (user.purchasePayload.$isEmpty()) {
    noTransactFoundW(senderId);
    // updating database
    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
    return;
  }

  await sendMessageW(senderId, 'Enter new email \n\nEnter X to cancel');
  await WhatsappBotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'changeEmailBeforeTransact' },
    }
  );
} // end of changeMailBeforeTransact

// function to change phone numbe before making purhase
async function changePhoneBeforeTransactionW(messageObj: any) {
  const senderId = messageObj.from;
  const user = await WhatsappBotUsers.findOne({ id: senderId });

  // @ts-expect-error
  if (user.purchasePayload.$isEmpty()) {
    noTransactFoundW(senderId);
    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
    return;
  }

  await sendMessageW(senderId, 'Enter new phone number \n\nEnter X to cancel');
  await WhatsappBotUsers.updateOne(
    { id: senderId },
    { $set: { nextAction: 'changePhoneNumberBeforeTransact' } }
  );
} // end of  changeNumber

// function to  handle network not available requests
async function handleDataNetworkNotAvailableW(senderId: string, network: string) {
  await sendMessageW(
    senderId,
    `Sorry ${network} network is not available at the moment. \nPlease try again later.`
  );
}

// function to increase the number of transaction the user has carried out
const updateTransactNumW = async (userId: string): Promise<boolean> => {
  try {
    console.log('in updateTransactNum::::::::::::::::::::::::;', userId);
    const incresee = await WhatsappBotUsers.updateOne({ id: userId }, { $inc: { transactNum: 1 } });
    console.log('User transation number incresed for whatsapp users : ', incresee);
    return true;
  } catch (err) {
    console.error('AN error occured in updating user transactNum', err);
    return false;
  }
};

// fucntiion to save userslast message date
const updateLastMesageDateW = async (senderId: string) => {
  const date = new Date();
  const resposne = await WhatsappBotUsers.updateOne(
    { id: senderId },
    { $set: { lastMessage: date } }
  );
  console.log('message update response::::: ', resposne);
};

// function to check is window is still open to send user a message
const isConversationOpenW = async (senderId: string) => {
  try {
    const result = await WhatsappBotUsers.findOne({ id: senderId }).select('lastMessage');
    // @ts-expect-error result won'tbe null
    const lastMessageDate = new Date(result.lastMessage);
    const nowDate = new Date();

    const millisecondsIn24Hours = 24 * 60 * 60 * 1000;
    const difference = Math.abs(nowDate.getTime() - lastMessageDate.getTime());
    console.log('time difference in isConversationOpenW : ', difference);

    return difference < millisecondsIn24Hours;
  } catch (err) {
    console.error('An error occured in isConversationOpenW:  ', err);
    return false;
  }
};

function isDateGreaterThan10Minutes(date: Date): boolean {
  const currentDate = new Date();
  const tenMinutesInMilliseconds = 10 * 60 * 1000;
  const difference = Math.abs(currentDate.getTime() - date.getTime());

  //console.log('in time checker', currentDate, difference, tenMinutesInMilliseconds);

  return difference > tenMinutesInMilliseconds;
}

export {
  confirmDataPurchaseResponseW,
  remindToFundWalletW,
  changePhoneBeforeTransactionW,
  handleDataNetworkNotAvailableW,
  changeMailBeforeTransactW,
  updateTransactNumW,
  updateLastMesageDateW,
  isConversationOpenW,
  isDateGreaterThan10Minutes,
};
