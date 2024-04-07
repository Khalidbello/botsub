// module that hoouses the functionality of adding up profit
const Profits = require('./../models/profits.js');
const fsP = require('fs').promises;


async function addDataProfit(response) {
    const dataDetails = JSON.parse(await fsP.readFile('files/data-details.json', 'utf-8'));
    const plan = dataDetails[response.data.meta.networkID][response.data.meta.index];
    const profit = (plan.price - plan.price * 0.014) - plan.aPrice;
    const dat = new Date(response.data.created_at);
    
    const newProfit = new Profits({
        amount: profit,
        transactionId: response.data.id,
        transactionType: 'data',
        date: dat
    });
    

    await newProfit.save();
};


module.exports = { addDataProfit };