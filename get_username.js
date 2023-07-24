import axios from "axios";


export default async function getUsernane (userId) {
  let response = await axios.post(
    'https://graph.facebook.com/v2.6/me/messages' + userId,
    {},
    {
      params: { 
        access_token: process.env.FBM_TOKEN,
        fields: "first_name"
      },
      headers: { 'Content-Type': 'application/json' }
    }
  )
  .catch(error => {
    console.log('Error sending message:', error.response.data.error.message);
  }); 

  response = await response.data;
  return response.first_name;
};  // end of getUsername
