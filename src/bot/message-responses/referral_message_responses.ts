import BotUsers from "../../models/fb_bot_users";
import { validateNumber } from "../modules/helper_functions";
import { sendMessage } from "../modules/send_message";
import sendTemplates from "../modules/send_templates";
import { responseServices, responseServices2, responseServices3 } from "../templates/templates";
import { referralTemp } from "../templates/templates_2";
import { defaultText } from "./generic";



// function to guide and show users their referral code
async function showReferralCode(event: any) {
    const senderId = event.sender.id;

    await sendMessage(senderId, { text: 'Invite a friend and earn free data!!!' });
    await sendMessage(senderId, { text: `Your referral code is:` });
    await sendMessage(senderId, { text: `${senderId}` });
    await sendMessage(senderId, { text: 'For each referral you earn: \n100MB for Airtel. \n150MB for MTN. \n200MB for Glo. \n500MB for 9mobile' });
}; // end of showReferralCode

// function to show user active referalls
const showActiveReferalls = async (event: any) => {
    const senderId = event.sender.id;

    try {
        await sendMessage(senderId, { text: 'Service currently not available' });
        await sendMessage(senderId, { text: defaultText });
    } catch (err) {
        console.error('An error occured in showActiveReferalls', err);
        await sendMessage(senderId, { text: 'An erro occured' });
        await sendMessage(senderId, { text: defaultText });
    };
};

// function to handle recieval of referral code\
async function sendReferralCodeRecieved(event: any) {
    console.log('in referral code::::::')
    const senderId = event.sender.id
    const message = event.message.text.trim();
    try {
        const referralCode = Number(message);

        if (referralCode === 0) {
            await sendMessage(senderId, { text: 'Welcome to BotSub, you will be credited with free data bonuses once you make your first data purchase. \nHurry while it last!' });
            await sendMessage(senderId, { text: 'You will also be credited with free data bonuses for your all your first purchase of the month' });
            await sendMessage(senderId, { text: defaultText });

            await BotUsers.updateOne(
                { id: senderId },
                { $set: { nextAction: null, referrer: 0, firstPurchase: true } }
            );
            return;
        };

        const referrer = await BotUsers.findOne({ id: referralCode });
        console.log('new conversation referer', referrer);

        if (!referrer) {
            await sendMessage(senderId, { text: 'The provided referral code is invalid' });
            return sendMessage(senderId, { text: 'Enter a valid referral code. \nIf no referrer enter 0' });
        } else {
            await sendMessage(senderId, { text: 'Welcome to BotSub, you and your referrer will be credited with free data bonuses once you make your first data purchase. \nHurry while it last!' });
            await sendMessage(senderId, { text: 'You will also be credited with free data bonuses for your all your first purchase of the month' });
            await sendTemplates(senderId, responseServices);
            await sendTemplates(senderId, responseServices2);
            await sendTemplates(senderId, responseServices3);
            await BotUsers.updateOne({ id: senderId }, {
                $set: { nextAction: null, referrer: Number(referralCode), firstPurchase: true }
            });
        };
    } catch (error) {
        console.error('error in referall code recieved responsedr', error);
        await sendMessage(senderId, { text: 'The provided referral code is invalid' });
        return sendMessage(senderId, { text: 'Enter a valid referral code. \nIf no referrer enter 0' });
    };
}; // end of sendeReferralCodeRecieved


// function to handle recieve referralBonus phone number
async function referralBonusPhoneNumberRecieved(event: any) {
    const senderId = event.sender.id;
    const referralBonusPhoneNumber = event.message.text.trim();
    const validateNum = validateNumber(referralBonusPhoneNumber);

    if (!validateNum) return sendMessage(senderId, { text: 'Phone number entred not valid. \nplease enter a valid phone number. \nEnter Q to cancel' });
    await sendMessage(senderId, { text: 'Number to deliver referral bonus to recieved.' });
    await BotUsers.updateOne(
        { id: senderId },
        {
            $set: {
                'purchasePayload.phoneNumber': validateNum,
                nextAction: null
            }
        }
    );
    confirmClaimReferralBonus(event);
}; // end of recieveReferralBonusPhone


// function to confirm claim referral
async function confirmClaimReferralBonus(event: any) {
    const senderId = event.sender.id;
    const response = await BotUsers.findOne({ id: senderId }).select('purchasePayload');
    // @ts-expect-error
    const { network, size, phoneNumber } = response.purchasePayload;

    await sendMessage(senderId, { text: `Product: ${network} ${size} referral bonus \nNumber: ${phoneNumber}` })
    await sendTemplates(senderId, referralTemp);
}; // end of claim referral bonus


// function to handle chnage referral bonus phone number
async function changeReferralBonusPhoneNumber(event: any) {
    const senderId = event.sender.id;
    const message = event.message.text.trim();
    const validatedNum = validateNumber(message);
    console.log('in change phone number');
    if (message.toLowerCase() === 'q') {
        console.log('in q cancel');
        sendMessage(senderId, { text: 'Change of Phone number cancled' });
        confirmClaimReferralBonus(event);
        await BotUsers.updateOne(
            { id: senderId },
            { $set: { nextAction: null } }
        );
        return;
    };

    if (!validatedNum) return sendMessage(senderId, { text: 'Phone number not valid. \nEnter a valid phone number of enter Q to cancel' });

    await sendMessage(senderId, { text: 'Phone number changed' });
    confirmClaimReferralBonus(event);
    await BotUsers.updateOne(
        { id: senderId },
        { $set: { nextAction: null } }
    );
}; // end of changeReferralBonusPhoneNumber



export {
    showReferralCode,
    showActiveReferalls,
    sendReferralCodeRecieved,
    referralBonusPhoneNumberRecieved,
    confirmClaimReferralBonus,
    changeReferralBonusPhoneNumber,
};