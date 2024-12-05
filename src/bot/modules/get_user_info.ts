import axios from 'axios';

// Function to get the user's name
async function getUserName(userId: string) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${userId}?fields=first_name&access_token=${process.env.FBM_TOKEN}`
    );
    console.log('user info reapnse in getUserName ', response.data);
    return response.data.first_name;
  } catch (error) {
    console.error('Error while fetching user information ingetUserName :', error);
    console.log('fbm token in getUserName: ', process.env.FBM_TOKEN);
    return null;
  }
}

export { getUserName };
