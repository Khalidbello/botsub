// file to handle whatsaap bot webhook

import { Request, Response, Router } from 'express';
import processMessageW from '../bot/whatsaap_bot/process_message';

const whatsaapRouter = Router();

// Webhook verification (GET request)
whatsaapRouter.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAAP_VERIF_TOKEN; // Replace with your token

  // Verify the webhook subscription
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// route to handle post requests
whatsaapRouter.post('/webhook', (req: Request, res: Response) => {
  const body = req.body;

  // Check if the incoming request is from WhatsApp
  if (body.object === 'whatsapp_business_account') {
    // Iterate over all changes in the webhook payload
    body.entry.forEach((entry: any) => {
      const changes = entry.changes;
      changes.forEach((change: any) => {
        const messageData = change.value.messages;
        if (messageData) {
          // Handle incoming messages
          messageData.forEach(async (message: any) => {
            processMessageW(message);
            // console.log('Message:::: ', message);
            // const from = message.from; // Sender's phone number
            // const text = message.text ? message.text.body : ''; // Message text
            // const user = await getUserName(from);
            // console.log(`Message from ${from}: ${text}`);

            // // Example: Reply to the user
            // sendMessage(
            //   from,
            //   `Hi ${user}. \n\n I am *BotSub* whatsapp virtual assistant. \n\nWill be available on whatsaap soon.`
            // );
          });
        }
      });
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

export default whatsaapRouter;
