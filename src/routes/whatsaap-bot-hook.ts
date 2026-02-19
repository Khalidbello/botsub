// file to handle whatsaap bot webhook

import { Request, Response, Router } from 'express';
import processMessage from '../bot/unified/process_message';

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
            processMessage('WA', message, res);
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
