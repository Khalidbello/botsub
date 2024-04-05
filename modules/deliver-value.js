// module to deliver value
const handlebars = require('handlebars');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { dateFormatter, fundWallet } = require('./helper_functions.js');
const sendMessage = require('./../bot_modules/send_message.js');
const sendTemplate = require('./../bot_modules/send_templates.js');
const { getVirtualAccountTemp } = require('./../bot_modules/templates.js');
const { retryFailedTemplate, responseServices2 } = require('./../bot_modules/templates.js');
const fsP = require('fs').promises;
const Transactions = require('./../models/transactions.js');
const { creditReferrer } = require('./credit_referrer.js');
const handleFirstMonthBonus = require('./monthly_bonuses.js');
const transporter = nodemailer.createTransport({
  host: 'mail.botsub.com.ng', // Replace with your SMTP server hostname
  port: 465, // Port number for SMTP (e.g., 587 for TLS)
  secure: true, // Set to true if using SSL
  auth: {
    user: process.env.ADMIN_MAIL,
    pass: process.env.ADMIN_MAIL_P,
  },
}); // end of transporter
const { updateNetworkStatus } = require('./../bot_modules/data-network-checker.js');
const { Mutex } = require('async-mutex'); // module to prevent multiple settlements
const { addDataProfit } = require('./save-profit.js');



const transactionMutex = new Mutex();  // mutex for delivering transactions

// function to initiate delvering of values 
async function deliverValue(response, req, res, requirementMet) {
  // Attempt to acquire the lock for the transaction
  const release = await transactionMutex.acquire();
  try {
    const transaction = await Transactions.findOne({ id: req.query.transaction_id })
    if (transaction) {
      if (transaction.status === true) {
        res.json({ status: 'error', message: 'Transaction has already been settled' });
        if (response.data.meta.bot) {
          await sendMessage(response.data.meta.senderId, {
            text: `Sorry this transaction has already been delivered \nProduct: ₦${response.data.meta.size} ${response.data.meta.network} data \nTransaction ID: ${response.data.id} \nDate:`,
          });
        };
        return;
      };
    };

    // Proceed with delivery process...
    if (requirementMet.type === 'data') {
      await deliverData(response, req, res);
    } else if (requirementMet.type === 'airtime') {
      await deliverAirtime(response, req, res);
    };
  } finally {
    // Release the lock after processing is done
    release();
  }
};


// function to make data purchase request
async function deliverData(response, req, res) {
  let options = {
    url: 'https://opendatasub.com/api/data/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(response.data.meta.networkID),
      mobile_number: response.data.meta.number,
      plan: Number(response.data.meta.planID),
      Ported_number: true,
    }
  };

  if (process.env.NODE_ENV === 'production') {
    await makePurchaseRequest(response, res, req, options, type = 'data');
  } else {
    await simulateMakePurchaseRequest(response, res, req, false, type = 'data');
  };
}; // end of deliver value function


// function to make airtime purchase request
async function deliverAirtime(response, req, res) {
  let options = {
    url: 'https://opendatasub.com/api/topup/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(response.data.meta.networkID),
      amount: Number(response.data.meta.amount),
      mobile_number: response.data.meta.number,
      Ported_number: true,
      airtime_type: 'VTU',
    }
  };

  if (process.env.NODE_ENV === 'production') {
    await makePurchaseRequest(response, res, req, options, type = 'airtime');
  } else {
    await simulateMakePurchaseRequest(response, res, req, true, type = 'airtime');
  };
}; // end of deliverAirtime


// function to make product purchase request
async function makePurchaseRequest(response, res, req, options, type) {
  try {
    const resp = await axios.post(options.url, options.payload, { headers: options.headers });
    console.log('response: ', resp.data);

    if (resp.data.Status === 'successful') {
      updateNetworkStatus(response.data.meta.network, true); // updating network status to true
      await helpSuccesfulDelivery(req, res, response, resp.data.balance_after, type);
    } else {
      updateNetworkStatus(response.data.meta.network, false); // updating network status to false
      throw 'could not deliver data'
    };
  } catch (error) {
    console.log('in make purchase request failed in cacth error block:', error);
    await helpFailedDelivery(req, res, response);
  };
}; // end of makePurchaseRequest


