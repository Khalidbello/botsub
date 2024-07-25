const axios = require('axios');

async function sendMessage(sender_psid: string, response: { text: string }) {
  try {
    // Construct the message body
    let request_body = {
      messaging_type: 'RESPONSE',
      recipient: {
        id: sender_psid,
      },
      message: response,
    };

    let resp = await axios
      .post('https://graph.facebook.com/v20.0/me/messages', request_body, {
        params: { access_token: process.env.FBM_TOKEN },
        headers: { 'Content-Type': 'application/json' },
      });

    resp = await resp.data;
    console.log(resp);
  } catch (error: any) {
    if (error.response) {
      console.error('Response Error:', error.response.data);
      console.error('Status Code:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    console.error('error sending message ,,,,,,,,, Config:', error.config);
  };
};


export { sendMessage };
