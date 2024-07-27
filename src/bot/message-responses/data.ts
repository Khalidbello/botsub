import BotUsers from "../../models/fb_bot_users";

const sendMessage = require('./send_message.js');

// function to handle buy data selected
async function handleBuyData(event: any) {
    const senderId = event.sender.id;
    const text = `Select network for data Purchase \n 1. MTN \n 2. GLO \n 3. Airtel \n 4. 9Mobile \n 0. cancel`;

    sendMessage(senderId, { text: text });
    await BotUsers.updateOne({ id: senderId }, {
        $set: { nextAction: 'selectDataNetwork' }
    });
}; // end of sendEmailEnteredResponse


// functiion to data network selected
const handleDataNetWorkSelected = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    if (message === '0') return console.log('Transaction cancled');
};



export {
    handleBuyData,
    handleDataNetWorkSelected,
}