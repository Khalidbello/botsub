import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import sendMessageW from '../../whatsaap_bot/send_message_w';
import { BotUserType } from './daily_participation_reminder_w';
import {
  addNew3GBWinner,
  getCurrentNumberOfWinners,
  totalAcceptableWinners,
} from './number_of_winners_logic_w';
import { isSameMonth } from 'date-fns';

interface User {
  id: string;
  monthOfTransaction: Date;
  numberOfTransactionForMonth: number;
}

const TransactionEndGrandSlamOfferReminderW = async (user: BotUserType) => {
  try {
    const currentNumberOfWinners = getCurrentNumberOfWinners();
    const slotsAvailable = currentNumberOfWinners < totalAcceptableWinners;
    const userMonthValid = await validateUserTransactionMonth(user.monthOfTransaction, user.id);
    const transactionCount =
      userMonthValid && user.numberOfTransactionForMonth ? user.numberOfTransactionForMonth + 1 : 1;

    if (userMonthValid) {
      await WhatsappBotUsers.updateOne(
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
    const result = await WhatsappBotUsers.updateOne(
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
  await addNew3GBWinner(user);
  await sendMessageW(
    user.id,
    `Congratulations!!! \n\nYou're among the first ${totalAcceptableWinners} ` +
      `to make 3 data purchases this month. You've been granted Free 3GB. ` +
      `\n\nEnter C to claim your free 3GB.`
  );
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

  await sendMessageW(
    user.id,
    `Make ${remainingTransactions} more data purchase${remainingTransactions > 1 ? 's' : ''} ` +
      `to get free 3GB. \n\n${currentWinners} people have been gifted - only ` +
      `${remainingSlots} spot${remainingSlots > 1 ? 's' : ''} remaining. ` +
      `Take action and be rewarded.`
  );
}

/**
 * Handles users who qualified but too late
 */
async function handleLateQualifier(user: BotUserType, currentWinners: number) {
  await sendMessageW(
    user.id,
    `You made 3 data purchases this month, but ${currentWinners} users ` +
      `already qualified. Be among the first ${totalAcceptableWinners} next ` +
      `month to get free 3GB.`
  );
}

export { TransactionEndGrandSlamOfferReminderW, validateUserTransactionMonth }; // Only export the main function
