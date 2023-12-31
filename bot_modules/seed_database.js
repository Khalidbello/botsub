const FbBotUsers = require('./../models/fb_bot_users.js');

// function to seed fb-bot-users with referaklls
async function seedFbBotUsers() {
    const response = await FbBotUsers.updateMany(
        {},
        { $set: { referrer: 0, firstPurchase: false } }
    );
    console.log(response);
}; // end of seedFb\botUs

module.exports = {
    seedFbBotUsers
};
