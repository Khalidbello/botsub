// module to house all data neteork checkimng tasks

const fsP = require('fs').promises;
const sendMessage = require('./send_message.js')

async function checkDataStatus(network) {
    const file = JSON.parse(await fsP.readFile('files/data-network-status.json', 'utf-8'));
    return file[network];
};


// function to update network status basedd on most recent transaction carried out on the specific network provider
async function updateNetworkStatus(network, status) {
    try {
        // Read the file content
        const fileContent = await fsP.readFile('files/data-network-status.json', 'utf-8');

        // Parse the JSON content into a JavaScript object
        let data = JSON.parse(fileContent);

        // Modify the object as needed
        data[network] = status;

        // Convert the modified object back to JSON
        const updatedContent = JSON.stringify(data, null, 2);

        // Write the JSON content back to the file
        await fsP.writeFile('files/data-network-status.json', updatedContent);

        console.log('File updated successfully.');
    } catch (error) {
        console.error('Error updating file for network status:', error);
        throw error;
    }
};

// function to  handle network not available requests
async function handleDataNetworkNotAvailable(senderId, network) {
    await sendMessage(senderId, { text: `Sorry ${network} network is not available at the moment. \nPlease try again later.` });
};


export {
    checkDataStatus,
    handleDataNetworkNotAvailable,
    updateNetworkStatus
}