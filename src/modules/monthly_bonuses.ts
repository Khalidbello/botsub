import axios from "axios";
import { sendMessage } from "../bot/modules/send_message";
import BotUsers from "../models/fb_bot_users";
import Users from "../models/users";
import { failedMonthlyBonusTemplate } from "../bot/templates/templates";

require('dotenv').config();

const bonuses: { [key: string]: any } = {
    '1': { planID: 253, size: '150MB', network: 'MTN' },
    '2': { planID: 266, size: '200MB', network: 'GLO' },
    '3': { planID: 268, size: '500MB', network: '9mobile' },
    '4': { planID: 225, size: '100MB', network: 'Airtel' }
};


// function to handle giving users free hundred mb for every new month first purchase
async function handleFirstMonthBonus(email: string, number: string, networkID: number, senderId: string, retry: boolean) {
    console.log('in monthly bonuses retry: ', retry);
    let flagUser;
    let flagBotUser = true;
    //const user = await Users.findOne({ email: email });
    //flagUser = await checkUserValidity(user, email);

    if (senderId) {
        const botUser = await BotUsers.findOne({ id: senderId });
        if (botUser.firstTransactOfMonth) flagBotUser = validateDate(botUser.firstTransactOfMonth);
    };

    console.log('user collection flag=========== ', flagUser, flagBotUser);
    if (flagBotUser) return deliverBonus(email, number, networkID, senderId);
    if (retry) sendMessage(senderId, { text: "Sorry you have already recieved for first month purchase bonus for this month" });
    return;
}; // end of first month purchase


// function to check if user is valid for new month data prchase bonus
async function checkUserValidity(user: any, email: string) {
    if (!user) {
        await Users.create({ email: email });
        return true;
    };

    if (!user.firstTransactOfMonth) return true;
    return validateDate(user.firstTransactOfMonth);
}; // end of checkUserVlidity


// function to validate date
function validateDate(lastDate: string) {
    const date = new Date();
    const prevDate = new Date(lastDate);

    if ((date.getFullYear() > prevDate.getFullYear()) || (date.getFullYear() === prevDate.getFullYear() && date.getMonth() > prevDate.getMonth())) {
        return true;
    };
    console.log(date.getFullYear(), prevDate.getFullYear());
    console.log(date.getMonth(), prevDate.getMonth());
    return false;
} // end of validateDate


// function to set laastPurchase date
async function firstTransactOfMonth(toUse: string, type: string) {
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
async function deliverBonus(email: string, number: string, networkID: number, senderId: string) {
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

        if (process.env.TEST === 'pass' || (response && response.data.Status === 'successful')) {
            await firstTransactOfMonth(email, 'user'); // function to update user info to prevent double delivery
            if (senderId) {
                await firstTransactOfMonth(senderId, 'botUser');
                return await sendMessage(senderId, { text: `you've recieved ${bonus.size} on your ${number} ${bonus.network} line for your first transaction of the month...` });
            };
        };

        throw 'bonus delivery failed';
    } catch (err: any) {
        if (err.response) {
            console.log('Error response: ', err.response.data);
        } else if (err.request) {
            console.log('No response received: ', err.request);
        } else {
            console.log('Error: ', err.message);
        };
        await sendMessage(senderId, { text: "Sorry an error ocured while processing monthly" });
        // sendTemplate(senderId, failedMonthlyBonusTemplate(email, number, networkID));
    };
}; // end deliver bonus


export default handleFirstMonthBonus;