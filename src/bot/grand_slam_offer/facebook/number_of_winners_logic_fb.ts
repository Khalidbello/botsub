import FB3GBWinners from '../../../models/fb_3gb_winners';
import FBBotUsers from '../../../models/fb_bot_users';
import { BotUserType } from './daily_participation_reminder_fb';

// Type definitions
interface User {
  id: number;
  win?: Date;
}

interface WinnerRecord {
  id: number;
  time: Date;
}

// Configuration
const MAX_WINNERS = 200;

// State management with proper typing
let standardWinners = 0;
let numberOfWinners = 190;

// create current month id
const getCurrentMonthId = (date: Date) => {
  const dateId = new Date(date);
  return `${dateId.getFullYear()}-${dateId.getMonth()}`;
};

// Gets the current number of winners
const getCurrentNumberOfWinners = (): number => numberOfWinners;

// Adds a new 3GB winner and updates counts
const addNew3GBWinnerFB = async (user: BotUserType): Promise<void> => {
  try {
    const currentDate = new Date();
    const monthId = getCurrentMonthId(currentDate);

    // Execute updates in parallel for better performance
    const [_, __] = await Promise.all([
      // Mark user as winner
      FBBotUsers.updateOne({ id: user.id }, { $set: { win: currentDate } }, { upsert: true }),

      // Add to winners collection
      FB3GBWinners.updateOne(
        { id: monthId },
        { $push: { winners: { id: user.id, time: currentDate } } },
        { upsert: true } // Create document if it doesn't exist
      ),
    ]);

    // Refresh counts
    await refreshWinnerCountsFB();
  } catch (error) {
    console.error('Failed to add new winner:', error);
    //sthrow new Error('Failed to process winner addition');
  }
};

// Refreshes winner counts from database

const refreshWinnerCountsFB = async (): Promise<void> => {
  try {
    const currentMonthId = getCurrentMonthId(new Date());

    const result = await FB3GBWinners.aggregate<{ count: number }>([
      { $match: { id: currentMonthId } },
      {
        $project: {
          count: {
            $cond: {
              if: { $isArray: '$winners' },
              then: { $size: '$winners' },
              else: 0,
            },
          },
        },
      },
    ]).exec();

    standardWinners = result[0]?.count || 0;
    numberOfWinners = standardWinners; // Assuming you want to sync these?
  } catch (error) {
    console.error('Failed to refresh winner counts:', error);
    throw new Error('Failed to update winner counts');
  }
};

const totalAcceptableWinners = MAX_WINNERS;

export {
  getCurrentMonthId,
  addNew3GBWinnerFB,
  getCurrentNumberOfWinners,
  totalAcceptableWinners,
  refreshWinnerCountsFB,
};
