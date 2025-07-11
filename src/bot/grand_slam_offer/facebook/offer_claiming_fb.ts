import axios from 'axios';
import { isSameMonth } from 'date-fns';
import { validateNumber } from '../../modules/helper_functions';
import {
  getCurrentMonthId,
  getCurrentNumberOfWinners,
  totalAcceptableWinners,
} from './number_of_winners_logic_fb';
import { sendMessage } from '../../modules/send_message';
import { cancelTransaction, defaultText } from '../../fb_bot/message-responses/generic';
import FBBotUsers from '../../../models/fb_bot_users';
import FB3GBWinners from '../../../models/fb_3gb_winners';
import { BotUserType } from './daily_participation_reminder_fb';

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
  const doc = await FB3GBWinners.findOne({
    id: currentMonthId,
  });

  console.log('doce in checkIfUserIsAmongWinners', doc);
  if (!doc) return false;

  return doc.winners.some((winner) => winner.id === userId);
};

// Main claim function
const claimFree3GB = async (event: any, user: BotUserType): Promise<void> => {
  const senderId = event.sender.id;
  const currentDate = new Date();

  try {
    const currentNumberOfWinners = getCurrentNumberOfWinners();
    const winDate = user.win ? new Date(user.win) : null;
    const claimedDate = user.claimed ? new Date(user.claimed) : null;

    const won = winDate && isSameMonth(winDate, currentDate);
    const winnerInDb = await checkIfUserIsAmongWinners(user.id);
    const free3GBClaimed = claimedDate && isSameMonth(claimedDate, currentDate);

    if (won && winnerInDb) {
      if (free3GBClaimed) {
        await sendMessage(senderId, {
          text: 'You have already claimed your free 3GB for this month. \nBrace for another win next month',
        });
      } else {
        await sendMessage(senderId, {
          text: `Congratulations on your win once again. \n\nSelect network you wish to claim your free 3GB to. \n\nA. MTN \nB. GLO \nC. Airtel \nD. 9mobile \n\nEnter X to cancel.`,
        });
        await FBBotUsers.updateOne(
          { id: user.id },
          { $set: { nextAction: 'selectFree3GBClaimNetwork' } }
        );
      }
    } else {
      if (currentNumberOfWinners < totalAcceptableWinners) {
        const transactionsToMake =
          3 - (user?.numberOfTransactionForMonth ? user.numberOfTransactionForMonth : 0);

        await sendMessage(senderId, {
          text: `You have not qualified for the free 3Gb data.\n\nMake additional ${transactionsToMake} data purchases to qualify!. \n\nA. Buy data`,
        });
      } else {
        await sendMessage(senderId, {
          text: "Sorry you are not among this month's winners. You get another chance next month.",
        });
        sendMessage(senderId, { text: defaultText });
      }
    }
  } catch (err) {
    console.error('Error in claimFree3GB:', err);
    await sendMessage(senderId, { text: 'An error occurred. Please try again' });
    await sendMessage(senderId, { text: defaultText });
  }
};

// Network selection handler
const selectFree3GBClaimNetworkSelected = async (event: any, user: BotUserType): Promise<void> => {
  const senderId = event.sender.id;
  const networkInput = event.message.text.trim().toLowerCase();
  const network = networkInput as 'a' | 'b' | 'c' | 'd' | 'x';

  try {
    if (network === 'x') {
      await cancelTransaction(senderId, false);
      return;
    }

    if (!NETWORKS[network]) {
      await sendMessage(senderId, { text: 'The option you selected is not valid.' });
      await sendMessage(senderId, {
        text: `Select network you wish to claim your free 3GB to. \n\nA. MTN \nB. GLO \nC. Airtel \nD. 9mobile \n\nEnter X to cancel.`,
      });
      return;
    }

    const selectedNetwork = NETWORKS[network];

    await FBBotUsers.updateOne(
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

    await sendMessage(senderId, {
      text: `Please enter ${selectedNetwork.network} phone number to claim ${selectedNetwork.network} free 3GB.`,
    });
  } catch (err) {
    console.error('Error in selectFree3GBClaimNetworkSelected:', err);
    await sendMessage(senderId, { text: 'An error occurred. Please try again.' });
    await sendMessage(senderId, {
      text: `Select network you wish to claim your free 3GB to. \n\nA. MTN \nB. GLO \nC. Airtel \nD. 9mobile \n\nEnter X to cancel.`,
    });
  }
};

// Phone number entry handler
const phoneNumberToClaimFree3GBEntered = async (event: any, user: BotUserType): Promise<void> => {
  const senderId = event.sender.id;
  const phoneNumber = event.message.text.trim().toLowerCase();

  try {
    if (phoneNumber?.toLowerCase() === 'x') {
      await cancelTransaction(senderId, false);
      return;
    }

    const validatedPhoneNumber = validateNumber(phoneNumber as string);
    if (!validatedPhoneNumber) {
      await sendMessage(senderId, {
        text: `The phone number you entered to claim your free 3GB is invalid. \n\nPlease enter a valid ${user.purchasePayload?.free3GBNetwork} number to claim. \n\nEnter X to cancel.`,
      });
      return;
    }

    await FBBotUsers.updateOne(
      { id: user.id },
      {
        $set: {
          nextAction: 'deliverFree3GB',
          'purchasePayload.free3GBPhoneNumber': validatedPhoneNumber,
        },
      }
    );

    await sendMessage(senderId, { text: 'Phone number received.' });
    await sendMessage(senderId, {
      text: `Free 3GB offer claiming. \nNetwork: ${user.purchasePayload?.free3GBNetwork} \nSize: 3GB \nPhone number: ${validatedPhoneNumber} \n\nA. Claim offer. \nX. Cancel`,
    });
  } catch (err) {
    console.error('Error in phoneNumberToClaimFree3GBEntered:', err);
    await sendMessage(senderId, {
      text: 'An error occurred. \n\nPlease enter phone number again.',
    });
  }
};

// Delivery handler
const deliverFree3GB = async (event: any, user: BotUserType): Promise<void> => {
  const senderId = event.sender.id;
  const message = event.message.text.trim().toLowerCase();

  try {
    if (message?.toLowerCase() === 'x') {
      await cancelTransaction(senderId, false);
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

    await sendMessage(senderId, {
      text: `Your free 3GB has been successfully delivered to your ${user.purchasePayload?.free3GBNetwork} line ${user.purchasePayload?.free3GBPhoneNumber}`,
    });

    await FBBotUsers.updateOne(
      { id: user.id },
      {
        $set: {
          claimed: new Date(),
          win: new Date(),
        },
      }
    );
  } catch (err) {
    console.error('Error in deliverFree3GB:', err);
    await sendMessage(senderId, { text: 'An error occurred, please try again.' });
    await sendMessage(senderId, {
      text: `Free 3GB offer claiming. \nNetwork: ${user.purchasePayload?.free3GBNetwork} \nSize: 3GB \nPhone number: ${user.purchasePayload?.free3GBPhoneNumber} \n\nA. Claim offer. \nX. Cancel`,
    });
  }
};

export {
  claimFree3GB,
  selectFree3GBClaimNetworkSelected,
  phoneNumberToClaimFree3GBEntered,
  deliverFree3GB,
};
