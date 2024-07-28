import BotUsers from "../../models/fb_bot_users";

// function to seed fb-bot-users with referaklls
async function seedFbBotUsers() {
    const response = await BotUsers.updateMany(
        {},
        { $set: { referrer: 0, firstPurchase: false } }
    );
    console.log(response);
}; // end of seedFb\botUs

export {
    seedFbBotUsers
};
