import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import { defaultTextW } from '../message-responses/generic';
import PaymentAccounts from '../../../models/payment-accounts';
import { remindToFundWalletW } from '../helper_functions';
import { defaaultMessageW } from '../message-responses/message_responses';
import { makePurchase } from '../../../modules/v-account-make-purcchase';
import sendMessageW from '../send_message_w';

// function to response to newConversations
async function sendNewConversationResponseW(messageObj: any) {
  const senderId = messageObj.from;
  const date = new Date();
  const user = await WhatsappBotUsers.findOne({ id: senderId });

  if (!user) {
    // await sendMessageW(
    //   senderId,
    //   '🌟 *Welcome to BotSub!* 🌟\n\n' +
    //     '🎁 *Limited-Time Offer:*\n' +
    //     'Be among the first 200 users to complete *3 data purchases* this month and get *3GB FREE*!\n\n' +
    //     '⏳ Hurry - bonuses are claimed fast! 🚀'
    // );

    await sendMessageW(
      senderId,
      '🌟 *Welcome to BotSub!* 🌟\n\n' +
        'Now you can buy data and airtime right here in WhatsApp! 📱\n\n' +
        'No app to download • No hassle • Pure convenience\n\n' +
        'Ready to get started? 🚀'
    );
    await sendMessageW(
      senderId,
      'Save this number as *BotSub* in your contacts\n\nReply *DONE* to continue'
    );

    // adding new botuser
    const newBotUser = new WhatsappBotUsers({
      id: senderId,
      transactNum: 0,
      botResponse: true,
      nextAction: null,
      referrer: 0,
      firstPurchase: true,
      lastMessage: date,
      createdAt: date,
    });

    newBotUser.save();
  }
} // end of newConversationResponse

export { sendNewConversationResponseW };
