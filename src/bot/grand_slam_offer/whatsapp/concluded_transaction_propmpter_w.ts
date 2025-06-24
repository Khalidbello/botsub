import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import sendMessageW from '../../whatsaap_bot/send_message_w';
import { BotUserType } from '../daily_participation_reminder';
import {
  addNew3GBWinnerW,
  getCurrentNumberOfWinnersW,
  totalAcceptableWinnersW,
} from './number_of_winners_logic_w';
import { isSameMonth } from 'date-fns';

interface User {
  id: string;
  monthOfTransaction: Date;
  numberOfTransactionForMonth: number;
}

const TransactionEndGrandSlamOfferReminderW = async (user: BotUserType) => {
  try {
    const currentNumberOfWinners = getCurrentNumberOfWinnersW();
    const slotsAvailable = currentNumberOfWinners < totalAcceptableWinnersW;
    const userMonthValid = await validateUserTransactionMonthW(user.monthOfTransaction, user.id);
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
 * @param validateUserTransactionMonthW User's current transaction month
 * @param userId User ID for database update
 * @returns Promise<boolean> True if month is current, false if updated
 */
async function validateUserTransactionMonthW(
  monthOfTransaction: Date,
  userId: string
): Promise<boolean> {
  const currentDate = new Date();
  const isCurrentMonth = isSameMonth(new Date(monthOfTransaction), currentDate);
  console.log(
    'Is currnt monrht in validateUserTransactionMonthW: ',
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
    console.log('result in validateUserTransactionMonthW: ', result);
  }

  return isCurrentMonth;
}

/**
 * Handles users who qualified for the bonus
 */
async function handleQualifiedWinner(user: BotUserType, currentWinners: number) {
  await addNew3GBWinnerW(user);
  await sendMessageW(
    user.id,
    `Congratulations!!! \n\nYou're among the first ${totalAcceptableWinnersW} ` +
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
  const remainingSlots = totalAcceptableWinnersW - currentWinners;

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
      `already qualified. Be among the first ${totalAcceptableWinnersW} next ` +
      `month to get free 3GB.`
  );
}

export { TransactionEndGrandSlamOfferReminderW, validateUserTransactionMonthW }; // Only export the main function
