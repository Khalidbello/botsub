import * as fs from 'fs';
import { sendMessage } from '../fb_bot/modules/send_message';

async function checkDataStatus(network: string) {
  const file = JSON.parse(await fs.promises.readFile('files/data-network-status.json', 'utf-8'));
  return file[network].status;
}

// function to update network status basedd on most recent transaction carried out on the specific network provider
async function updateNetworkStatus(network: string, status: boolean, info: any) {
  try {
    let processedInfo = '';

    if (Array.isArray(info)) {
      // 1. If it's a list, join elements with a comma
      processedInfo = info.join(', ');
    } else if (typeof info === 'object' && info !== null) {
      // 2. If it's an object, extract the values (e.g., {error: 'Timeout'} becomes 'Timeout')
      // You can also use Object.entries(info).map(([k, v]) => `${k}: ${v}`).join(', ')
      // if you want the keys included.
      processedInfo = Object.values(info).join(' - ');
    } else {
      // 3. If it's already a string or number, just convert to String
      processedInfo = info ? String(info) : 'Network working fine';
    }

    // Read and Parse
    const fileContent = await fs.promises.readFile('files/data-network-status.json', 'utf-8');
    let data = JSON.parse(fileContent);

    // Update with the clean string
    data[network] = {
      status: status,
      info: processedInfo,
    };

    const updatedContent = JSON.stringify(data, null, 2);
    await fs.promises.writeFile('files/data-network-status.json', updatedContent);

    console.log('File updated successfully.');
  } catch (error) {
    console.error('Error updating file:', error);
  }
}

// function to  handle network not available requests
async function handleDataNetworkNotAvailable(senderId: string, network: string) {
  await sendMessage(senderId, {
    text: `Sorry ${network} network is not available at the moment. \nPlease try again later.`,
  });
}

export { checkDataStatus, handleDataNetworkNotAvailable, updateNetworkStatus };
