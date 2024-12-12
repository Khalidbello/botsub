import * as fs from 'fs';
import { sendMessage } from './send_message';

async function checkDataStatus(network: string) {
  const file = JSON.parse(await fs.promises.readFile('files/data-network-status.json', 'utf-8'));
  return file[network].status;
}

// function to update network status basedd on most recent transaction carried out on the specific network provider
async function updateNetworkStatus(network: string, status: boolean, info: string) {
  try {
    // Read the file content
    const fileContent = await fs.promises.readFile('files/data-network-status.json', 'utf-8');

    // Parse the JSON content into a JavaScript object
    let data = JSON.parse(fileContent);

    // Modify the object as needed
    data[network] = { status: status, info: info };

    // Convert the modified object back to JSON
    const updatedContent = JSON.stringify(data, null, 2);

    // Write the JSON content back to the file
    await fs.promises.writeFile('files/data-network-status.json', updatedContent);

    console.log('File updated successfully.');
  } catch (error) {
    console.error('Error updating file for network status:', error);
    throw error;
  }
}

// function to  handle network not available requests
async function handleDataNetworkNotAvailable(senderId: string, network: string) {
  await sendMessage(senderId, {
    text: `Sorry ${network} network is not available at the moment. \nPlease try again later.`,
  });
}

export { checkDataStatus, handleDataNetworkNotAvailable, updateNetworkStatus };
