import Transactions from '../../models/transactions';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { carryOutNonVAccount } from '../../modules/gateway';

const FlutterWave = require('flutterwave-node-v3');

// fucntion to retry all failed delivery
const retryAllFaledTransactions = async () => {
  try {
    const flw = new FlutterWave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    let loopCount = 0;

    while (true) {
      const transactions = await Transactions.find({ status: 'failed' }).limit(10);

      const tPromise = transactions.map(async (trnasaction) => {
        const response = await flw.Transaction.verify({ id: trnasaction.id }); // check again if transaction is succesful
        carryOutNonVAccount(response, true);
      });

      await Promise.all(tPromise);
      loopCount++;
      if (loopCount < 11 || transactions.length < 10) break;
    }
  } catch (err) {
    console.error('AN error occured in carrying out retry for all transactions', err);
  }
};

// function to check is window is still open to send user a message
const isConversationOpenW = async (senderId: string) => {
  try {
    const result = await WhatsappBotUsers.findOne({ id: senderId }).select('lastMessage');
    // @ts-expect-error result won'tbe null
    const lastMessageDate = new Date(result.lastMessage);
    const nowDate = new Date();

    const millisecondsIn24Hours = 24 * 60 * 60 * 1000;
    const difference = Math.abs(nowDate.getTime() - lastMessageDate.getTime());
    console.log('time difference in isConversationOpenW : ', difference);

    return difference < millisecondsIn24Hours;
  } catch (err) {
    console.error('An error occured in isConversationOpenW:  ', err);
    return false;
  }
};

export { isConversationOpenW, retryAllFaledTransactions };
