// module to house all data neteork checkimng tasks

const fsP = require('fs').promises;
const sendMessage = require('./send_message.js')

async function checkDataStatus(network) {
    const file = JSON.parse(await fsP.readFile('files/data-network-status.json', 'utf-8'));
    return file[network];
};


// function to  handle network not available requests
async function handleDataNetworkNotAvailable(senderId) {
    await sendMessage(senderId, {text: 'Sorry network is not available.'});
};


module.exports = {
    checkDataStatus,
    handleDataNetworkNotAvailable
}