// function to make product purchase request simulation
async function simulateMakePurchaseRequest(response, res, req, condition = false, type) {
  try {
    if (condition) {
      await updateNetworkStatus(response.data.meta.network, true);
      return await helpSuccesfulDelivery(req, res, response, 6000, type);
    }
    updateNetworkStatus(response.data.meta.network, false);
    throw 'product purchas request not successful';
  } catch (error) {
    console.log('make purchase request simulation failed in cacth error block:', error);
    helpFailedDelivery(req, res, response);
  };
}; // end of makePurchaserequest simulain


// helper function for succesfull response
async function helpSuccesfulDelivery(req, res, response, balance, type) {
  await addToDelivered(req, response, type);

  if (type === 'data') addDataProfit(response);

  // calling function to send mail and json response object
  await sendSuccessfulResponse(response, res);

  if (response.data.meta.bot) {
    const date = new Date() //new Date(response.data.customer.created_at);
    const nigeriaTimeString = dateFormatter(date);

    await sendMessage(response.data.meta.senderId, {
      text: `Transaction Succesful \nProduct: ${product(response)} \nRecipient: ${response.data.meta.number} \nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`,
    });

    // check for bonus delivery
    if (Number(response.data.meta.firstPurchase) === 1 && type === 'data') await creditReferrer(response.data.meta.senderId);
    if (type === 'data') await handleFirstMonthBonus(response.data.customer.email, response.data.meta.number, response.data.meta.networkID, response.data.meta.senderId);

    await sendMessage(response.data.meta.senderId, { text: 'Thanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. \n\n〜BotSub' });
    await sendMessage(response.data.meta.senderId, { text: '\nEnhance your recharges by utilizing a dedicated virtual account! Obtain a permanent account number for all transactions. Secure your permanent account number today!' });
    await sendTemplate(response.data.meta.senderId, getVirtualAccountTemp);
  };
  //if (parseInt(balance) <= 5000) fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
}; // end of helpSuccesfulDelivery


// helper function  for failed delivery
async function helpFailedDelivery(req, res, response) {
  addToFailedToDeliver(req, response);
  sendFailedToDeliverResponse(response, res);

  if (response.data.meta.bot) {
    const date = new Date() //new Date(response.data.customer.created_at);
    const nigeriaTimeString = dateFormatter(date);

    console.log('bot feed back');
    await sendMessage(response.data.meta.senderId, {
      text: `Sorry your transaction is pending \nProduct: ${product(response)} \nRecipient: ${response.data.meta.number} \nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`,
    });
    await sendTemplate(
      response.data.meta.senderId,
      retryFailedTemplate(req.query.transaction_id, req.query.tx_ref)
    );
  };
}; // end of failed delivery helper


// function to add transaction to delivered transaction
async function addToDelivered(req, response, type) {
  const transaction = await Transactions.findOne({ id: req.query.transaction_id })
  if (transaction) {
    if (transaction.status === true) return;
    const response = transaction.updateOne({ status: true });
    return response;
  };

  let prod = product(response);

  const newTransaction = new Transactions({
    id: req.query.transaction_id,
    email: response.data.customer.email,
    txRef: req.query.tx_ref,
    status: true,
    date: Date(),
    product: prod,
    beneficiary: parseInt(response.data.meta.number,)
  });
  const response2 = await newTransaction.save();
  console.log('add to delivered response', response2);
  return;
}; // end of addToDelivered



