// module to hold crediting of referrals for all bot types
const BotUsers = require('./../models/fb_bot_users.js');

async function creditReferrer(senderId) {
    const response = await BotUsers.findOneAndUpdate(
        { id: Number(senderId) },
        { $set: { firstPurchase: false } }
    ).select('referrer firstPurchase');
    // first check if ts really users first purchase
    console.log(response);
    if (!response.firstPurchase || !response.referrer) return console.log('user had no referrer, here is check on user first purchase:::::: ', response.firstPurchase);

    const update = await BotUsers.updateOne(
        { id: response.referrer },
        {
            $push: { referrals: { id: Number(senderId) } }
        }
    );
    console.log(update)
}; // end of credit fb


export {
    creditReferrer
};