import fs from 'fs';
import path from 'path';
import { BotUserType } from '../daily_participation_reminder';

// Models
import FB3GBWinners from '../../../models/fb_3gb_winners';
import Whatsapp3GBWinners from '../../../models/whatsapp_3gb_winners';
import FBBotUsers from '../../../models/fb_bot_users';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';

/* ============================================================
   Configuration & Constants
   ============================================================ */
const MAX_WINNERS = 200;
const MAX_REAL_WINNERS = 10;
const UPDATE_INTERVAL_MS = 6000; // Fast sync like the FB version

type Platform = 'FB' | 'WA';

interface WinnerState {
  lastTotal: number;
  lastUpdate: number;
  lastMonth: string; // "YYYY-M"
}

/* ============================================================
   Platform Strategy Mapping
   ============================================================ */
const getPlatformConfig = (platform: Platform) => ({
  stateFile: path.join(
    process.cwd(),
    platform === 'FB' ? 'winner_state_fb.json' : 'winner_state_wa.json'
  ),
  winnersModel: platform === 'FB' ? FB3GBWinners : Whatsapp3GBWinners,
  usersModel: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
});

/* ============================================================
   Utilities & State Management
   ============================================================ */
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export const getCurrentMonthId = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth()}`;
};

const loadState = (platform: Platform): WinnerState => {
  const { stateFile } = getPlatformConfig(platform);
  const currentMonth = getCurrentMonthId();
  try {
    if (fs.existsSync(stateFile)) {
      const state: WinnerState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      if (state.lastMonth === currentMonth) return state;
    }
  } catch (e) {
    console.error(`State load failed for ${platform}, initializing fresh.`);
  }
  return { lastTotal: 0, lastUpdate: Date.now(), lastMonth: currentMonth };
};

const saveState = (platform: Platform, state: WinnerState) => {
  const { stateFile } = getPlatformConfig(platform);
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    /* silent fail */
  }
};

/* ============================================================
   Internal Tracking
   ============================================================ */
let platformData = {
  FB: { state: loadState('FB'), realWinners: 0 },
  WA: { state: loadState('WA'), realWinners: 0 },
};

/* ============================================================
   Growth Model (Based on FB logic)
   ============================================================ */
const computeTargetTotal = (realCount: number, date: Date): number => {
  const day = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const hour = date.getHours();

  // 1. Time Progress (0.0 to 1.0)
  const monthProgress = day / daysInMonth;

  // 2. Passive Target (Fake Growth - 80% weight)
  const passiveTarget = MAX_WINNERS * 0.8 * monthProgress;

  // 3. Real Activity Factor (20% weight)
  const activityBoost = (realCount / MAX_REAL_WINNERS) * (MAX_WINNERS * 0.2);

  // 4. Hourly "Human" Wobble Noise
  const noise = 0.97 + Math.abs(Math.sin(day + hour)) * 0.06;

  const finalTarget = (passiveTarget + activityBoost) * noise;
  return clamp(Math.floor(finalTarget), 0, MAX_WINNERS);
};

/* ============================================================
   Core Logic Functions
   ============================================================ */

/**
 * Synchronizes local "real" count with MongoDB
 */
const refreshWinnerCounts = async (platform: Platform) => {
  const config = getPlatformConfig(platform);
  try {
    const monthId = getCurrentMonthId();
    const result = await config.winnersModel.findOne({ id: monthId }).lean();

    if (result && Array.isArray(result.winners)) {
      platformData[platform].realWinners = clamp(result.winners.length, 0, MAX_REAL_WINNERS);
    } else {
      platformData[platform].realWinners = 0;
    }
  } catch (err) {
    console.error(`DB Sync failed for ${platform}:`, err);
  }
};

/**
 * Updates the displayed count (monotonic growth)
 */
const updateDisplayedWinners = (platform: Platform) => {
  const now = new Date();
  const currentMonth = getCurrentMonthId();
  const data = platformData[platform];

  // Month reset check
  if (data.state.lastMonth !== currentMonth) {
    data.state.lastTotal = 0;
    data.state.lastMonth = currentMonth;
  }

  const target = computeTargetTotal(data.realWinners, now);

  // Smooth monotonic increase
  if (target > data.state.lastTotal) {
    const delta = target - data.state.lastTotal;
    const step = Math.max(1, Math.ceil(delta * 0.1));
    data.state.lastTotal = clamp(data.state.lastTotal + step, 0, MAX_WINNERS);
  }

  // Force max if real activity hits cap
  if (data.realWinners >= MAX_REAL_WINNERS) {
    data.state.lastTotal = MAX_WINNERS;
  }

  data.state.lastUpdate = Date.now();
  saveState(platform, data.state);

  console.log(
    `[Sync] Month: ${data.state.lastMonth} | Platfrom: ${platform} | Real: ${data.realWinners} | Displayed: ${data.state.lastTotal}`
  );
};

/* ============================================================
   Public API
   ============================================================ */

export const addNew3GBWinner = async (user: BotUserType, platform: Platform): Promise<void> => {
  const config = getPlatformConfig(platform);
  const now = new Date();
  const monthId = getCurrentMonthId();

  try {
    await Promise.all([
      config.usersModel.updateOne({ id: user.id }, { $set: { win: now } }, { upsert: true }),
      config.winnersModel.updateOne(
        { id: monthId },
        { $addToSet: { winners: { id: user.id, time: now, claimed: false } } },
        { upsert: true }
      ),
    ]);
    await refreshWinnerCounts(platform);
  } catch (err) {
    console.error(`Error adding ${platform} winner:`, err);
  }
};

export const getCurrentNumberOfWinners = (platform: Platform) =>
  platformData[platform].state.lastTotal;

export { MAX_WINNERS as totalAcceptableWinners };

/* ============================================================
   Scheduler Initialization
   ============================================================ */
setInterval(async () => {
  await refreshWinnerCounts('FB');
  await refreshWinnerCounts('WA');
  updateDisplayedWinners('FB');
  updateDisplayedWinners('WA');
}, UPDATE_INTERVAL_MS);

// Immediate startup
(async () => {
  await refreshWinnerCounts('FB');
  await refreshWinnerCounts('WA');
  updateDisplayedWinners('FB');
  updateDisplayedWinners('WA');
})();
