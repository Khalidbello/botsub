import axios from 'axios';

// Function to send a reply message using WhatsApp API
const sendMessageW = async (recipientId: string, message: string) => {
  try {
    const url = `https://graph.facebook.com/v16.0/${process.env.WHATSAPP_NUM_ID}/messages`;
    const token = process.env.WHATSAPP_ACCESS_TOK; // Replace with your API token

    const data = {
      messaging_product: 'whatsapp',
      to: recipientId,
      text: { body: message },
    };

    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('Message sent successfully:', response.data);
    return true;
  } catch (error: any) {
    console.error('Error sending message:', error.response?.data || error.message);
    return false;
  }
};

export default sendMessageW;
