import WhatsaapBotUsers from '../../../models/whatsaap_bot_users';
import { defaultTextW } from '../message-responses/generic';
import PaymentAccounts from '../../../models/payment-accounts';
import { remindToFundWalletW } from '../helper_functions';
import { defaaultMessageW } from '../message-responses/message_responses';
import { makePurchase } from '../../../modules/v-account-make-purcchase';
import sendMessageW from '../send_message_w';

// function to response to newConversations
async function sendNewConversationResponseW(messageObj: any) {
  const senderId = messageObj.from;

  // run with out requesting referral code
  await sendMessageW(senderId, 'Hi. \nI am BotSub virtual assitance.');

  const date = new Date();
  const user = await WhatsaapBotUsers.findOne({ id: senderId });

  if (!user) {
    await sendMessageW(
      senderId,
      'Welcome to BotSub, Get data offers for as low as ₦300/GB. \nHurry while it last!'
    );
    // adding new botuser
    const newBotUser = new WhatsaapBotUsers({
      id: senderId,
      transactNum: 0,
      botResponse: true,
      nextAction: null,
      referrer: 0,
      firstPurchase: true,
      lastMessage: date,
    });
    newBotUser.save();
  }

  await sendMessageW(senderId, defaultTextW);
} // end of newConversationResponse

// functin to initiate tranacion for users with virtual account
async function initMakePurchaseW(senderId: any) {
  const userDet = WhatsaapBotUsers.findOne({ id: senderId }).select('purchasePayload email'); // requesting user transacion details
  const userAcount = PaymentAccounts.findOne({ refrence: senderId });
  const promises = [userDet, userAcount];
  const data = await Promise.all(promises);
  // @ts-expect-error
  const purchasePayload = data[0].purchasePayload;
  console.log('purchase ayload in initmakePurchase', purchasePayload);

  if (!purchasePayload?.transactionType) {
    await sendMessageW(senderId, 'No transaction found');
    await sendMessageW(senderId, 'Please intiate a new transaction.');
    await sendMessageW(senderId, defaaultMessageW);
    await WhatsaapBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
    return;
  }

  // @ts-expect-error
  if (purchasePayload.price > data[1].balance)
    return remindToFundWalletW(
      senderId,
      // @ts-expect-error object might be null
      data[1].balance - purchasePayload.price,
      // @ts-expect-error object might be null
      data[1].balance,
      data[1]
    ); // returning function to remind user to fund wallet

  makePurchase(purchasePayload, 'whatsapp', senderId); // calling function to make function
} // end of function to initialise function

export { sendNewConversationResponseW, initMakePurchaseW };
