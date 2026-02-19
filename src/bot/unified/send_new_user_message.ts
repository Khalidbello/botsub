import FBBotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { sendMessage } from '../fb_bot/modules/send_message';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { DEFAULT_MESSAGE } from './send_message_generic';

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
          '📱 Welcome to BotSub! Get data & airtime directly in Facebook!' +
            '\n\n✨ Works even on free mode' +
            '\n\n✨ No app download' +
            '\n\nGet free 3GB when you make 3 data purchases.'
        );

        await config.send(senderId, 'Send Hi to get started.');
      } else {
        await config.send(
          senderId,
          '🌟 *Welcome to BotSub!* 🌟\n\n' +
            'Now you can buy data and airtime right here in WhatsApp! 📱\n\n' +
            '🎁 *Exclusive:* Get 3GB FREE when you make 3 data purchases!\n\n' +
            '📌 Save this number as *BotSub*\n\n' +
            'Once saved, reply done to get started......🚀'
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
