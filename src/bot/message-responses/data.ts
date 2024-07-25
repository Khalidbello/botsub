const sendMessage = require('./send_message.js');

// function to handle buy data selected
async function handleBuyData(event) {
    const senderId = event.sender.id;
    const text = `Select network for data Purchase \n 1. MTN \n 2. GLO \n 3. Airtel \n 4. 9Mobile \n 0. cancel`;

    sendMessage(senderId, { text: text });
    await BotUsers.updateOne({ id: senderId }, {
        $set: { nextAction: 'selectDataNetwork' }
    });
}; // end of sendEmailEnteredResponse


// functiion to data network selected
const handleDataNetWorkSelected = async (event) => {
    const senderId = event.sender.id;
    const message = event.message.text.trim();

    if (message = '0') return console.log('Transaction cancled');

    if 
}
export {
    handleBuyData,
}