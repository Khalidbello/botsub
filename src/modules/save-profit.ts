// module that hoouses the functionality of adding up profit
import fs from 'fs';
import Profits from '../models/profits';

async function addDataProfit(networkID: number, index: number, date: Date, id: string) {
    const dataDetails = JSON.parse(await fs.promises.readFile('files/data-details.json', 'utf-8'));
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