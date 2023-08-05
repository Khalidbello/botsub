import { default as fs } from 'node:fs';
const fsP = fs.promises;

export const responseServices = {
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
      {
        type: 'postback',
        title: 'Report Issue',
        payload: '{"title": "issueReport"}',
      },
    ],
  },
}; // end of responseServices

export const dataNetworks1 = {
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

export const dataNetworks2 = {
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
export const confrimDataPurchaseButton1 = {
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

export const confrimDataPurchaseButton2 = {
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

export const airtimeNetworks1 = {
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

export const airtimeNetworks2 = {
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
}

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
}

export async function generateFacebookPosts(id, network) {
  const file = JSON.parse(await fsP.readFile('files/data-details.json', 'utf-8'));
  const data = file[id];
  const templates = [];
  let buttons = [];
  let i = 1; // variable use to limit number of buttons in each template

  Object.keys(data).forEach((key) => {
    const { size, price, validity, index, planID, networkID } = data[key];
    const title = `${size} ₦${price} ${validity}`;
    const payload = {
      title: 'offerSelected',
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

    if (i % 3 === 0 || i === data.length) {
      const postbackTemplate = generatePostbackTemplate(buttons, network, i);
      templates.push(postbackTemplate);
      buttons = [];
    }
    i++;
  });

  return templates;
}

/*/ Example usage
const jsonFile = "data.json";
const postTemplates = generateFacebookPosts(jsonFile);
postTemplates.forEach((template, index) => {
  console.log(`Post Template ${index + 1}:`);
  console.log(JSON.stringify(template, null, 2));
  console.log("--------------------");
});*/
