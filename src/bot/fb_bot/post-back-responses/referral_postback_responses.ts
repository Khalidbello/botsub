import axios from 'axios';
import { sendMessage } from '../../modules/send_message';
import BotUsers from '../../../models/fb_bot_users';
import { formActiveReferralTemp } from '../../modules/helper_functions';
import sendTemplates from '../../modules/send_templates';
import { referralOffers1, referralOffers2 } from '../templates/templates_2';

// second file for postback responses as the first file is getting too long
const bonuses: { [key: string]: any } = {
  '1': { planID: 253, size: '150MB', network: 'MTN' },
  '2': { planID: 266, size: '200MB', network: 'GLO' },
  '3': { planID: 268, size: '500MB', network: '9mobile' },
  '4': { planID: 225, size: '100MB', network: 'Airtel' },
};

// funnctions to handle referal related stufss =================================================================================================

// function to guide and show users their referral code
async function showReferralCode(event: any) {
  const senderId = event.sender.id;

  await sendMessage(senderId, { text: 'Invite a friend and earn free data!!!' });
  await sendMessage(senderId, { text: `Your referral code is:` });
  await sendMessage(senderId, { text: `${senderId}` });
  await sendMessage(senderId, {
    text: 'For each referral you earn: \n100MB for Airtel. \n150MB for MTN. \n200MB for Glo. \n500MB for 9mobile',
  });
} // end of showReferralCode

// function to show users referrals and claim button
async function showMyReferrals(event: any, payload: any) {
  //return seedFbBotUsers();
  const senderId = event.sender.id;
  const response = await BotUsers.findOne({ id: senderId }).select('referrals');
  console.log('esponse my referrals: ', response);

  if (!response || response.referrals.length === 0) {
    await sendMessage(senderId, { text: 'You do not have any active referrals..' });
    return showReferralCode(event);
  }

  const referrals = response.referrals;
  console.log('acivated referral: ', referrals);

  if (referrals.length > 0) {
    await sendMessage(senderId, { text: 'Activated referrals:::: ' });
    const activeReferralsTemp = formActiveReferralTemp(referrals);
    let tempPromises = activeReferralsTemp.map(
      async (temp: any) => await sendTemplates(senderId, temp)
    );
    await Promise.all(tempPromises);
    return;
  }
} // end of showMyReferrals

// function to respond to select referral bonus network
async function selectReferralOffers(event: any, payload: any) {
  console.log('in referrals offer');
  const senderId = event.sender.id;

  await sendTemplates(senderId, referralOffers1(payload.referralId));
  await sendTemplates(senderId, referralOffers2(payload.referralId));
} // end of selectReferralOffers

// function to process claim referral bonus offer
async function referralBonusOfferSelected(event: any, payload: any) {
  const senderId = event.sender.id;
  console.log('payload of offer selected::::: ', payload);

  sendMessage(senderId, {
    text: `Enter ${payload.network} phone number to recieve referral bonus`,
  });
  await BotUsers.updateOne(
    { id: senderId },
    {
      $set: {
        nextAction: 'referralBonusPhoneNumber',
        purchasePayload: {
          network: payload.network,
          size: payload.size,
          planID: Number(payload.planID),
          networkID: Number(payload.networkID),
          refereeId: Number(payload.refereeId),
        },
      },
    }
  );
} // end of enterReferralBonusPhone

// function to initiate change rferral bonus phone Number
async function changeReferralBonusPhoneNumber(event: any) {
  const senderId = event.sender.id;
  sendMessage(senderId, { text: 'Enter new phone number: Enter Q to cancle' });
  await BotUsers.updateOne(
    { id: senderId },
    { $set: { nextAction: 'changeReferralBonusPhoneNumber' } }
  );
} // end of changeReferralBonusPhoneNumber

// function to deliver referral bonuses
async function deliverReferralBonus(event: any) {
  const senderId = event.sender.id;
  const resp = await BotUsers.findOne({ id: senderId }).select('referrals purchasePayload');
  let filtredArray;
  // check if there exist any referral with specific id
  if (!resp || !resp.referrals || resp.referrals.length === 0)
    return sendMessage(senderId, { text: 'Invalid referral please try again.' });
  // filtering array
  filtredArray = resp.referrals.filter((referral) => {
    return referral.id === resp?.purchasePayload?.refereeId;
  });

  if (!filtredArray) return sendMessage(senderId, { text: 'Invalid referral please try again.' });

  const response = await BotUsers.findOne({ id: senderId }).select('purchasePayload');
  console.log('purchasePayload for dliver referraal bonuses: ', response);
  // @ts-expect-error
  const { refereeId, phoneNumber, networkID } = response.purchasePayload;

  sendMessage(senderId, { text: 'referral bonus succesfully delivered' });
  try {
    let response;
    if (process.env.NODE_ENV === 'production') {
      response = await axios.post(
        'https://opendatasub.com/api/data/',
        {
          network: Number(networkID),
          mobile_number: phoneNumber,
          plan: Number(bonuses[networkID]),
          Ported_number: true,
        },
        {
          headers: {
            Authorization: 'Token ' + process.env.OPENSUB_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    if (process.env.TEST === 'pass' || (response && response.data.Status === 'successful')) {
      // remove referral from unclaimed referre and add to claimed
      await removeDeliverdReferralBonus(senderId, refereeId);
      return;
    }
    throw 'delivering not succesful';
  } catch (err: any) {
    if (err.response) {
      console.error('Error response: ', err.response.data);
    } else if (err.request) {
      console.error('No response received: ', err.request);
    } else {
      console.error('Error: ', err.message);
    }
    await sendMessage(senderId, {
      text: 'Sorry an error occurd while trying to deliver referral bonus',
    });
  }
} // end deliver bonus

// helper function to remove delvered referral bonus and add it to claimed
async function removeDeliverdReferralBonus(senderId: string, refereeId: string) {
  try {
    const deletedDocs = await BotUsers.updateOne(
      { id: senderId },
      { $pull: { referrals: { id: refereeId } } }
    );
    console.log('deleted docs', deletedDocs);
    // adding document to claimed
    const response = await BotUsers.updateOne(
      { id: senderId },
      { $push: { claimedReferrals: { id: refereeId } } }
    );
    console.log('claimed referral bonus: ', response);
  } catch (error) {
    console.log('error removing delivered referrals: ', error);
  }
} // end of removeDeliverdReferralBonus

export {
  showReferralCode,
  showMyReferrals,
  selectReferralOffers,
  referralBonusOfferSelected,
  changeReferralBonusPhoneNumber,
  deliverReferralBonus,
};
