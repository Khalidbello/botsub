// second file for postback responses as the first file is getting too long
const sendTemplates = require('./send_templates');
const sendMessage = require('./send_message.js');
const { referralOffers1, referralOffers2 } = require('./templates_2');
const BotUsers = require('./../models/bot_users.js');


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
    const activatedReferrals = await BotUsers.aggregate([
        { $match: { id: senderId } }, // Match the document with the specified id
        { $unwind: "$referrals" }, // Deconstruct the referrals array
        { $match: { "referrals.status": "activated" } }, // Match only activated referr
    ]);
    console.log('acivated referral: ', activatedReferrals);

    if (activatedReferrals.lenght > 0) {
        await sendMessage(senderId, { text: 'Activated referrals:::: ' });
        const activeReferralsTemp = formActiveReferralTemp(activatedReferrals);
        let tempPromises = activeReferralsTemp.map(async (temp) => await sendTemplate(sender, temp));
        await Promise.all(tempPromises);
    } else {
        sendMessage(senderId, { text: 'You do not have any active referrals..' });
    };

    const unactivatedReferrals = await BotUsers.aggregate([
        { $match: { id: senderId } }, // Match the document with the specified id
        { $unwind: "$referrals" }, // Deconstruct the referrals array
        { $match: { "referrals.status": "unactivated" } }, // Match only activated referr
    ]);
    console.log('acivated referral: ', unactivatedReferrals);
    
    if (unactivatedReferrals.lenght > 0) {
        await sendMessage(senderId, { text: '\nYour unactivated referral bonus:::: ' });
        let unactivatedReferraltemp = formUnactivatedreferralTemp(unactivatedReferrals);
        let tempPromises = unactivatedReferraltemp.map(async (temp) => await sendTemplate(senderId, temp));
        return await Promise.all(tempPromises);
    };
    if (activatedReferrals.length < 1 && unactivatedReferrals.lenght < 1) return sendMessage(senderId, { text: 'refer a friend now to get free referal data bonuses.'})
}; // end of showMyReferrals


// function to remind referee to make purchase
async function remindReferree(event, payload) {
    const senderId = event.sender.id;

}; // end of remindeReferree
// function to respond to select referral bonus network
async function selectReferralOffers(event) {
    const senderId = event.sender.id;

    await sendTemplates(senderId, referralOffers1);
    await sendTemplates(senderId, referralOffers2);
};


module.exports = {
    showReferralCode,
    showMyReferrals,
    remindReferree,
    selectReferralOffers
};