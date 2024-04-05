// module that hoouses the functionality of adding up profit
const fsP = require('fs').promises;
const sendMessage = require('./send_message.js')

async function checkDataStatus(network) {
    const file = JSON.parse(await fsP.readFile('files/data-network-status.json', 'utf-8'));
    return file[network];
};

async function addDataProfit(response) {
    const dataDetails = JSON.parse(await fsP.readFile('files/data-deatails.json', 'utf-8'));
    const plan = dataDetails[response.data.meta.networkID][response.data.meta.planID];
    const profit = plan.price - (plan.price * 0.014) - plan.aPrice;
};


module.exports = { addDataProfit };