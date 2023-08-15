const axios = require('axios');

async function sendMessage(sender_psid, response, cb = false, rep) {
  // Construct the message body
  let request_body = {
    messaging_type: 'RESPONSE',
    recipient: {
      id: sender_psid,
    },
    message: response,
  };

  let resp = await axios
    .post('https://graph.facebook.com/v17.0/me/messages', request_body, {
      params: { access_token: process.env.FBM_TOKEN },
      headers: { 'Content-Type': 'application/json' },
    })
    .catch((error) => {
      console.log('Error sending message:', error.response.data.error.message);
    });

  resp = await resp.data;
  console.log(resp);
}

module.exports = sendMessage;
