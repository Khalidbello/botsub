const axios = require('axios');

const getDataWalletBalance =async ()=> {
    const options = {
        method: 'GET',
        url: 'https://opendatasub.com/api/user/',
        headers: {
          Authorization: 'Token 8d2bdc758b8a684a20450f86b08d8aaffafdfadc',
          'Content-Type': 'application/json'
        }
      };
        //
        const response = await axios.request(options);
        console.log(response.data.user.wallet_balance);
        return response?.data?.user?.wallet_balance;
};


  // handler to handle wallet balance request and data platform balance request
const getFlutterWaveBalance = async () => {
    const options = {
      method: 'GET',
      url: 'https://api.flutterwave.com/v3/balances/NGN',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer FLWSECK-7f22111f57ae63ee3cbed6305979cfa3-190cfda5185vt-X`,
        'Content-Type': 'application/json',
      },
    };
  
    const response = await axios.request(options);
    console.log('balace repnse in handle balances: ', response?.data);
    return response?.data?.available_balance;
  };

  // function to get transferable balance 
  const getTransferBalance =async ()=> {
    const options = {
        method: 'POST',
        url: 'https://api.ravepay.co/v2/gpx/balance',
        headers: {accept: 'application/json', 'Content-Type': 'application/json'},
        data: {currency: 'NGN', seckey: 'FLWSECK-7f22111f57ae63ee3cbed6305979cfa3-190cfda5185vt-X'}
      };
      
      const response = await axios.request(options);
    console.log('transferable balances: ', response?.data);
    return response?.data?.available_balance;
  }

const getAccountInfo =async() => {
  try {
    const options = {
      method: 'POST',
      url: 'https://api.flutterwave.com/v3/accounts/resolve',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer FLWSECK_TEST-d06a317aae17d6e73571b3c04ffc8882-X`,
        'Content-Type': 'application/json',
      },
      data: {
        account_number: '4601194686',
        account_bank: '090110',
      },
    };

    const response = await axios.request(options);

  console.log(response.data.data);
  } catch (err) {
     console.error('An error occured in carrying out custom webhook, in doCustomFlwWebhook', err);
  }

}

getAccountInfo()