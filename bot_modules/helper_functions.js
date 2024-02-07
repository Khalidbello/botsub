const fsP = require('fs').promises;
const sendMessage = require('./send_message.js');
const sendTemplate = require('./send_templates.js');
const {
  confrimDataPurchaseButton1,
  confrimDataPurchaseButton2,
  responseServices,
  responseServices2
} = require('./templates.js');
const FBBotUsers = require('../models/fb_bot_users.js');

// function to respond to cases when no purchase payload is found for a transact
async function noTransactFound(senderId) {
  await sendMessage(senderId, { text: 'No transaction found \nInitiate new transaction' });
  await sendTemplate(senderId, responseServices);
  await sendTemplate(senderId, responseServices2);
}; // end of noFransactFound

// fucntion to validate number
function validateNumber(phoneNumber) {
  const prefixes = {
    MTN: [
      '0803',
      '0916',
      '0913',
      '0806',
      '0703',
      '0706',
      '0813',
      '0816',
      '0810',
      '0814',
      '0903',
      '0906',
      '0704',
      '0912',
      '0904',
    ],
    Airtel: ['0901', '0701', '0911', '0802', '0808', '0708', '0812', '0902', '0907'],
    Glo: ['0805', '0811', '0915', '0705', '0905', '0807', '0815'],
    '9mobile': ['0809', '0817', '0818', '0909', '0908'],
  };
  const cleanedNumber = phoneNumber.replace(/\s/g, '').replace('+234', '0'); // Cleaning phone number format

  if (cleanedNumber.length !== 11 || !/^\d+$/.test(cleanedNumber)) return false; // Invalid number length or contains non-digit characters

  const prefix = cleanedNumber.slice(0, 4);

  for (const [network, networkPrefixes] of Object.entries(prefixes)) {
    if (networkPrefixes.includes(prefix)) {
      return cleanedNumber;
    };
  };
  return false; // Number does nrot match any network provider prefix
}; // end of validateNumbe4


// function to form product response
async function confirmDataPurchaseResponse(senderId) {
  const user = await FBBotUsers.findOne({ id: senderId });
  console.log('in confirmdatapurchase', user);
  const message1 = {
    text:
      'Product: ' +
      user.purchasePayload.product +
      '\nNetwork: ' +
      user.purchasePayload.network +
      '\nPrice: ' +
      '₦' +
      user.purchasePayload.price +
      '\nPhone Number: ' +
      user.purchasePayload.phoneNumber +
      '\nEmail: ' +
      user.email,
  };
  await sendMessage(senderId, message1);
  await sendTemplate(senderId, confrimDataPurchaseButton1);
  await sendTemplate(senderId, confrimDataPurchaseButton2);
  return;
}; // confirmPurchaseTemplate


// function to validate airtime amount
async function validateAmount(amount) {
  // Remove any leading or trailing spaces
  amount = amount.trim();

  // Check if the amount is a valid number
  if (isNaN(amount)) return false;
  // Convert the amount to a floating-point number
  const parsedAmount = parseFloat(amount);

  // Check if the amount is greater than zero
  if (parsedAmount <= 0) return false;

  // Check if the amount has more than 2 decimal places
  const decimalCount = (parsedAmount.toString().split('.')[1] || '').length;
  if (decimalCount > 2) return false;
  // Validation passed
  return true;
}; // end of validateAmount


// functiont to format date to Nigeria time
function dateFormatter(date) {
  const date0 = new Date(date);
  // Create an Intl.DateTimeFormat object with the Nigeria time zone
  const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true, // This will format the time in 12-hour format with AM/PM
  });
  // Format the Nigeria time using the formatter
  return nigeriaFormatter.format(date0);
}; // end of dateFormatter


// function to create tx_ref
function txCode() {
  let code = '';
  let characters = '1234567890ABCDEFGHIJKLMNOPQRSTUV';
  for (let x = 0; x < 25; x++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
    console.log(characters.length);
  };
  return code + Date.now();
}; // end of txCode


// function to form active referral templates
function formActiveReferralTemp(datas) {
  let num = 0;
  const tempList = datas.map((data)=> {
    num ++;
    return {
      type: 'template',
      payload: {
        template_type: 'button',
        text: `Status: active --- Index: ${num}`,
        buttons: [
          {
            type: 'postback',
            title: 'claim bonus',
            payload: `{"title": "claimReferralBonus", "referralId": "${data.id}"}`,
          }
        ],
      },
    }
  });
  return tempList;
}; // end of formActiveReferralTemp


// function to form unactive referral temp
// function to form active referral templates
function formUnactiveReferralTemp(datas) {
  let num = 0;
  const tempList = datas.map((data)=> {
    num ++;
    return {
      type: 'template',
      payload: {
        template_type: 'button',
        text: `Status: unactive --- Index: ${num}`,
        buttons: [
          {
            type: 'postback',
            title: 'Activate',
            payload: `{"title": "activateReferral", "referralId": ${data.id}}`,
          }
        ],
      },
    };
  });

  return tempList;
}; // end of formUnactiveReferralTemp


// function to confirm claim referral bonus
async function confirmClaimReferralBonus(event) {
  const senderId = event.sender.id;

  // check if user has a valid referall bonus and deliver if true
}; // end of confirmClaimReferralBonus


 // helper function to return confirm purchase
 async function helperConfirmPurchase(transactionType, senderId) {
  // peform next action dependent on trasactionType
  if (transactionType === 'data') {
    await confirmDataPurchaseResponse(senderId);
  } else if (transactionType === 'airtime') {
    confirmDataPurchaseResponse(senderId);
  };
}; // end of helperConfirmPurchase



// function to remind user to fund wallet
async function remindToFundWallet(senderId, amount, balance, accountDetails) {
  await sendMessage(senderId, { text: 'Sorry your account balance is currently low.'});
  await sendMessage(senderId, { text: `Your current account number is: ₦${balance}`});
  await sendMessage(senderId, { text: `Kindly fund your account with a minimum amount of ₦${Math.abs(amount)}`});
  await sendMessage(senderId, { text: `Bank Name: ${accountDetails.bankName}`});
  await sendMessage(senderId, { text: `Account Name: ${accountDetails.accountName}`});
  await sendMessage(senderId, { text: 'Account Number:'})
  await sendMessage(senderId, { text: `${accountDetails.accountNumber}`});
  await sendMessage(senderId, { text: 'purchase would be automatically made once account is funded.'});
  await sendMessage(senderId, { text: 'Enter Q to cancle auto delivering on wallet funding.'})
  await FBBotUsers.updateOne({ id: senderId }, { $set: { 'purchasePayload.outStanding': true }});
}; // end of remind to fund wallet



module.exports = {
  noTransactFound,
  validateNumber,
  confirmDataPurchaseResponse,
  validateAmount,
  dateFormatter,
  formUnactiveReferralTemp,
  formActiveReferralTemp,
  txCode,
  helperConfirmPurchase,
  remindToFundWallet,
};
