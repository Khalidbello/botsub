import { Request, Response, NextFunction, Router } from 'express';
import { processPostback } from '../bot/process_postback';
import processMessage from '../bot/process_message';
import axios from 'axios';
const fbBotRouter = Router();

fbBotRouter.get('/fb-hook', function (req: Request, res: Response) {
  const token = process.env.FB_VERIFICATION_KEY;
  console.log('in facebook webhook verification', token);
  console.log(req.query['hub.verify_token']);
  if (req.query['hub.verify_token'] === token) {
    console.log('webhook verified');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error('verification failed. Token mismatch.');
    //res.sendStatus(403).send("403 does not match");
  }
}); // end of webhook get req

fbBotRouter.post('/fb-hook', async function (req: Request, res: Response) {
  //checking for page subscription.
  if (req.body.object === 'page') {
    /* Iterate over each entry, there can be multiple entries allbacks are batched. */
    req.body.entry.forEach(function (entry: any) {
      // Iterate over each messaging event
      //console.log('entry,0', entry);
      entry.messaging.forEach(function (event: any) {
        //console.log(event);
        // let sender_psid = event.sender.id;
        // console.log('Sender PSID: ' + sender_psid);
        if (event.postback) {
          processPostback(event, res);
        } else if (event.message) {
          //writeMessageToJson(`passed to process message`);
          processMessage(event, res);
        }
      });
    });
  }

  res.sendStatus(200);
}); // end of webhook post req

fbBotRouter.get('/set-persist', async (req: Request, res: Response) => {
  const PAGE_ACCESS_TOKEN = process.env.FBM_TOKEN;
  const PAGE_ID = process.env.PAGE_ID;

  async function setPersistentMenu() {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          persistent_menu: [
            {
              locale: 'default',
              composer_input_disabled: false,
              call_to_actions: [
                {
                  title: 'Buy Data',
                  type: 'postback',
                  payload: '{"title": "dataPurchase"}',
                },
                {
                  title: 'Buy Airtime',
                  type: 'postback',
                  payload: '{"title": "airtimePurchase"}',
                },
                {
                  title: 'View Data Prices',
                  type: 'postback',
                  payload: '{"title": "dataPrices"}',
                },
                {
                  type: 'postback',
                  title: 'Report Issue',
                  payload: '{"title": "issueReport"}',
                },
              ],
            },
          ],
        }
      );

      console.log('Persistent menu set successfully.', response.data);
      res.json('Persistent menu set successfully');
    } catch (error: any) {
      console.error('Error setting persistent menu:', error.response.data);
    }
  }

  await setPersistentMenu();
}); // end of persistent menu

fbBotRouter.get('/set-get-started', (req: Request, res: Response) => {
  const accessToken = process.env.FBM_TOKEN;
  const pageId = process.env.PAGE_ID;

  // Construct the API endpoint URL
  const apiUrl = `https://graph.facebook.com/v17.0/me/messenger_profile?access_token=${accessToken}`;

  // Construct the payload for the POST request
  const requestBody = {
    get_started: {
      payload: 'newConversation',
    },
  };

  // Make the POST request to set the get started payload
  axios
    .post(apiUrl, requestBody)
    .then((response: any) => {
      res.send('Get started payload set successfully');
      console.log('Get started payload set successfully.');
    })
    .catch((error: any) => {
      console.error('Failed to set the get started payload:', error);
    });
});

export default fbBotRouter;
