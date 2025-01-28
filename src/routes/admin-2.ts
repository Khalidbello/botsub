import { Response, Request, response } from 'express';
import { Router } from 'express';
import BotUsers from '../models/fb_bot_users';
import { sendMessage } from '../bot/modules/send_message';
import {
  dataAccontDetails,
  doCustomFlwWebhook,
  fetchTransactionLists,
} from '../modules/admin/controls';
import WhatsaapBotUsers from '../models/whatsaap_bot_users';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';
import { isConversationOpenW } from '../bot/whatsaap_bot/helper_functions';
import { getRobustUserStatistics } from '../modules/admin/robust-users-statistics';
import { fundWallet } from '../modules/helper_functions';

const adminRouter2 = Router();

// api to set user bot response to false
adminRouter2.get('/get-bot-response/:senderId/:platform', async (req: Request, res: Response) => {
  try {
    let data;

    if (req.params.platform === 'facebook') {
      data = await BotUsers.findOne({ id: req.params.senderId }).select('botResponse');
    } else if (req.params.platform === 'whatsapp') {
      data = await WhatsaapBotUsers.findOne({ id: req.params.senderId }).select('botResponse');
    }

    res.json({ botResponse: data?.botResponse });
  } catch (err) {
    res.status(500).json({ error: 'An error occured getting user bot response' });
    console.error('An error occured in getting user bot response in /get-bot-response', err);
  }
});

// api route to set bot resposne
adminRouter2.post('/set-bot-response/:senderId', async (req: Request, res: Response) => {
  try {
    const { setTo, platform } = req.body;

    if (platform === 'facebook') {
      await BotUsers.updateOne({ id: req.params.senderId }, { $set: { botResponse: setTo } });
      res.json({ setTo: setTo });

      if (!setTo) {
        sendMessage(req.params.senderId, {
          text:
            `Automatic bot responses are currently disabled by the administrator.\nThis is likely due to a recent support ticket you submitted that is being actively addressed.` +
            `To re-enable automatic bot responses, please simply reply with the word "activate".`,
        });
      } else {
        sendMessage(req.params.senderId, { text: 'Auto bot response has been enabled.' });
      }
    } else if (platform === 'whatsapp') {
      await WhatsaapBotUsers.updateOne(
        { id: req.params.senderId },
        { $set: { botResponse: setTo } }
      );
      res.json({ setTo: setTo });
      const sendable = await isConversationOpenW(req.params.senderId);

      if (!setTo && sendable) {
        sendMessageW(
          req.params.senderId,
          `Automatic bot responses are currently disabled by the administrator.\nThis is likely due to a recent support ticket you submitted that is being actively addressed.` +
            `To re-enable automatic bot responses, please simply reply with the word "activate".`
        );
      }
      if (setTo && sendable) {
        sendMessageW(req.params.senderId, 'Auto bot response has been enabled.');
      }
    }
  } catch (err) {
    res.status(500).json({ error: 'An error occured getting setign bot response' });
    console.error('An error occured in setting user bot response in /set-bot-response', err);
  }
});

// route to get lsit of all specfic transaction from flutterwave, from specific date to specific date
adminRouter2.get(
  '/list-transactions/:from/:to/:status/:pageNum/:email',
  (req: Request, res: Response) => fetchTransactionLists(req, res)
);

// route to carry out custom webhook  // basiclally thsi just calls the handle webhook function with transaction details to carry redo process
adminRouter2.post('/custom-flw-webhook/:id', (req, res) => doCustomFlwWebhook(req, res));

// route to fetch user specific robust statistics
adminRouter2.get('/robust-users-statistics/:startDate/:endDate', (req, res) =>
  getRobustUserStatistics(req, res)
);

// route to get accoun name and return
adminRouter2.get('/transfer-account-info', (req: Request, res: Response) =>
  dataAccontDetails(req, res)
);

adminRouter2.post('/fund-wallet', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 100)
      return res.status(400).json({
        message:
          'Make sure amount and account number is provided in request bosy and amount is greater than 100',
      });

    const response = await fundWallet(
      process.env.BANK_CODE as string,
      process.env.DATA_WALLET_ACCOUNT_NUM as string,
      parseInt(amount)
    );

    return res.json({ status: response.status, message: response.message });
  } catch (err) {
    console.error('An error occured in /fund-wallet: ', err);
    res.status(500).json({ message: 'An error occured funding wallet' });
  }
});
export default adminRouter2;
