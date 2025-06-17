import FBBotUsers from '../../../models/fb_bot_users';
import { sendMessage } from '../../modules/send_message';
import { BotUserType } from './daily_participation_reminder_fb';
import {
  addNew3GBWinnerFB,
  getCurrentNumberOfWinners,
  totalAcceptableWinners,
} from './number_of_winners_logic_fb';
import { isSameMonth } from 'date-fns';

interface User {
  id: string;
  monthOfTransaction: Date;
  numberOfTransactionForMonth: number;
}

const TransactionEndGrandSlamOfferReminderFB = async (user: BotUserType) => {
  try {
    const currentNumberOfWinners = getCurrentNumberOfWinners();
    const slotsAvailable = currentNumberOfWinners < totalAcceptableWinners;
    const userMonthValid = await validateUserTransactionMonth(user.monthOfTransaction, user.id);
    const transactionCount =
      userMonthValid && user.numberOfTransactionForMonth ? user.numberOfTransactionForMonth + 1 : 1;

    if (userMonthValid) {
      await FBBotUsers.updateOne(
        { id: user.id },
        { $inc: { numberOfTransactionForMonth: 1 } },
        { upsert: true }
      );
    }

    if (transactionCount === 3 && slotsAvailable) {
      await handleQualifiedWinner(user, currentNumberOfWinners);
    } else if (transactionCount < 3 && slotsAvailable) {
      await handlePotentialWinner(user, transactionCount, currentNumberOfWinners);
    } else if (transactionCount === 3 && !slotsAvailable) {
      await handleLateQualifier(user, currentNumberOfWinners);
    }
  } catch (error) {
    console.error(`Error processing offer reminder for user ${user.id}:`, error);
  }
};

/**
 * Checks if user's transaction month is current month, updates if not
 * @param validateUserTransactionMonth User's current transaction month
 * @param userId User ID for database update
 * @returns Promise<boolean> True if month is current, false if updated
 */
async function validateUserTransactionMonth(
  monthOfTransaction: Date,
  userId: string
): Promise<boolean> {
  const currentDate = new Date();
  const isCurrentMonth = isSameMonth(new Date(monthOfTransaction), currentDate);
  console.log(
    'Is currnt monrht in validateUserTransactionMonth: ',
    isCurrentMonth,
    new Date(monthOfTransaction),
    monthOfTransaction,
    userId
  );

  if (!isCurrentMonth) {
    const result = await FBBotUsers.updateOne(
      { id: userId },
      {
        $set: {
          monthOfTransaction: currentDate,
          numberOfTransactionForMonth: 0, // Reset counter for new month
        },
      }
    );
    console.log('result in validateUserTransactionMonth: ', result);
  }

  return isCurrentMonth;
}

/**
 * Handles users who qualified for the bonus
 */
async function handleQualifiedWinner(user: BotUserType, currentWinners: number) {
  await addNew3GBWinnerFB(user);
  await sendMessage(user.id, {
    text:
      `Congratulations!!! \n\nYou're among the first ${totalAcceptableWinners} ` +
      `to make 3 data purchases this month. You've been granted Free 3GB. ` +
      `\n\nEnter C to claim your free 3GB.`,
  });
}

/**
 * Handles users who could still qualify
 */
async function handlePotentialWinner(
  user: BotUserType,
  transactionCount: number,
  currentWinners: number
) {
  const remainingTransactions = 3 - transactionCount;
  const remainingSlots = totalAcceptableWinners - currentWinners;

  await sendMessage(user.id, {
    text:
      `Make ${remainingTransactions} more data purchase${remainingTransactions > 1 ? 's' : ''} ` +
      `to get free 3GB. \n\n${currentWinners} people have been gifted - only ` +
      `${remainingSlots} spot${remainingSlots > 1 ? 's' : ''} remaining. ` +
      `Take action and be rewarded.`,
  });
}

/**
 * Handles users who qualified but too late
 */
async function handleLateQualifier(user: BotUserType, currentWinners: number) {
  await sendMessage(user.id, {
    text:
      `You made 3 data purchases this month, but ${currentWinners} users ` +
      `already qualified. Be among the first ${totalAcceptableWinners} next ` +
      `month to get free 3GB.`,
  });
}

export { TransactionEndGrandSlamOfferReminderFB, validateUserTransactionMonth }; // Only export the main function
