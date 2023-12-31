const BotUsers = require('./models/fb_bot_users.js');

async function speedUpUsers () {
const resp = await BotUsers.findByIdAndUpdate(
  {},
  { $set: { referrer: 0, firstPurchase: false }}
);
  console.log(resp);
};
