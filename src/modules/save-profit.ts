// module that hoouses the functionality of adding up profit
import fs from 'fs';
import Profits from '../models/profits';
import { sendReferralCodeRecieved } from '../bot/fb_bot/message-responses/referral_message_responses';

async function addDataProfit(
  senderId: string,
  transactionId: string,
  amountPaid: number,
  planAmount: number,
  transactionType: string,
  paymentAccountType: 'oneTime' | 'virtual',
  networkID: number,
  index: number,
  date: any
) {
  try {
    let profit = 0;
    const dateObj = new Date(date);

    // if purchase is data calculate profit get data price an calcualte profit
    if (transactionType === 'data') {
      const dataDetails = JSON.parse(
        await fs.promises.readFile('files/data-details.json', 'utf-8')
      );
      const plan = dataDetails[networkID][index];

      const flutterCharges = amountPaid * 0.014;
      const vat = flutterCharges * 0.07;

      // Calculate profit
      profit = amountPaid - flutterCharges - vat - (planAmount || plan.aPrice);

      console.log('Plan amount in add to profit and aPrice: ', planAmount, plan.aPrice);
    }

    const newProfit = new Profits({
      senderId: senderId,
      amount: profit,
      transactionId: transactionId,
      transactionType: 'data',
      date: dateObj,
      paymentAccountType: paymentAccountType,
    });

    await newProfit.save();
    return true;
  } catch (err) {
    console.error('An error occured while saving profit in addDataProfit', err);
  }
}

export { addDataProfit };
