import FBBotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { sendMessage } from '../fb_bot/modules/send_message';
import sendMessageW from '../whatsaap_bot/send_message_w';

/**
 * Centralized Platform Configuration
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  isFB: platform === 'FB',
});

/**
 * UNIFIED: Send New Conversation Response
 */
export async function sendNewConversationResponse(senderId: string, platform: 'FB' | 'WA') {
  const config = getPlatformConfig(platform);
  const date = new Date();

  try {
    const user = await config.model.findOne({ id: senderId });

    if (!user) {
      // Platform-specific onboarding copy
      if (config.isFB) {
        await config.send(
          senderId,
          '📱 *Welcome to BotSub!*\n\n' +
            'Get data & airtime directly in Facebook!\n\n' +
            '✨ Works even on free mode\n' +
            '✨ No app download\n\n' +
            'Make your first purchase today! 🚀'
        );
        await config.send(
          senderId,
          'Below is a list of things i can do: \n\n A. Buy data \n B. Buy airtime. \n C. My account. \n D. Show data prices' +
            '\n E. Report issue. \n\nSupport: https://wa.me/09166871328'
        );
      } else {
        await config.send(
          senderId,
          '🌟 *Welcome to BotSub!* 🌟\n\n' +
            'Now you can buy data and airtime right here in WhatsApp! 📱\n\n' +
            'No app to download • No hassle • Pure convenience\n\n' +
            'Ready to get started? 🚀'
        );
        await config.send(
          senderId,
          'Save this number as *BotSub* in your contacts\n\nReply *DONE* to continue'
        );
      }

      // Create new user record
      const newBotUser = new config.model({
        id: senderId,
        transactNum: 0,
        botResponse: true,
        nextAction: null,
        referrer: 0,
        firstPurchase: true,
        lastMessage: date,
        createdAt: date,
      });

      await newBotUser.save();
      console.log(`New ${platform} user saved: ${senderId}`);
    }
  } catch (err) {
    console.error(`Error in sendNewConversationResponse [${platform}]:`, err);
  }
}
