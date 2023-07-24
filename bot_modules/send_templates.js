// module to send templates

import axios from "axios";

export default async function sendTemplates (senderId, template) {
  const request_body = {
    "recipient": {"id": senderId},
    "message":{
      "attachment": template
    }
  };

  let resp = await axios.post(
    'https://graph.facebook.com/v17.0/me/messages',
    request_body,
    {
      params: { access_token: process.env.FBM_TOKEN },
      headers: { 'Content-Type': 'application/json' }
    }
  )
  .catch(error => {
    console.log('Error sending message:', error.response.data.error.message);
  });
}; // end of sendTemplates
 