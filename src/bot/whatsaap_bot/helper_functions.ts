import sendMessageW from './send_message_w';
import WhatsaapBotUsers from '../../models/whatsaap_bot_users';
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
    '\n\n A. Make purchase. \n B. Change number. \n C. Change Email \n\n X. cancle transaction';
  await sendMessageW(senderId, message1);

  return WhatsaapBotUsers.updateOne(
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
  await sendMessageW(senderId, 'Sorry your account balance is currently low.');
  await sendMessageW(senderId, `Your current account balance is: ₦${balance}`);
  await sendMessageW(
    senderId,
    `Kindly fund your permanent account with a minimum amount of ₦${Math.abs(amount)}`
  );
  await sendMessageW(senderId, `Bank Name: ${accountDetails.bankName}`);
  await sendMessageW(senderId, `Account Name: ${accountDetails.accountName}`);
  await sendMessageW(senderId, 'Account Number:');
  await sendMessageW(senderId, `${accountDetails.accountNumber}`);
  await sendMessageW(senderId, 'purchase would be automatically made once account is funded.');
  await sendMessageW(senderId, 'Enter X to cancle auto delivering on wallet funding.');
  await WhatsaapBotUsers.updateOne(
    { id: senderId },
    { $set: { 'purchasePayload.outStanding': true, 'purchasePayload.platform': 'whatsapp' } }
  );
} // end of remind to fund wallet

// function to chanege email b4 transaction
async function changeMailBeforeTransactW(messageObj: any) {
  const senderId = messageObj.sender.id;
  const user = await WhatsaapBotUsers.findOne({ id: senderId });
  // @ts-expect-error
  if (user.purchasePayload.$isEmpty()) {
    noTransactFoundW(senderId);
    // updating database
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
    return;
  }

  await sendMessageW(senderId, 'Enter new email \n\nEnter X to cancle');
  await WhatsaapBotUsers.updateOne(
    { id: senderId },
    {
      $set: { nextAction: 'changeEmailBeforeTransact' },
    }
  );
} // end of changeMailBeforeTransact

// function to change phone numbe before making purhase
async function changePhoneBeforeTransactionW(messageObj: any) {
  const senderId = messageObj.sender.id;
  const user = await WhatsaapBotUsers.findOne({ id: senderId });

  // @ts-expect-error
  if (user.purchasePayload.$isEmpty()) {
    noTransactFoundW(senderId);
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
    return;
  }

  await sendMessageW(senderId, 'Enter new phone number \n\nEnter X to cancle');
  await WhatsaapBotUsers.updateOne(
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

export {
  confirmDataPurchaseResponseW,
  remindToFundWalletW,
  changePhoneBeforeTransactionW,
  handleDataNetworkNotAvailableW,
};
