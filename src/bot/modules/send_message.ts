import axios from 'axios';

async function sendMessage(sender_psid: any, response: { text: string }) {
  try {
    // Construct the message body
    let request_body = {
      messaging_type: 'RESPONSE',
      recipient: {
        id: sender_psid,
      },
      message: response,
    };

    let resp = await axios.post('https://graph.facebook.com/v20.0/me/messages', request_body, {
      params: { access_token: process.env.FBM_TOKEN },
      headers: { 'Content-Type': 'application/json' },
    });

    //resp = await resp.data;
    //console.log(resp);
    return true;
  } catch (error: any) {
    if (error.response) {
      console.error('Response Error in send message:', error.response.data);
      console.error('Status Code  in send message:', error.response.status);
      console.error('Headers  in send message:', error.response.headers);
    } else if (error.request) {
      console.error('Request Error  in send message:', error.request);
    } else {
      console.error('Error  in send message:', error.message);
    }
    console.error('error sending message ,,,,,,,,, Config  in send message:', error.config);

    return false;
  }
}

export { sendMessage };
