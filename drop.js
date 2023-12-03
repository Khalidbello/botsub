const BotUsers = require('./../models/transactons.js');

async function drop () {
const resp = await BotUsers.drop();
  console.log(resp);
};