// function to add transaction to failed to deliver
async function addToFailedToDeliver(req, response) {
  try {
    let transaction = await Transactions.findOne({ id: req.query.transaction_id })
    if (transaction) return console.log('failed transaction already exists, addToFailedToDelver function', transaction);

    let prod = product(response);
    const newTransaction = new Transactions({
      id: req.query.transaction_id,
      email: response.data.customer.email,
      txRef: req.query.tx_ref,
      status: false,
      date: Date(),
      product: prod + ' ' + response.data.meta.network,
      beneficiary: parseInt(response.data.meta.number)
    });
    const response2 = await newTransaction.save();
    console.log('add to failed delivery response', response2);
    return;
  } catch (err) { console.log('error occured while adding new trnasaction to databasae', err) };
}; // end if add to failed to deliver


// helper function to form product
function product(response) {
  let product = `${response.data.meta.size}  ${response.data.meta.network} data`;

  if (response.data.meta.type === 'airtime') {
    product = `₦${response.data.meta.amount} ${response.data.meta.network} airtime`;
  };
  return product
}; // end of procuct


// function to send data purchase mail and response
async function sendSuccessfulResponse(response, res) {
  try {
    const successfulMailTemplate = await fsP.readFile(
      'modules/email-templates/successful-delivery.html',
      'utf8'
    );
    const compiledSuccessfulMailTemplate = handlebars.compile(successfulMailTemplate);
    let details = formResponse(response);
    details.product = product(response);
    const mailParams = {
      product: details.product,
      network: details.network,
      date: details.date,
      id: response.data.id,
      txRef: response.data.tx_ref,
      status: 'Successfull',
      price: response.data.amount,
      recipientNumber: details.number,
      chatBotUrl: process.env.CHATBOT_URL,
      host: process.env.HOST,
    };

    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: response.data.customer.email,
      subject: 'BotSub Receipt',
      html: compiledSuccessfulMailTemplate(mailParams),
    };

    //const resp = await transporter.sendMail(mailOptions);

    //console.log('successful delivery function', resp);
    console.log('in sucess');
    return res.json({ status: 'successful', data: details });
  } catch (err) {
    console.log('send successful vtu response error', err);
    return res.json({ status: 'error', message: 'error sending succesfull response', data: err });
  };
}; // end of sendAirtimeResponse function


// function to form response on failed to deliver
async function sendFailedToDeliverResponse(response, res) {
  try {
    const pendingMailTemplate = await fsP.readFile(
      'modules/email-templates/failed-delivery.html',
      'utf8'
    );
    const compiledPendingMailTemplate = handlebars.compile(pendingMailTemplate);
    let details = formResponse(response);
    details.product = `${response.data.meta.size} data`;

    if (response.data.meta.type === 'airtime') {
      details.product = `₦${response.data.meta.amount} airtime`;
    };

    const mailParams = {
      product: details.product,
      network: details.network,
      date: details.date,
      id: response.data.id,
      txRef: response.data.tx_ref,
      status: 'Pending',
      price: response.data.amount,
      recipientNumber: details.number,
      chatBotUrl: process.env.CHATBOT_URL,
      host: process.env.HOST,
    };
    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: response.data.customer.email,
      subject: 'BotSub Pending Transaction',
      html: compiledPendingMailTemplate(mailParams),
    };

    //const resp = await transporter.sendMail(mailOptions);

    //sconsole.log('in failed to deliver function', resp);
    return res.json({ status: 'pending', data: details });
  } catch (err) {
    console.log('send successful vtu response error', err);
    return res.json({ status: 'error', message: 'send failed response error air', data: err });
    //return res.json({ status: 'failedDelivery', message: 'failed to deliver purchased product' });
  };
}; // end of sendFailedToDeliverResponse


//function to form response for request
function formResponse(response) {
  const meta = response.data.meta;
  // create a Date object with the UTC time
  const date = new Date(response.data.customer.created_at);
  const nigeriaTimeString = dateFormatter(date);

  const details = {
    network: meta.network,
    number: meta.number,
    email: response.data.customer.email,
    date: nigeriaTimeString,
  };
  return details;
}; // end of formResponse

module.exports = deliverValue;