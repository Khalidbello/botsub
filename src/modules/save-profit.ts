// module that hoouses the functionality of adding up profit
const Profits = require('./../models/profits.js');
const fsP = require('fs').promises;


async function addDataProfit(networkID, index, date, id) {
    const dataDetails = JSON.parse(await fsP.readFile('files/data-details.json', 'utf-8'));
    const plan = dataDetails[networkID][index];
    const profit = (plan.price - plan.price * 0.014) - plan.aPrice;
    const dat = new Date(date);

    const newProfit = new Profits({
        amount: profit,
        transactionId: id,
        transactionType: 'data',
        date: dat
    });


    await newProfit.save();
};


export { addDataProfit };