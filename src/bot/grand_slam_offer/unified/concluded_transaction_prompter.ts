import { isSameMonth } from 'date-fns';
import { BotUserType } from '../daily_participation_reminder';

// Models
import FBBotUsers from '../../../models/fb_bot_users';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';

// Helpers
import { sendMessage as sendMessageFB } from '../../fb_bot/modules/send_message';
import sendMessageW from '../../whatsaap_bot/send_message_w';
import {
  addNew3GBWinner,
  getCurrentNumberOfWinners,
  totalAcceptableWinners,
} from './number_of_winners_logic';

type Platform = 'FB' | 'WA';

// --- Platform Configuration ---
const getPlatformConfig = (user: BotUserType, platform: Platform) => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send:
    platform === 'FB'
      ? (id: string, txt: string) => sendMessageFB(id, { text: txt })
      : (id: string, txt: string) => sendMessageW(id, txt),
  addWinner: () => addNew3GBWinner(user, platform),
  getWinners: () => getCurrentNumberOfWinners(platform),
  totalWinners: totalAcceptableWinners,
});

/**
 * Main Unified Transaction End Logic
 */
export const TransactionEndGrandSlamOfferReminder = async (
  user: BotUserType,
  platform: Platform
) => {
  const config = getPlatformConfig(user, platform);

  try {
    const currentNumberOfWinners = config.getWinners();
    const slotsAvailable = currentNumberOfWinners < config.totalWinners;

    // Validate month and get current transaction count
    const userMonthValid = await validateUserTransactionMonth(user, platform);
    const transactionCount =
      userMonthValid && user.numberOfTransactionForMonth ? user.numberOfTransactionForMonth + 1 : 1;

    // Increment count in DB if month is valid
    if (userMonthValid) {
      await config.model.updateOne(
        { id: user.id },
        { $inc: { numberOfTransactionForMonth: 1 } },
        { upsert: true }
      );
    }

    // Logic Tree (Following FB Logic Priority)
    if (transactionCount === 3 && slotsAvailable) {
      await handleQualifiedWinner(user, platform);
    } else if (transactionCount < 3 && slotsAvailable) {
      await handlePotentialWinner(user, transactionCount, currentNumberOfWinners, platform);
    } else if (transactionCount === 3 && !slotsAvailable) {
      await handleLateQualifier(user, currentNumberOfWinners, platform);
    }
  } catch (error) {
    console.error(`Error processing ${platform} offer reminder for user ${user.id}:`, error);
  }
};

// --- Handlers ---

export const validateUserTransactionMonth = async (
  user: BotUserType,
  platform: Platform
): Promise<boolean> => {
  const config = getPlatformConfig(user, platform);
  const currentDate = new Date();
  const isCurrentMonth = isSameMonth(new Date(user.monthOfTransaction), currentDate);

  if (!isCurrentMonth) {
    await config.model.updateOne(
      { id: user.id },
      {
        $set: {
          monthOfTransaction: currentDate,
          numberOfTransactionForMonth: 0,
        },
      }
    );
  }
  return isCurrentMonth;
};

async function handleQualifiedWinner(user: BotUserType, platform: Platform) {
  const config = getPlatformConfig(user, platform);
  await config.addWinner();

  const msg = `Congratulations!!! \n\nYou're among the first ${config.totalWinners} to make 3 data purchases this month. You've been granted Free 3GB. \n\nEnter C to claim your free 3GB.`;
  await config.send(user.id, msg);
}

async function handlePotentialWinner(
  user: BotUserType,
  count: number,
  currentWinners: number,
  platform: Platform
) {
  const config = getPlatformConfig(user, platform);
  const remaining = 3 - count;
  const remainingSlots = config.totalWinners - currentWinners;

  const msg = `Make ${remaining} more data purchase${
    remaining > 1 ? 's' : ''
  } to get free 3GB. \n\n${currentWinners} people have been gifted - only ${remainingSlots} spot${
    remainingSlots !== 1 ? 's' : ''
  } remaining. \n\nYou snoope, you loose.`;
  await config.send(user.id, msg);
}

async function handleLateQualifier(user: BotUserType, currentWinners: number, platform: Platform) {
  const config = getPlatformConfig(user, platform);
  const msg = `You made 3 data purchases this month, but ${currentWinners} users already qualified. Be among the first ${config.totalWinners} next month to get free 3GB.`;
  await config.send(user.id, msg);
}
