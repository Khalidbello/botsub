import axios from "axios";

// Function to get the user's name
async function getUserName(userId: string) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${userId}?fields=first_name&access_token=${process.env.FBM_TOKEN}`
    );
    console.log('user info reapnse ', response.data);
    return response.data.first_name;
  } catch (error) {
    console.error('Error while fetching user information:', error);
    console.log('fbm token', process.env.FBM_TOKEN);
    return null;
  }
}

export { getUserName };
