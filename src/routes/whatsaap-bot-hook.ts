// file to handle whatsaap bot webhook

import { Request, Response, Router } from 'express';

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
            console.log('Message:::: ', message);
            const from = message.from; // Sender's phone number
            const text = message.text ? message.text.body : ''; // Message text
            const user = await getUserName(from);
            console.log(`Message from ${from}: ${text}`);

            // Example: Reply to the user
            sendMessage(
              from,
              `Hy ${user}. \n\n I am *BotSub* whatsapp virtual assistant. \n\nWill be available on whatsaap soon.`
            );
          });
        }
      });
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Function to send a reply message using WhatsApp API
function sendMessage(recipientId: string, message: string) {
  const axios = require('axios');

  const url = `https://graph.facebook.com/v16.0/${process.env.WHATSAPP_NUM_ID}/messages`;
  const token = process.env.WHATSAPP_ACCESS_TOK; // Replace with your API token

  const data = {
    messaging_product: 'whatsapp',
    to: recipientId,
    text: { body: message },
  };

  axios
    .post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response: any) => {
      console.log('Message sent successfully:', response.data);
    })
    .catch((error: any) => {
      console.error('Error sending message:', error.response.data);
    });
}

const axios = require('axios');

async function getUserName(userNumber: string) {
  const phoneNumberId = process.env.WHATSAPP_NUM_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOK;
  const url = `https://graph.facebook.com/v16.0/${phoneNumberId}/contacts`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        fields: 'name',
        wa_id: userNumber,
      },
    });

    const userName = response.data.data[0]?.profile?.name || 'Unknown User';
    console.log(`User Name: ${userName}`);
    return userName;
  } catch (error: any) {
    console.error('Error fetching user name:', error.response?.data || error.message);
    return 'Unknown User';
  }
}

export default whatsaapRouter;
