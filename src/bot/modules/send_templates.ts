// module to send templates

import axios from 'axios';

async function sendTemplates(senderId: string, template: any) {
  try {
    const request_body = {
      recipient: { id: senderId },
      message: {
        attachment: template,
      },
    };

    await axios.post('https://graph.facebook.com/v20.0/me/messages', request_body, {
      params: { access_token: process.env.FBM_TOKEN },
      headers: { 'Content-Type': 'application/json' },
    });
    return;
  } catch (error: any) {
    if (error.response) {
      console.error('Response Error in sendTemplates :', error.response.data);
      console.error('Status Code in sendTemplates :', error.response.status);
      console.error('Headers in sendTemplates :', error.response.headers);
    } else if (error.request) {
      console.error('Request Error in sendTemplates :', error.request);
    } else {
      console.error('Error in sendTemplates :', error.message);
    }
    //console.error('error sending template ,,,,,,,,, Config:', error.config);
    console.log('acess tokennnnnnnnnnnnnn in sendTemplates :', process.env.FBM_TOKEN);
  }
} // end of sendTemplates

export default sendTemplates;
