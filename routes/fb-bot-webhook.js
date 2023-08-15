const processPostback = require('./../bot_modules/process_postback.js');

const processMessage = require('./../bot_modules/process_message.js');

const axios = require('axios');

const { Router } = require('express');

const router = Router();

router.get('/fb-hook', function (req, res) {
  console.log(process.env.FB_VERIFY_TOKEN);
  console.log(req.query['hub.verify_token']);
  if (req.query['hub.verify_token'] === process.env.FB_VERIFY_TOKEN) {
    console.log('webhook verified');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error('verification failed. Token mismatch.');
    res.sendStatus(403);
  }
}); // end of webhook get req

router.post('/fb-hook', async function (req, res) {
  //checking for page subscription.
  if (req.body.object === 'page') {
    /* Iterate over each entry, there can be multiple entries allbacks are batched. */
    req.body.entry.forEach(function (entry) {
      // Iterate over each messaging event
      console.log('entry,0', entry);
      entry.messaging.forEach(function (event) {
        console.log(event);
        let sender_psid = event.sender.id;
        console.log('Sender PSID: ' + sender_psid);
        if (event.postback) {
          processPostback(event, res);
        } else if (event.message) {
          processMessage(event, res);
        }
      });
    });
  }
  res.sendStatus(200);
}); // end of webhook post req

router.get('/set-persist', async (req, res) => {
  const PAGE_ACCESS_TOKEN = process.env.FBM_TOKEN;
  const PAGE_ID = process.env.PAGE_ID;

  async function setPersistentMenu() {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          persistent_menu: [
            {
              locale: 'default',
              composer_input_disabled: false,
              call_to_actions: [
                {
                  title: 'Get Started',
                  type: 'postback',
                  payload: 'newConversation',
                },
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
                  type: 'postback',
                  title: 'Report Issue',
                  payload: '{"title": "issueReport"}',
                },
              ],
            },
          ],
        }
      );

      console.log('Persistent menu set successfully.');
      res.json('Persistent menu set successfully');
    } catch (error) {
      console.error('Error setting persistent menu:', error.response.data);
    }
  }

  await setPersistentMenu();
}); // end of persistent menu

router.get('/set-get-started', (req, res) => {
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
    .then((response) => {
      res.send('Get started payload set successfully');
      console.log('Get started payload set successfully.');
    })
    .catch((error) => {
      console.error('Failed to set the get started payload:', error);
    });
});

module.exports = router;
