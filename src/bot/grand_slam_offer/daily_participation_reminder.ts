import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { isSameMonth, subMonths } from 'date-fns';
import {
  getCurrentNumberOfWinners,
  totalAcceptableWinners,
} from './facebook/number_of_winners_logic_fb';
import { validateUserTransactionMonth } from './facebook/concluded_transaction_propmpter_fb';

function isPreviousMonth(date: Date, currentDate: Date): boolean {
  const previousMonth = subMonths(currentDate, 1);
  return isSameMonth(date, previousMonth);
}

// Type definitions for better type safety
interface BotUserType {
  email: string;
  id: string;
  lastOfferReminder: Date;
  lastMessage: Date;
  transactNum: number;
  win?: Date;
  claimed?: Date;
  monthOfTransaction: Date;
  lastLostOfferReminder: Date;
  numberOfTransactionForMonth?: number;
  purchasePayload: {
    product: string;
    network: string;
    price: number;
    phoneNumber: string;
    transactionType: string;
    size: string;
    index: string;
    planID: number;
    networkID: number;
    refereeId: number;
    outStanding: boolean;
    platform: string;
    free3GBNetwork: string;
    free3GBPhoneNumber: string;
    free3GBNetworkId: number;
    free3GBPlanId: number;
  };
  withdrawalData: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
    amount: number;
    bank: { id: number; code: string; name: string };
    bankListing: [{ id: number; code: string; name: string }];
  };
}

// Sends appropriate reminder messages to users about free 3GB offers
// @param user The user to send reminders to

const free3gbParticipationReminderW = async (user: BotUserType) => {
  try {
    const currentDate = new Date();
    const isThisMOnthTransCount = await validateUserTransactionMonth(
      user.monthOfTransaction,
      user.id
    );
    const transactionCount = isThisMOnthTransCount ? user.numberOfTransactionForMonth : 0;
    const numberOfWinners = getCurrentNumberOfWinners();
    const hasWonLastMonth = isPreviousMonth(new Date(user.win || 0), currentDate);
    const hasMessagedThisMonth = isSameMonth(new Date(user.lastMessage), currentDate);

    // Handle new month scenario if user hasn't messaged this month
    if (!hasMessagedThisMonth) {
      await handleNewMonthNotification(user, hasWonLastMonth, numberOfWinners);
      return;
    }

    // Check if user is current month winner
    if (isCurrentMonthWinner(user, currentDate)) {
      await handleWinnerReminder(user, currentDate);
      return;
    }

    // Handle pool availability notifications
    if (numberOfWinners < totalAcceptableWinners && (transactionCount ? transactionCount : 0) < 3) {
      await handlePoolAvailableNotification(user, transactionCount as number);
      return;
    }

    // Notify about missed opportunity
    if (hasMissedOpportunity(user, currentDate)) {
      await handleMissedOpportunityNotification(user);
    }
  } catch (error) {
    console.error(`Error processing reminders for user ${user.id}:`, error);
    // Optionally send error notification or implement retry logic
  }
};

// Handles notifications for new month scenario
const handleNewMonthNotification = async (
  user: BotUserType,
  wonLastMonth: boolean,
  currentWinners: number
) => {
  const message = wonLastMonth
    ? currentWinners < totalAcceptableWinners
      ? 'You won free 3GB last month! You won because you took action. \n\nMake three data transactions this month for another chance to win!'
      : `You won last month but missed this month. ${totalAcceptableWinners} users already qualified. Try next month!`
    : currentWinners < totalAcceptableWinners
    ? 'Make three data transactions this month for a chance to win free 3GB!'
    : 'You have missed this month free 3GB for first 200 users to make 3 purchases.';

  if (message) {
    await sendMessageW(user.id, message);
  }
  await updateLastPrompt(user.id);
};

//Handles reminders for current month winners
const handleWinnerReminder = async (user: BotUserType, currentDate: Date) => {
  const hasClaimed = isSameMonth(new Date(user.claimed || 0), currentDate);

  if (!hasClaimed) {
    await sendMessageW(user.id, "Don't forget to claim your free 3GB! Enter C to claim.");
  }
};

// Handles notifications when pool is still available
const handlePoolAvailableNotification = async (user: BotUserType, transactionCount: number) => {
  await sendMessageW(
    user.id,
    `Only ${totalAcceptableWinners - getCurrentNumberOfWinners()} spots left! Make additonal ${
      3 - transactionCount
    } transactions to be among the first 200 users to make 3 transactiosn and win free 3GB.`
  );
  await updateLastPrompt(user.id);
};

// Handles missed opportunity notifications
const handleMissedOpportunityNotification = async (user: BotUserType) => {
  await sendMessageW(
    user.id,
    "You missed this month's free 3GB offer. Action takers got rewarded!. \n\nYou get another chance next month, be among the action takers."
  );
  await updateLastLossMessageDate(user.id);
};

// Updates the last prompt timestamp for a user
const updateLastPrompt = async (userId: string) => {
  try {
    await WhatsappBotUsers.updateOne(
      { id: userId },
      { $set: { lastOfferReminder: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Failed to update last prompt for user ${userId}:`, error);
    throw error;
  }
};

// Updates the last prompt timestamp for a user
const updateLastLossMessageDate = async (userId: string) => {
  try {
    await WhatsappBotUsers.updateOne(
      { id: userId },
      { $set: { lastLostOfferReminder: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Failed to update last prompt for user ${userId}:`, error);
    throw error;
  }
};

// Helper functions for date comparisons
const isCurrentMonthWinner = (user: BotUserType, date: Date) =>
  user.win && isSameMonth(new Date(user.win), date);

const hasMissedOpportunity = (user: BotUserType, date: Date) => {
  const sameMonth = isSameMonth(new Date(user.lastLostOfferReminder), date);
  return !sameMonth;
};

export { free3gbParticipationReminderW, BotUserType };
