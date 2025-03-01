const fs = require('fs');

const   calculateNetworkDataProfit = async ()=> {
    const fileContent =  await fs.promises.readFile('files/data-details.json', 'utf-8');
    let data = JSON.parse(fileContent);
   
    for (const networkId in data) {
      const plans = data[networkId];
      for (const planId in plans) {
        const planData = plans[planId];
        const network = planData.network;
        const price = planData.price;
        const aPrice = planData.aPrice;
  
        // Calculate profit
        const profit = price - price * 0.014 - aPrice;
  
        // Log the network and profit
        console.log(
          `Network: ${network}, Plan: ${planData.size}, Profit: ${profit.toFixed(2)}`
        );
      }
    }
  }


  calculateNetworkDataProfit();

  const axios = require('axios');

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

//testTermil();