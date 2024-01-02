require('dotenv').config();
const Users = require('./../models/users.js');
const BotUsers = require('../models/fb_bot_users.js')
const axios = require('axios');
const sendMessage = require('./../bot_modules/send_message.js');
const sendTemplate = require('./../bot_modules/send_templates.js');
const { failedMonthlyBonusTemplate } = require('./../bot_modules/templates.js');
const bonuses = {
    '1': { planID: 253, size: '150MB', network: 'MTN' },
    '2': { planID: 266, size: '200MB', network: 'GLO' },
    '3': { planID: 268, size: '500MB', network: '9mobile' },
    '4': { planID: 225, size: '100MB', network: 'Airtel' }
};


// function to handle giving users free hundred mb for every new month first purchase
async function handleFirstMonthBonus(email, number, networkID, senderId = false, retry = false) {
    console.log('in monthly bonuses retry: ', retry);
    let flagUser;
    let flagBotUser = true;
    const user = await Users.findOne({ email: email });
    flagUser = await checkUserValidity(user, email);

    if (senderId) {
        const botUser = await BotUsers.findOne({ id: senderId });
        if (botUser.firstTransactOfMonth) flagBotUser = validateDate(botUser.firstTransactOfMonth);
    };

    console.log('user collection flag=========== ', flagUser, flagBotUser);
    if (flagUser && flagBotUser) return deliverBonus(email, number, networkID, senderId);
    if (retry) sendMessage(senderId, { text: "Sorry you have already recieved for first month purchase bonus for this month" });
    return;
}; // end of first month purchase


// function to check if user is valid for new month data prchase bonus
async function checkUserValidity(user, email) {
    if (!user) {
        await Users.create({ email: email });
        return true;
    };

    if (!user.firstTransactOfMonth) return true;
    return validateDate(user.firstTransactOfMonth);
}; // end of checkUserVlidity


// function to validate date
function validateDate(lastDate) {
    const date = new Date();
    const prevDate = new Date(lastDate);

    if ((date.getFullYear() - prevDate.getFullYear() > 0) && (date.getMonth() - prevDate.getMonth() > 0)) return true;
    return false;
}; // end of validateDates


// function to set laastPurchase date
async function firstTransactOfMonth(toUse, type) {
    if (type === 'user') {
        await Users.updateOne({ email: toUse }, {
            $set: {
                firstTransactOfMonth: Date()
            }
        });
    } else if (type === 'botUser') {
        await BotUsers.updateOne({ id: toUse }, {
            $set: {
                firstTransactOfMonth: Date()
            }
        });
    };
}; // end of setfirstTransactOfMonth


// function to deliver bonus
async function deliverBonus(email, number, networkID, senderId) {
    console.log('datas', email, number, networkID, senderId);
    const bonus = bonuses[networkID];
    try {
        let response;
        if (process.env.NODE_ENV === 'production') {
            response = await axios.post('https://opendatasub.com/api/data/',
                {
                    network: Number(networkID),
                    mobile_number: number,
                    plan: bonus.planID,
                    Ported_number: true,
                }, {
                headers: {
                    Authorization: 'Token ' + process.env.OPENSUB_KEY,
                    'Content-Type': 'application/json',
                }
            });
        };
        if (process.env.TEST === 'pass' || response.data.Status === 'successful') {
            await firstTransactOfMonth(email, type = 'user'); // function to update user info to prevent double delivery
            if (senderId) {
                await firstTransactOfMonth(senderId, type = 'botUser');
                return await sendMessage(senderId, { text: `you've recieved ${bonus.size} on your ${number} ${bonus.network} line for your first transaction of the month...` });
            };
        };
        throw 'bonus delivery failed';
    } catch (err) {
        if (err.response) {
            console.log('Error response: ', err.response.data);
        } else if (err.request) {
            console.log('No response received: ', err.request);
        } else {
            console.log('Error: ', err.message);
        };
        await sendMessage(senderId, { text: "Sorry an error ocured while processing monthly" });
        sendTemplate(senderId, failedMonthlyBonusTemplate(email, number, networkID));
    };
}; // end deliver bonus

module.exports = handleFirstMonthBonus;
