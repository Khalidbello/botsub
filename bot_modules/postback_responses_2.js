// second file for postback responses as the first file is getting too long
const sendTemplates = require('./send_templates');
const sendMessage = require('./send_message.js');
const { referralOffers1, referralOffers2 } = require('./templates_2');
const BotUsers = require('../models/fb_bot_users.js');
const { formUnactiveReferralTemp, formActiveReferralTemp } = require('./helper_functions.js');
const { seedFbBotUsers } = require('./seed_database.js');


// funnctions to handle referal related stufss =================================================================================================

// function to guide and show users their referral code
async function showReferralCode(event) {
    const senderId = event.sender.id;

    await sendMessage(senderId, { text: 'Invite a friend and earn free data!!!' });
    await sendMessage(senderId, { text: `Your referral code is:` });
    await sendMessage(senderId, { text: `${senderId}` });
    await sendMessage(senderId, { text: 'For each referral you earn: \n100MB for MTN. \n100MB for Airtel. \n200MB for Glo. \n500MB for 9mobile' });
}; // end of showReferralCode


// function to show users referrals and claim button
async function showMyReferrals(event) {
    const senderId = event.sender.id;
    const referrals = await BotUsers.findOne(
        { id: senderId, 'referrals.status': 'unactivated'}, // Match the document with the specified id
    );
    const activatedReferrals = referrals.referrals.filter((referral)=> referral.status === 'activated');
    const unactivatedReferrals = referrals.referrals.filter((referral)=> referral.status === 'unactivated');
    
    console.log('acivated referral: ', activatedReferrals);

    if (activatedReferrals.length > 0) {
        await sendMessage(senderId, { text: 'Activated referrals:::: ' });
        const activeReferralsTemp = formActiveReferralTemp(activatedReferrals);
        let tempPromises = activeReferralsTemp.map(async (temp) => await sendTemplates(senderId, temp));
        await Promise.all(tempPromises);
    } else {
        await sendMessage(senderId, { text: 'You do not have any active referrals..' });
    };

    console.log('Unacivated referral: ', unactivatedReferrals);
    
    if (unactivatedReferrals.length > 0) {
        await sendMessage(senderId, { text: '.\nYour unactivated referral bonus:::: ' });
        let unactivatedReferraltemp = formUnactiveReferralTemp(unactivatedReferrals);
        let tempPromises = unactivatedReferraltemp.map(async (temp) => await sendTemplates(senderId, temp));
        return await Promise.all(tempPromises);
    };
    if (Object.values(activatedReferrals).length < 1 && Object.values(unactivatedReferrals).length < 1) {
        //await seedFbBotUsers(senderId);
        return showReferralCode(event);
    }; 
}; // end of showMyReferrals


// function to remind referee to make purchase
async function remindReferree(event, payload) {s
    const senderId = event.sender.id;

}; // end of remindeReferree


// function to respond to select referral bonus network
async function selectReferralOffers(event) {
    console.log('in referrals offer')
    const senderId = event.sender.id;

    await sendTemplates(senderId, referralOffers1());
    await sendTemplates(senderId, referralOffers2());
}; // end of selectReferralOffers


// function to activate bonus
async function activateReferral(event, payload) {

}; // activateReferral


module.exports = {
    showReferralCode,
    showMyReferrals,
    remindReferree,
    selectReferralOffers
};