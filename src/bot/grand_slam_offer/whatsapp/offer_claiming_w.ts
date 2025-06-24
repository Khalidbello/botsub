import axios from 'axios';
import { isSameMonth } from 'date-fns';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import { validateNumber } from '../../modules/helper_functions';
import { cancelTransactionW, defaultTextW } from '../../whatsaap_bot/message-responses/generic';
import sendMessageW from '../../whatsaap_bot/send_message_w';
import {
  getCurrentMonthId,
  getCurrentNumberOfWinnersW,
  totalAcceptableWinnersW,
} from './number_of_winners_logic_w';
import Whatsapp3GBWinners from '../../../models/whatsapp_3gb_winners';
import { BotUserType } from '../daily_participation_reminder';
// Type definitions
interface MessageObj {
  from: string;
  text?: {
    body: string;
  };
}

interface NetworkOption {
  network: string;
  networkId: number;
  planId: number;
}

const NETWORKS: Record<'a' | 'b' | 'c' | 'd', NetworkOption> = {
  a: { network: 'MTN', networkId: 1, planId: 3000 },
  b: { network: 'GLO', networkId: 2, planId: 3000 },
  c: { network: 'Airtel', networkId: 4, planId: 3000 },
  d: { network: '9mobile', networkId: 3, planId: 3000 },
};

// Helper function to check if user is among winners
const checkIfUserIsAmongWinners = async (userId: string): Promise<boolean> => {
  const currentMonthId = getCurrentMonthId(new Date());
  const doc = await Whatsapp3GBWinners.findOne({
    id: currentMonthId,
  });

  console.log('doce in checkIfUserIsAmongWinners', doc);
  if (!doc) return false;

  return doc.winners.some((winner) => winner.id === userId);
};

// Main claim function
const claimFree3GBW = async (messageObj: MessageObj, user: BotUserType): Promise<void> => {
  const senderId = messageObj.from;
  const currentDate = new Date();

  try {
    const currentNumberOfWinners = getCurrentNumberOfWinnersW();
    const winDate = user.win ? new Date(user.win) : null;
    const claimedDate = user.claimed ? new Date(user.claimed) : null;

    const won = winDate && isSameMonth(winDate, currentDate);
    const winnerInDb = await checkIfUserIsAmongWinners(user.id);
    const free3GBClaimed = claimedDate && isSameMonth(claimedDate, currentDate);

    if (won && winnerInDb) {
      if (free3GBClaimed) {
        await sendMessageW(
          senderId,
          'You have already claimed your free 3GB for this month. \nBrace up for another win next month!'
        );
      } else {
        await sendMessageW(
          senderId,
          `Congratulations on your win once again. \n\nSelect network you wish to claim your free 3GB to. \n\nA. MTN \nB. GLO \nC. Airtel \nD. 9mobile \n\nEnter X to cancel.`
        );
        await WhatsappBotUsers.updateOne(
          { id: user.id },
          { $set: { nextAction: 'selectFree3GBClaimNetwork' } }
        );
      }
    } else {
      if (currentNumberOfWinners < totalAcceptableWinnersW) {
        const transactionsToMake =
          3 - (user?.numberOfTransactionForMonth ? user.numberOfTransactionForMonth : 0);

        await sendMessageW(
          senderId,
          `You have not qualified for the free 3Gb data.\n\nMake additional ${transactionsToMake} data purchases to qualify!. \n\nA. Buy data`
        );
      } else {
        await sendMessageW(
          senderId,
          "Sorry you are not among this month's winners. You get another chance next month."
        );
        sendMessageW(senderId, defaultTextW);
      }
    }
  } catch (err) {
    console.error('Error in claimFree3GBW:', err);
    await sendMessageW(senderId, 'An error occurred. Please try again');
    await sendMessageW(senderId, defaultTextW);
  }
};

