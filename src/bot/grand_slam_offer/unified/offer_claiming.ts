import axios from 'axios';
import { isSameMonth } from 'date-fns';
import { BotUserType } from '../daily_participation_reminder';

// Models
import FBBotUsers from '../../../models/fb_bot_users';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import FB3GBWinners from '../../../models/fb_3gb_winners';
import Whatsapp3GBWinners from '../../../models/whatsapp_3gb_winners';

// Helpers & Messages
import { sendMessage as sendMessageFB } from '../../fb_bot/modules/send_message';
import sendMessageW from '../../whatsaap_bot/send_message_w';

import {
  getCurrentMonthId,
  getCurrentNumberOfWinners,
  totalAcceptableWinners,
} from './number_of_winners_logic';
import { DEFAULT_MESSAGE } from '../../unified/send_message_generic';
import { cancelTransaction } from '../../unified/utility_2';
import { validateNumber } from '../../unified/utility_1';

// --- Types & Constants ---
type Platform = 'FB' | 'WA';

const NETWORKS = {
  a: { network: 'MTN', networkId: 1, planId: 490, price: 1400, validity: '30 Days.' },
  b: { network: 'GLO', networkId: 2, planId: 502, price: 1100, validity: '7 Days.' },
  c: { network: 'Airtel', networkId: 4, planId: 309, price: 1100, validity: '2 Days.' },
  d: { network: '9mobile', networkId: 3, planId: 267, price: 1200, validity: '30 Days.' },
};

// --- Platform Abstraction Layer ---
const getPlatformConfig = (platform: Platform) => ({
  usersModel: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  winnersModel: platform === 'FB' ? FB3GBWinners : Whatsapp3GBWinners,
  send:
    platform === 'FB'
      ? (id: string, txt: string) => sendMessageFB(id, { text: txt })
      : (id: string, txt: string) => sendMessageW(id, txt),
  getWinners: () => getCurrentNumberOfWinners(platform),
  totalWinners: totalAcceptableWinners,
});

// Helper to normalize event data
const parseEvent = (event: any, platform: Platform) => {
  if (platform === 'FB') {
    return { senderId: event.sender.id, text: event.message?.text?.trim() || '' };
  }
  return { senderId: event.from, text: event.text?.body?.trim() || '' };
};

// --- Unified Functions ---

/**
 * 1. Main Claim Entry Point
 */
export const claimFree3GB = async (senderId: string, user: BotUserType, platform: Platform) => {
  const config = getPlatformConfig(platform);
  const currentDate = new Date();

  try {
    const winnerInDb = await config.winnersModel.findOne({ id: getCurrentMonthId() });
    const isWinner = winnerInDb?.winners.some((w: any) => w.id === user.id);
    const hasWonThisMonth = user.win && isSameMonth(new Date(user.win), currentDate);
    const hasClaimedThisMonth = user.claimed && isSameMonth(new Date(user.claimed), currentDate);

    if (hasWonThisMonth && isWinner) {
      if (currentDate.getDate() < 20) {
        await config.send(
          senderId,
          'Claiming of free 3GB commences on 20th of this month. \n\nCongratulations once again.'
        );
        return await config.send(senderId, DEFAULT_MESSAGE);
      }

      if (hasClaimedThisMonth) {
        await config.send(
          senderId,
          'You have already claimed your free 3GB for this month. \nBrace up for another win next month!'
        );
        return await config.send(senderId, DEFAULT_MESSAGE);
      }

      await config.send(
        senderId,
        `Congratulations on your win once again. \n\nSelect network you wish to claim your free 3GB to. \n\nA. MTN \nB. GLO \nC. Airtel \nD. 9mobile \n\nEnter X to cancel.`
      );
      await config.usersModel.updateOne(
        { id: user.id },
        { $set: { nextAction: 'selectFree3GBClaimNetwork' } }
      );
    } else {
      if (config.getWinners() < config.totalWinners) {
        const remaining = 3 - (user.numberOfTransactionForMonth || 0);
        await config.send(
          senderId,
          `You have not qualified for the free 3Gb data.\n\nMake additional ${remaining} data purchases to qualify!. \n\nA. Buy data`
        );
      } else {
        await config.send(
          senderId,
          "Sorry you are not among this month's winners. You get another chance next month."
        );
        await config.send(senderId, DEFAULT_MESSAGE);
      }
    }
  } catch (err) {
    console.error(`Error in claimFree3GB (${platform}):`, err);
    await config.send(senderId, 'An error occurred. Please try again');
  }
};

/**
 * 2. Network Selection
 */
