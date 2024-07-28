// module to send templates

import axios from "axios";

async function sendTemplates(senderId: string, template: any) {
  const request_body = {
    recipient: { id: senderId },
    message: {
      attachment: template,
    },
  };

  let resp = await axios
    .post('https://graph.facebook.com/v20.0/me/messages', request_body, {
      params: { access_token: process.env.FBM_TOKEN },
      headers: { 'Content-Type': 'application/json' },
    })
    .catch((error: any) => {
      if (error.response) {
        console.error('Response Error:', error.response.data);
        console.error('Status Code:', error.response.status);
        console.error('Headers:', error.response.headers);
      } else if (error.request) {
        console.error('Request Error:', error.request);
      } else {
        console.error('Error:', error.message);
      }
      //console.error('error sending template ,,,,,,,,, Config:', error.config);
      console.log('acess tokennnnnnnnnnnnnn', process.env.FBM_TOKEN);

    });
}; // end of sendTemplates


export default sendTemplates;