// Network selection handler
const selectFree3GBClaimNetworkSelectedW = async (
  messageObj: MessageObj,
  user: BotUserType
): Promise<void> => {
  const senderId = messageObj.from;
  const networkInput = messageObj?.text?.body.trim().toLowerCase();
  const network = networkInput as 'a' | 'b' | 'c' | 'd' | 'x';

  try {
    if (network === 'x') {
      await cancelTransactionW(senderId, false);
      return;
    }

    if (!NETWORKS[network]) {
      await sendMessageW(senderId, 'The option you selected is not valid.');
      await sendMessageW(
        senderId,
        `Select network you wish to claim your free 3GB to. \n\nA. MTN \nB. GLO \nC. Airtel \nD. 9mobile \n\nEnter X to cancel.`
      );
      return;
    }

    const selectedNetwork = NETWORKS[network];

    await WhatsappBotUsers.updateOne(
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

    await sendMessageW(
      senderId,
      `Please enter ${selectedNetwork.network} phone number to claim ${selectedNetwork.network} free 3GB.`
    );
  } catch (err) {
    console.error('Error in selectFree3GBClaimNetworkSelectedW:', err);
    await sendMessageW(senderId, 'An error occurred. Please try again.');
    await sendMessageW(
      senderId,
      `Select network you wish to claim your free 3GB to. \n\nA. MTN \nB. GLO \nC. Airtel \nD. 9mobile \n\nEnter X to cancel.`
    );
  }
};

// Phone number entry handler
const phoneNumberToClaimFree3GBEnteredW = async (
  messageObj: MessageObj,
  user: BotUserType
): Promise<void> => {
  const senderId = messageObj.from;
  const phoneNumber = messageObj?.text?.body.trim();

  try {
    if (phoneNumber?.toLowerCase() === 'x') {
      await cancelTransactionW(senderId, false);
      return;
    }

    const validatedPhoneNumber = validateNumber(phoneNumber as string);
    if (!validatedPhoneNumber) {
      await sendMessageW(
        senderId,
        `The phone number you entered to claim your free 3GB is invalid. \n\nPlease enter a valid ${user.purchasePayload?.free3GBNetwork} number to claim. \n\nEnter X to cancel.`
      );
      return;
    }

    await WhatsappBotUsers.updateOne(
      { id: user.id },
      {
        $set: {
          nextAction: 'deliverFree3GBW',
          'purchasePayload.free3GBPhoneNumber': validatedPhoneNumber,
        },
      }
    );

    await sendMessageW(senderId, 'Phone number received.');
    await sendMessageW(
      senderId,
      `Free 3GB offer claiming. \nNetwork: ${user.purchasePayload?.free3GBNetwork} \nSize: 3GB \nPhone number: ${validatedPhoneNumber} \n\nA. Claim offer. \nX. Cancel`
    );
  } catch (err) {
    console.error('Error in phoneNumberToClaimFree3GBEnteredW:', err);
    await sendMessageW(senderId, 'An error occurred. \n\nPlease enter phone number again.');
  }
};

// Delivery handler
const deliverFree3GBW = async (messageObj: MessageObj, user: BotUserType): Promise<void> => {
  const senderId = messageObj.from;
  const message = messageObj?.text?.body.trim();

  try {
    if (message?.toLowerCase() === 'x') {
      await cancelTransactionW(senderId, false);
      return;
    }

    const payload = {
      network: Number(user.purchasePayload?.free3GBNetworkId),
      mobile_number: user.purchasePayload?.free3GBPhoneNumber,
      plan: Number(user.purchasePayload?.free3GBPlanId),
      Ported_number: true,
    };

    const response = await axios.post('https://opendatasub.com/api/data/', payload, {
      headers: {
        Authorization: 'Token ' + process.env.OPENSUB_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.Status !== 'successful') {
      throw new Error('Failed to deliver free 3GB data');
    }

    await sendMessageW(
      senderId,
      `Your free 3GB has been successfully delivered to your ${user.purchasePayload?.free3GBNetwork} line ${user.purchasePayload?.free3GBPhoneNumber}`
    );

    await WhatsappBotUsers.updateOne(
      { id: user.id },
      {
        $set: {
          claimed: new Date(),
          win: new Date(),
        },
      }
    );
  } catch (err) {
    console.error('Error in deliverFree3GBW:', err);
    await sendMessageW(senderId, 'An error occurred, please try again.');
    await sendMessageW(
      senderId,
      `Free 3GB offer claiming. \nNetwork: ${user.purchasePayload?.free3GBNetwork} \nSize: 3GB \nPhone number: ${user.purchasePayload?.free3GBPhoneNumber} \n\nA. Claim offer. \nX. Cancel`
    );
  }
};

export {
  claimFree3GBW,
  selectFree3GBClaimNetworkSelectedW,
  phoneNumberToClaimFree3GBEnteredW,
  deliverFree3GBW,
};