export const selectFree3GBClaimNetworkSelected = async (
  event: any,
  user: BotUserType,
  platform: Platform
) => {
  const { senderId, text } = parseEvent(event, platform);
  const config = getPlatformConfig(platform);
  const choice = text.toLowerCase();

  if (choice === 'x') return await cancelTransaction(senderId, platform, false);

  const selectedNetwork = NETWORKS[choice as keyof typeof NETWORKS];
  if (!selectedNetwork) {
    await config.send(senderId, 'The option you selected is not valid.');
    return await config.send(
      senderId,
      `Select network... \n\nA. MTN --${NETWORKS.a.validity} \nB. GLO --${NETWORKS.b.validity} \nC. Airtel --${NETWORKS.c.validity} \nD. 9mobile --${NETWORKS.d.validity} \n\nEnter X to cancel.`
    );
  }

  await config.usersModel.updateOne(
    { id: user.id },
    {
      $set: {
        nextAction: 'enterPhoneNumberToClaimFree3GB',
        'purchasePayload.free3GBNetwork': selectedNetwork.network,
        'purchasePayload.free3GBNetworkId': selectedNetwork.networkId,
        'purchasePayload.free3GBPlanId': selectedNetwork.planId,
      },
    }
  );

  await config.send(
    senderId,
    `Please enter ${selectedNetwork.network} phone number to claim your free 3GB.`
  );
};

/**
 * 3. Phone Number Entry
 */
export const phoneNumberToClaimFree3GBEntered = async (
  event: any,
  user: BotUserType,
  platform: Platform
) => {
  const { senderId, text } = parseEvent(event, platform);
  const config = getPlatformConfig(platform);

  if (text.toLowerCase() === 'x') return await cancelTransaction(senderId, platform, false);

  const validatedPhoneNumber = validateNumber(text);
  if (!validatedPhoneNumber) {
    return await config.send(
      senderId,
      `The phone number is invalid. \n\nPlease enter a valid ${user.purchasePayload?.free3GBNetwork} number. \n\nEnter X to cancel.`
    );
  }

  await config.usersModel.updateOne(
    { id: user.id },
    {
      $set: {
        nextAction: 'deliverFree3GB',
        'purchasePayload.free3GBPhoneNumber': validatedPhoneNumber,
      },
    }
  );

  await config.send(senderId, 'Phone number received.');
  await config.send(
    senderId,
    `Free 3GB offer claiming. \nNetwork: ${user.purchasePayload?.free3GBNetwork} \nSize: 3GB \nPhone number: ${validatedPhoneNumber} \n\nA. Claim offer. \nX. Cancel`
  );
};

/**
 * 4. Delivery
 */
export const deliverFree3GB = async (event: any, user: BotUserType, platform: Platform) => {
  const { senderId, text } = parseEvent(event, platform);
  const config = getPlatformConfig(platform);

  if (text.toLowerCase() === 'x') return await cancelTransaction(senderId, platform, false);

  try {
    const isAirtel = user.purchasePayload.free3GBNetworkId === 4;
    const options = {
      url: isAirtel ? 'https://opendatasub.com/api/data/' : 'https://asbdata.com/api/data/',
      headers: {
        Authorization: `Token ${isAirtel ? process.env.OPENSUB_KEY : process.env.ASBDATA_KEY}`,
        'Content-Type': 'application/json',
      },
      payload: {
        network: Number(user.purchasePayload?.free3GBNetworkId),
        mobile_number: user.purchasePayload?.free3GBPhoneNumber,
        plan: Number(user.purchasePayload?.free3GBPlanId),
        Ported_number: true,
      },
    };

    // Note: Re-enable axios call in production
    const resp = await axios.post(options.url, options.payload, { headers: options.headers });
    console.log('Free 3gb delivery response >>>>>>>>>>>>>>>', resp);
    if (resp.data.Status === 'successful') {
      await config.send(
        senderId,
        `Your free 3GB has been successfully delivered to ${user.purchasePayload?.free3GBNetwork} line ${user.purchasePayload?.free3GBPhoneNumber}`
      );

      // Update User
      await config.usersModel.updateOne(
        { id: user.id },
        { $set: { nextAction: null, claimed: new Date(), win: new Date() } }
      );

      // Update Winners Log
      await config.winnersModel.updateOne(
        { id: getCurrentMonthId(), 'winners.id': user.id },
        { $set: { 'winners.$.claimed': true } }
      );
    }
    throw 'Data free 3GB delivery failed';
  } catch (err) {
    console.error(`Delivery Error (${platform}):`, err);
    await config.send(senderId, 'An error occurred, please try again.');
  }
};
