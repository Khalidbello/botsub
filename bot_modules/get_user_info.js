import axios from 'axios';

// Function to get the user's name
async function getUserName(userId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${userId}?fields=name&access_token=${process.env.FBM_TOKEN}`
    );
    console.log('user info reapnse ', response);
    return response.data.name;
  } catch (error) {
    console.error('Error while fetching user information:', error);
    return null;
  }
}

/*/ Usage example
const userId = 'USER_ID_RECEIVED_FROM_MESSENGER_API';
getUserName(userId)
  .then(name => {
    if (name) {
      console.log('User name:', name);
      // You can use the name for further interactions with the user
    } else {
      console.log('Unable to fetch user name.');
    }
  });*/

export default getUserName;
