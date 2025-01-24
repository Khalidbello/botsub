import WhatsaapBotUsers from '../../../models/fb_bot_users';
import { validateNumber } from '../../modules/helper_functions';
import sendMessageW from '../send_message_w';
import sendTemplates from '../../modules/send_templates';
import { responseServices, responseServices2, responseServices3 } from '../templates/templates';
import { referralTemp } from '../templates/templates_2';
import { defaultTextW } from './generic';

// function to guide and show users their referral code
async function showReferralCode(messageObj: any) {
  const senderId = messageObj.from;

  // await sendMessageW(senderId, 'Invite a friend and earn free data!!!' });
  // await sendMessageW(senderId, `Your referral code is:` });
  // await sendMessageW(senderId, `${senderId}` });
  // await sendMessageW(senderId, {
  //   text: 'For each referral you earn: \n100MB for Airtel. \n150MB for MTN. \n200MB for Glo. \n500MB for 9mobile',
  // });

  try {
    await sendMessageW(senderId, 'Service currently not available');
    await sendMessageW(senderId, defaultTextW);
  } catch (err) {
    console.error('An error occured in showActiveReferalls', err);
    await sendMessageW(senderId, 'An erro occured');
    await sendMessageW(senderId, defaultTextW);
  }
} // end of showReferralCode

// function to show user active referalls
const showActiveReferalls = async (messageObj: any) => {
  const senderId = messageObj.from;

  try {
    await sendMessageW(senderId, 'Service currently not available');
    await sendMessageW(senderId, defaultTextW);
  } catch (err) {
    console.error('An error occured in showActiveReferalls', err);
    await sendMessageW(senderId, 'An erro occured');
    await sendMessageW(senderId, defaultTextW);
  }
};

// function to handle recieval of referral code\
async function sendReferralCodeRecieved(messageObj: any) {
  console.log('in referral code::::::');
  const senderId = messageObj.from;
  const message = messageObj?.text?.body;
  try {
    const referralCode = Number(message);

    if (referralCode === 0) {
      await sendMessageW(
        senderId,
        'Welcome to BotSub, Get data offers for as low as $200/GB. \nHurry while it last!'
      );
      // await sendMessageW(senderId, {
      //   text: 'You will also be credited with free data bonuses for your all your first purchase of the month',
      // });
      await sendMessageW(senderId, defaultTextW);

      await WhatsaapBotUsers.updateOne(
        { id: senderId },
        { $set: { nextAction: null, referrer: 0, firstPurchase: true } }
      );
      return;
    }

    const referrer = await WhatsaapBotUsers.findOne({ id: referralCode });
    console.log('new conversation referer', referrer);

    if (!referrer) {
      await sendMessageW(senderId, 'The provided referral code is invalid');
      return sendMessageW(senderId, 'Enter a valid referral code. \nIf no referrer enter 0');
    } else {
      await sendMessageW(
        senderId,
        'Welcome to BotSub, Get data offers for as low as $200/GB. \nHurry while it last!'
      );
      // await sendMessageW(senderId, {
      //   text: 'You will also be credited with free data bonuses for your all your first purchase of the month',
      // });

      await sendMessageW(senderId, defaultTextW);

      await WhatsaapBotUsers.updateOne(
        { id: senderId },
        {
          $set: { nextAction: null, referrer: Number(referralCode), firstPurchase: true },
        }
      );
    }
  } catch (error) {
    console.error('error in referall code recieved responsedr', error);
    await sendMessageW(senderId, 'The provided referral code is invalid');
    return sendMessageW(senderId, 'Enter a valid referral code. \nIf no referrer enter 0');
  }
} // end of sendeReferralCodeRecieved

// function to handle recieve referralBonus phone number
async function referralBonusPhoneNumberRecieved(messageObj: any) {
  const senderId = messageObj.from;
  const referralBonusPhoneNumber = messageObj?.text?.body;
  const validateNum = validateNumber(referralBonusPhoneNumber);

  if (!validateNum)
    return sendMessageW(
      senderId,
      'Phone number entred not valid. \nplease enter a valid phone number. \nEnter X to cancel'
    );
  await sendMessageW(senderId, 'Number to deliver referral bonus to recieved.');
  await WhatsaapBotUsers.updateOne(
    { id: senderId },
    {
      $set: {
        'purchasePayload.phoneNumber': validateNum,
        nextAction: null,
      },
    }
  );
  confirmClaimReferralBonus(messageObj);
} // end of recieveReferralBonusPhone

// function to confirm claim referral
async function confirmClaimReferralBonus(messageObj: any) {
  const senderId = messageObj.from;
  const response = await WhatsaapBotUsers.findOne({ id: senderId }).select('purchasePayload');
  // @ts-expect-error
  const { network, size, phoneNumber } = response.purchasePayload;

  await sendMessageW(
    senderId,
    `Product: ${network} ${size} referral bonus \nNumber: ${phoneNumber}`
  );
  await sendTemplates(senderId, referralTemp);
} // end of claim referral bonus

// function to handle chnage referral bonus phone number
async function changeReferralBonusPhoneNumber(messageObj: any) {
  const senderId = messageObj.from;
  const message = messageObj?.text?.body;
  const validatedNum = validateNumber(message);
  console.log('in change phone number');
  if (message.toLowerCase() === 'x') {
    console.log('in q cancel');
    sendMessageW(senderId, 'Change of Phone number cancled');
    confirmClaimReferralBonus(messageObj);
    await WhatsaapBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
    return;
  }

  if (!validatedNum)
    return sendMessageW(
      senderId,
      'Phone number not valid. \nEnter a valid phone number of enter Q to cancel'
    );

  await sendMessageW(senderId, 'Phone number changed');
  confirmClaimReferralBonus(messageObj);
  await WhatsaapBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
} // end of changeReferralBonusPhoneNumber

export {
  showReferralCode,
  showActiveReferalls,
  sendReferralCodeRecieved,
  referralBonusPhoneNumberRecieved,
  confirmClaimReferralBonus,
  changeReferralBonusPhoneNumber,
};
