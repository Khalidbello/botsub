const FbBotUsers = require('./../models/fb_bot_users.js');

// function to seed fb-bot-users with referaklls
async function seedFbBotUsers() {
    const senderId = 6083883438362251;
    const data = {
        senderId: senderId,
        status: 'activated'
    };
    const response = await FbBotUsers.updateOne(
        { id: senderId }, 
        { $push: { referrals: data }}
    );
    console.log(response);
}; // end of seedFb\botUs

module.exports = {
seedFbBotUsers
};