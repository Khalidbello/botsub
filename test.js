const fs = require('fs');
const axios = require( 'axios');


const   calculateNetworkDataProfit = async ()=> {
    let totalProfit = 0;
    let count = 0;
    const fileContent =  await fs.promises.readFile('files/data-details.json', 'utf-8');
    let data = JSON.parse(fileContent);
   
    for (const networkId in data) {
      const plans = data[networkId];
      for (const planId in plans) {
        const planData = plans[planId];
        const network = planData.network;
        const price = planData.price;
        const aPrice = planData.aPrice;
        const flutterCharges = price * 0.014;
        const vat = flutterCharges * 0.07;

        // Calculate profit
        const profit = (price - flutterCharges - vat) - aPrice;
  
        totalProfit += profit;
        count ++;

        // Log the network and profit
        console.log(
          `Network: ${network}, Plan ID: ${planData.planID}, Plan: ${planData.size}, Price: ${price}, Profit: ${profit.toFixed(2)}`
        );
      }
    }
    console.log('Average profit per offer: ', totalProfit / count);
  }

  
  
const testTermil = ()=> {
  const data = {
  "to": "2349166871328",
  "from": "talert",
  "sms": "Hi there, testing Termii",
  "type": "plain",
  "api_key": "TLsIAbGbPVIGQrigwDbYMEJkPnsTnShZFFZwquYtLRIUckrLZqqiREgGhgeyQk",
  "channel": "generic",
  };

const options = {
  method: 'post',
  url: 'https://v3.api.termii.com/api/sms/send',
  headers: {
    'Content-Type': 'application/json'
  },
  data: data // Axios handles JSON stringification automatically
};

axios(options)
  .then(response => {
    console.log(response.data); // Access response.data for the body
  })
  .catch(error => {
    console.error(error);
  });
}

/**
 * Fetches list of banks and their codes from Flutterwave API,
 * then filters by the first three letters of bank name
 * @param countryCode - 2-letter country code (e.g., 'NG' for Nigeria)
 * @param flutterwaveSecretKey - Your Flutterwave secret key
 * @param bankNameStart - First 3 letters of bank name to filter by (case insensitive)
 * @returns Promise with array of matching banks containing name and code
 */
async function fetchBankCodes(
  countryCode = 'NG',
  flutterwaveSecretKey,
  bankNameStart
) {
  try {
    // Validate input
    if (!bankNameStart || bankNameStart.length !== 3) {
      throw new Error('Please provide exactly 3 starting letters of bank name');
    }

    const response = await axios.get(
      `https://api.flutterwave.com/v3/banks/${countryCode}`,
      {
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
        },
      }
    );

    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to fetch banks');
    }

    // Filter banks by first 3 letters (case insensitive)
    const searchPrefix = bankNameStart.toLowerCase();
    const matchingBanks = response.data.data
      .filter(bank => 
        bank.name.toLowerCase().startsWith(searchPrefix));

        console.log(matchingBanks)
    return matchingBanks;
    
  } catch (error) {
    console.error('Error fetching bank codes:', error);
    throw new Error('Failed to retrieve bank list from Flutterwave');
  }
}

// const matchedBanks = await fetchBankCodes('NG', 'YOUR_FLW_SECRET_KEY', 'gtb');
// console.log(matchedBanks); // Returns all banks starting with "gtb"
// Usage example:
 banks =   fetchBankCodes('NG', 'FLWSECK-7f22111f57ae63ee3cbed6305979cfa3-190cfda5185vt-X', 'uni');
console.log(banks);
//calculateNetworkDataProfit();