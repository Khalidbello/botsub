const fsP = require('fs').promises;

const responseServices = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: 'Select request',
    buttons: [
      {
        type: 'postback',
        title: 'Buy Data',
        payload: '{"title": "dataPurchase"}',
      },
      {
        type: 'postback',
        title: 'Buy Airtime',
        payload: '{"title": "airtimePurchase"}',
      },
    ],
  },
}; 

const responseServices2 = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: '....',
    buttons: [
      {
        type: 'postback',
        title: 'View Data Prices',
        payload: '{"title": "dataPrices"}',
      },
      {
        type: 'postback',
        title: 'Report Issue',
        payload: '{"title": "issueReport"}',
      },
    ],
  },
}; // end of responseServices

const dataNetworks1 = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: 'Select Network',
    buttons: [
      {
        type: 'postback',
        title: 'MTN',
        payload: '{"title": "mtnOffers"}',
      },
      {
        type: 'postback',
        title: 'Airtel',
        payload: '{"title": "airtelOffers"}',
      },
    ],
  },
};

const dataNetworks2 = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: '...',
    buttons: [
      {
        type: 'postback',
        title: '9mobile',
        payload: '{"title": "9mobileOffers"}',
      },
      {
        type: 'postback',
        title: 'Glo',
        payload: '{"title": "gloOffers"}',
      },
    ],
  },
}; // end of dataNetworks

// button for comfirm data purchase
const confrimDataPurchaseButton1 = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: 'Select action',
    buttons: [
      {
        type: 'postback',
        title: 'Make Purchase',
        payload: `{"title": "generateAccountNumber"}`,
      },
      {
        type: 'postback',
        title: 'Change Phone Number',
        payload: `{"title": "changePhoneNumber"}`,
      },
    ],
  },
}; // end of confrimDataPurchaseButton

const confrimDataPurchaseButton2 = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: '...',
    buttons: [
      {
        type: 'postback',
        title: 'Change email',
        payload: `{"title": "changeMailBeforeTransact"}`,
      },
      {
        type: 'postback',
        title: 'Cancel Transaction',
        payload: `{"title": "cancel"}`,
      },
    ],
  },
}; // end of confrimDataPurchaseButton2

//=================================================
// section for airtime templates

const airtimeNetworks1 = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: 'Select Network',
    buttons: [
      {
        type: 'postback',
        title: 'MTN',
        payload: `{
          "title": "enterAirtimeAmount",
          "network": "mtn",
          "networkID": "1",
          "transactionType": "airtime"
        }`,
      },
      {
        type: 'postback',
        title: 'Airtel',
        payload: `{
          "title": "enterAirtimeAmount",
          "network": "airtel",
          "networkID": "4",
          "transactionType": "airtime",
        }`,
      },
    ],
  },
}; // end of dataNetworks1

const airtimeNetworks2 = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: '...',
    buttons: [
      {
        type: 'postback',
        title: '9mobile',
        payload: `{
          "title": "enterAirtimeAmount",
          "network": "9mobile",
          "networkID": "3",
          "transactionType": "airtime"
        }`,
      },
      {
        type: 'postback',
        title: 'Glo',
        payload: `{
          "title": "enterAirtimeAmount",
          "network": "glo",
          "networkID": "2",
          "transactionType": "airtime"
        }`,
      },
    ],
  },
}; // end of dataNetworks2

// function to generate offers
function generatePostbackButton(title, payload) {
  const json = JSON.stringify(payload);
  console.log('json payload', json);

  const button = {
    type: 'postback',
    title: title,
    payload: json,
  };
  return button;
};

    

function generatePostbackTemplate(buttons, network, i) {
  const title = i === 3 ? `Select ${network} offer` : '...';
  const template = {
    type: 'template',
    payload: {
      template_type: 'button',
      text: title,
      buttons: buttons.slice(0, 3),
    },
  };
  return template;
};



async function generateFacebookPosts(id, network) {
  const file = JSON.parse(await fsP.readFile('files/data-details.json', 'utf-8'));
  const data = file[id]; 
  const length = Object.keys(data).length;
  const templates = [];
  let buttons = [];
  let i = 1; // variable use to limit number of buttons in each template

  Object.keys(data).forEach((key) => {
    const { size, price, validity, index, planID, networkID } = data[key];
    const title = `${size} ₦${price} ${validity}`;
    const payload = {
      title: 'offerSelec',
      network: network,
      networkID,
      planID,
      index,
      transactionType: 'data',
      product: `${size} data`,
      price: price,
      size,
    };

    const button = generatePostbackButton(title, payload);
    buttons.push(button);

    if (i % 3 === 0 || i === length ) {
      const postbackTemplate = generatePostbackTemplate(buttons, network, i);
      templates.push(postbackTemplate);
      buttons = [];
    }
    i++;
  });

  return templates;
};



function retryFailedTemplate(transaction_id, tx_ref) {
  return {
    type: 'template',
    payload: {
      template_type: 'button',
      text: 'Click To Retry Transaction',
      buttons: [{
        type: 'postback',
        title: 'Retry Transaction',
        payload: `{"title": "retryFailed", "transaction_id": "${transaction_id}", "tx_ref": "${tx_ref}"}`,
      }],
    }
  };
};



module.exports = {
  responseServices,
  responseServices2,
  dataNetworks1,
  dataNetworks2,
  confrimDataPurchaseButton1,
  confrimDataPurchaseButton2,
  airtimeNetworks1,
  airtimeNetworks2,
  generateFacebookPosts,
  retryFailedTemplate,
};
