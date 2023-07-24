import axios from "axios";

export default async function typingAction (sender_psid) {
    // Construct the message body
  let request_body =   {
    "recipient":{
      "id":sender_psid
    },
    "sender_action":"typing_on"
  }
  let resp = await axios.post(
    'https://graph.facebook.com/v2.6/me/messages',
    request_body,
    {
      params: { access_token: process.env.FBM_TOKEN },
      headers: { 'Content-Type': 'application/json' }
    }
  )
  .catch(error => {
    console.log('Error sending message:', error.response.data.error.message);
  });

  resp = await resp.data;
  console.log(resp);
}; // end of typingAction
