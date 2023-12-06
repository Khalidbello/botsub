require('dotenv').config();
const Users = require('./../models/users.js');
const axios = require('axios');
const sendMessage = require('./../bot_modules/send_message.js');
const sendTemplate = require('./../bot_modules/send_templates.js');
const { failedMonthlyBonusTemplate } = require('./../bot_modules/templates.js');
const bonuses = {
    '1': '12',
    '2': '12',
    '3': '12',
    '4': '12'
};


// function to handle giving users free hundred mb for every new month first purchase
async function handleFirstMonthBonus(email, number, networkID, senderId = rfalse, retry = false) {
    console.log('in monthly bonuses');
    let flag;
    const user = await Users.findOne({ email: email });
    console.log('user collection', user);

    flag = await checkUserValidity(user, email);
    console.log('user collection flag=========== ', flag);
    if (flag) return deliverBonus(email, number, networkID, senderId);
    if (retry) sendMessage(senderId, { text: "Sorry you have already recieved for first month purchase bonus for this month" });
}; // end of first month purchase


// function to check if user is valid for new month data prchase bonus
async function checkUserValidity(user, email) {
    if (!user) {
        await Users.create({ email: email });
        return true;
    };

    if (!user.lastTransact) return true;
    console.log('user.lastTransact', user.lastTransact);
    const date = new Date();
    const prevDate = new Date(user.lastTransact);

    console.log('yera diff: ', date.getFullYear() - prevDate.getFullYear());
    console.log('month diff: ', date.getMonth() - prevDate.getMonth())
    if ((date.getFullYear() - prevDate.getFullYear() > 0) && (date.getMonth() - prevDate.getMonth() > 0)) return true;
    return false;
}; // end of checkUserVlidity


// function to set laastPurchase date
async function setLastPurchase(email) {
    await Users.updateOne({ email: email }, {
        $set: {
            lastTransact: Date(),
            failedMonthlyBonus: {}
        }
    });
}; // end of setLastTransact


// function to deliver bonus
async function deliverBonus(email, number, networkID, senderId) {
    console.log('datas', email, number, networkID, senderId);
    try {
        let response;
        if (process.env.NODE_ENV === 'production') {
            response = await axios.post('https://opendatasub.com/api/data/',
                {
                    network: Number(networkID),
                    mobile_number: number,
                    plan: Number(bonuses[networkID]),
                    Ported_number: true,
                }, {
                headers: {
                    Authorization: 'Token ' + process.env.OPENSUB_KEY,
                    'Content-Type': 'application/json',
                }
            });
        };
        if (true || response.data.Status === 'successful') {
            setLastPurchase(email); // function to update user info to prevent double delivery
            return await sendMessage(senderId, { text: `you've recieved 100MB on your ${number} line for your first transaction of the month...` });
        };
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
