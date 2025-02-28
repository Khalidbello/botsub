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