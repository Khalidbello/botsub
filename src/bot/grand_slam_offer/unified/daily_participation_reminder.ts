import FBBotUsers from '../../../models/fb_bot_users';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import { sendMessage as sendMessageFB } from '../../fb_bot/modules/send_message';
import sendMessageW from '../../whatsaap_bot/send_message_w';
import { BotUserType } from '../daily_participation_reminder';
import { validateUserTransactionMonth } from './concluded_transaction_prompter';
import { getCurrentNumberOfWinners, totalAcceptableWinners } from './number_of_winners_logic';
import { isSameMonth, subMonths } from 'date-fns';

type Platform = 'FB' | 'WA';

// --- Platform Configuration Mapping ---
const getPlatformConfig = (user: BotUserType, platform: Platform) => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send:
    platform === 'FB'
      ? (id: string, text: string) => sendMessageFB(id, { text })
      : (id: string, text: string) => sendMessageW(id, text),
  validate: () => validateUserTransactionMonth(user, platform),
  getWinners: (): number => getCurrentNumberOfWinners(platform),
  totalWinners: totalAcceptableWinners,
});

// --- Unified Main Function ---
export const free3gbParticipationReminder = async (user: BotUserType, platform: Platform) => {
  const config = getPlatformConfig(user, platform);

  try {
    const currentDate = new Date();
    const isThisMonthTransCount = await config.validate();
    const transactionCount = isThisMonthTransCount ? user.numberOfTransactionForMonth || 0 : 0;

    const numberOfWinners = config.getWinners();
    const hasWonLastMonth = isPreviousMonth(new Date(user.win || 0), currentDate);
    const hasMessagedThisMonth = isSameMonth(new Date(user.lastOfferReminder), currentDate);

    // 1. New month notification
    if (!hasMessagedThisMonth) {
      await handleNewMonthNotification(user, hasWonLastMonth, numberOfWinners, config);
      return;
    }

    // 2. Winner reminder
    if (isCurrentMonthWinner(user, currentDate)) {
      await handleWinnerReminder(user, currentDate, config);
      return;
    }

    // 3. Pool availability notifications
    if (numberOfWinners < config.totalWinners && transactionCount < 3) {
      await handlePoolAvailableNotification(user, transactionCount, config);
      return;
    }

    // 4. Missed opportunity
    if (hasMissedOpportunity(user, currentDate)) {
      await handleMissedOpportunityNotification(user, config);
    }
  } catch (error) {
    console.error(`Error processing ${platform} reminders for user ${user.id}:`, error);
  }
};

// --- Combined Handlers ---

const handleNewMonthNotification = async (
  user: BotUserType,
  wonLastMonth: boolean,
  currentWinners: number,
  config: any
) => {
  const { totalWinners, send } = config;
  const message = wonLastMonth
    ? currentWinners < totalWinners
      ? `You won free 3GB last month! You won because you took action. \n\nBe among the first ${totalWinners} to make 3 data purchases this month and win again!`
      : `You won last month but missed this month. ${totalWinners} users already qualified. \n\nTry again next month, be among the first ${totalWinners} users to make 3 data purchases and win!`
    : currentWinners < totalWinners
    ? `Get free 3GB when you make 3 data purchase of 1GB and above this month. \n\nBe among the first ${totalWinners} people to do this to qualify.`
    : `You have missed this month free 3GB for first ${totalWinners} users to make 3 data purchases. \nYou get another chance next month, don't miss out.`;

  await send(user.id, message);
  await updateDatabaseField(user.id, { lastOfferReminder: new Date() }, config.model);
};

const handleWinnerReminder = async (user: BotUserType, currentDate: Date, config: any) => {
  const today = currentDate.getDate();
  const hasClaimedThisMonth = isSameMonth(new Date(user.claimed || 0), currentDate);

  if (today < 20) {
    await config.send(
      user.id,
      `Don't forget to claim your free 3GB. \n\nClaiming for the free 3GB starts on the 20th of this month. \n\nCongratulations.`
    );
    return;
  }

  if (!hasClaimedThisMonth) {
    const claimMsg = 'You can now claim your free 3GB. \n\nEnter C to claim.';
    await config.send(user.id, claimMsg);
  }
};

const handlePoolAvailableNotification = async (
  user: BotUserType,
  transactionCount: number,
  config: any
) => {
  const remaining = config.totalWinners - config.getWinners();
  let message = '';

  if (transactionCount === 0) {
    message = `Get 3GB free! \n\nBe one of the next ${remaining} out of ${config.totalWinners} people to make 3 data purchases of 1GB and above this month to claim your reward.`;
  } else {
    const additional = 3 - transactionCount;
    message = `Get 3GB free! \n\nnly ${remaining} spots left out of ${
      config.totalWinners
    }, make just ${additional} more data purchase${
      additional > 1 ? 's' : ''
    } of 1GB and above this month to claim your reward.`;
  }

  await config.send(user.id, message);
  await updateDatabaseField(user.id, { lastOfferReminder: new Date() }, config.model);
};

const handleMissedOpportunityNotification = async (user: BotUserType, config: any) => {
  await config.send(
    user.id,
    `Free 3GB missed! Don’t let it happen again. \n\nBe among the first ${config.totalWinners} to make 3 data purchases (1GB+) next month to secure your reward.`
  );
  await updateDatabaseField(user.id, { lastLostOfferReminder: new Date() }, config.model);
};

// --- Helpers ---

const updateDatabaseField = async (userId: string, update: object, model: any) => {
  try {
    await model.updateOne({ id: userId }, { $set: update }, { upsert: true });
  } catch (error) {
    console.error(`DB Update Error:`, error);
  }
};

const isPreviousMonth = (date: Date, currentDate: Date) =>
  isSameMonth(date, subMonths(currentDate, 1));
const isCurrentMonthWinner = (user: BotUserType, date: Date) =>
  user.win && isSameMonth(new Date(user.win), date);
const hasMissedOpportunity = (user: BotUserType, date: Date) =>
  !isSameMonth(new Date(user.lastLostOfferReminder), date);
