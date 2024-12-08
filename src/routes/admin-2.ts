import { Response, Request } from 'express';
import { Router } from 'express';
import BotUsers from '../models/fb_bot_users';
import { sendMessage } from '../bot/modules/send_message';

const adminRouter2 = Router();

// api to set user bot response to false
adminRouter2.get('/get-bot-response/:senderId', async (req: Request, res: Response) => {
  try {
    const data = await BotUsers.findOne({ id: req.params.senderId }).select('botResponse');

    res.json({ botResponse: data?.botResponse });
  } catch (err) {
    res.status(500).json({ error: 'An error occured getting user bot response' });
    console.error('An error occured in getting user bot response in /get-bot-response', err);
  }
});

// api route to set bot resposne
adminRouter2.post('/set-bot-response/:senderId', async (req: Request, res: Response) => {
  try {
    const setTo = req.body.setTo;

    await BotUsers.updateOne({ id: req.params.senderId }, { $set: { botResponse: setTo } });
    res.json({ setTo: setTo });

    if (!setTo) {
      sendMessage(req.params.senderId, {
        text:
          `Automatic bot responses are currently disabled by the administrator.\nThis is likely due to a recent support ticket you submitted that is being actively addressed.` +
          `To re-enable automatic bot responses, please simply reply with the word "activate".`,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'An error occured getting setign bot response' });
    console.error('An error occured in setting user bot response in /set-bot-response', err);
  }
});

//
export default adminRouter2;