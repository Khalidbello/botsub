// module to deliver value

const Flutterwave = require('flutterwave-node-v3');

const request = require('request');

const handlebars = require('handlebars');

const nodemailer = require('nodemailer');

const { generateRandomString } = require('./helper_functions.js');

const createClient = require('./mongodb.js');

const sendMessage = require('./../bot_modules/send_message.js');

const fsP = require('fs').promises;

const transporter = nodemailer.createTransport({
  host: 'mail.botsub.com.ng',  // Replace with your SMTP server hostname
  port: 465,  // Port number for SMTP (e.g., 587 for TLS)
  secure: true,  // Set to true if using SSL
  auth: {
    user: process.env.ADMIN_MAIL,
    pass: process.env.ADMIN_MAIL_P,
  },
}); // end of transporter

function deliverValue(response, req, res, requirementMet) {
  if (requirementMet.type == 'data') {
    return deliverData(response, req, res);
  } else if (requirementMet.type == 'airtime') {
    return deliverAirtime(response, req, res);
  }
}

// function to make data purchase request

async function deliverData(response, req, res) {
  let options = {
    method: 'POST',
    url: 'https://dancitysub.com/api/data/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    body: {
      network: Number(response.data.meta.networkID),
      mobile_number: response.data.meta.number,
      plan: Number(response.data.meta.planID),
      Ported_number: true,
    },
    json: true,
  };
  // making request
  request(options, async (error, _, body) => {
    if (error) {
      console.log(error);
      return res.send(error);
    }
    //console.log('data purchase resp', resp.body);
    console.log('data purchase resp body: ', body);
    // to do dependent transaction status
    if (body.Status === 'successful') {
      addToDelivered(req);
      // calling function to send mail and json response object
      sendSuccessfulResponse(response, res);

      if (response.data.meta.bot) {
        await sendMessage(response.data.meta.senderId, {
          text: `Transaction Succesful \nTransaction ID: ${response.data.id}`,
        });
      }
      //if (parseInt(body.balance_after) <= 5000) topUpBalance();
      return;
    } else if (true) {
      console.log('got hrre failed');
      addToFailedToDeliver(req);
      sendFailedToDeliverResponse(response, res);

      if (response.data.meta.bot) {
        await sendMessage(response.data.meta.senderId, {
          text: `Sorry your Transaction is Pending \nTransaction ID: ${response.data.id}`,
        });
      }
    }
  });
} // end of deliver value function

// function to make airtime purchase request

async function deliverAirtime(response, req, res) {
  let options = {
    method: 'POST',
    url: 'https://dancitysub.com/api/topup/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    body: {
      network: Number(response.data.meta.networkID),
      amount: Number(response.data.meta.amount),
      mobile_number: response.data.meta.number,
      Ported_number: true,
      airtime_type: 'VTU',
    },
    json: true,
  };

  // making request
  request(options, async (error, _, body) => {
    if (error) {
      console.log(error);
      return res.send(error);
    }
    //console.log('airtime purchase resp', resp.body);
    console.log('bodyof request ', body);
    // to do dependent transaction status
    if (body.Status === 'successful') {
      addToDelivered(req);
      // calling function to send mail and json response object
      sendSuccessfulResponse(response, res);

      if (response.data.meta.bot) {
        await sendMessage(response.data.meta.senderId, {
          text: `Transaction Succesful \nTransaction ID: ${response.data.id}`,
        });
      }
      //if (parseInt(body.balance_after) <= 5000) topUpBalance();
      return;
    } else {
      addToFailedToDeliver(req);
      sendFailedToDeliverResponse(response, res);
      if (response.data.meta.bot) {
        await sendMessage(response.data.meta.senderId, {
          text: `Sorry your Transaction is Pending \nTransaction ID: ${response.data.id}`,
        });
      }
    }
  });
} // end of deliverAirtime

// function to add transaction to delivered transaction

async function addToDelivered(req) {
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.SETTLED_COLLECTION);
  const transact = await collection.findOne({ _id: req.query.transaction_id });

  if (transact) return;

  const response = await collection.insertOne({
    txRef: req.query.tx_ref,
    _id: req.query.transaction_id,
    status: 'settled',
  });

  client.close();
  console.log('add to delivered respomse', response);
  return response;
} // end of addToDelivered

// function to add transaction to failed to deliver

async function addToFailedToDeliver(req) {
  const client = createClient();
  await client.connect();
  const collection = client
    .db(process.env.BOTSUB_DB)
    .collection(process.env.FAILED_DELIVERY_COLLECTION);
  const transact = await collection.findOne({ _id: req.query.transaction_id });

  if (transact) return;

  const date = new Date();
  const response = await collection.insertOne({
    txRef: req.query.tx_ref,
    _id: req.query.transaction_id,
    status: 'pending',
    date: date,
  });

  client.close();
  console.log('add to failed delivery respose', response);
  return response;
} // end if add to failed to deliver

// function to send data purchase mail and response

async function sendSuccessfulResponse(response, res) {
  try {
    const successfulMailTemplate = await fsP.readFile(
      'modules/email-templates/successful-delivery.html',
      'utf8'
    );
    const compiledSuccessfulMailTemplate = handlebars.compile(successfulMailTemplate);
    let details = formResponse(response);
    details.product = `${response.data.meta.size} data`;

    if (response.data.meta.type === 'airtime') {
      details.product = `₦${response.data.meta.amount} airtime`;
    }

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
    };

    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: response.data.customer.email,
      subject: 'BotSub Receipt',
      html: compiledSuccessfulMailTemplate(mailParams),
    };

    const resp = await transporter.sendMail(mailOptions);

    console.log('successful delivery function', resp);
    return res.json({ status: 'successful', data: details });
  } catch (err) {
    console.log('send successful vtu response error', err);
    return res.json({ status: 'error', message: 'error send succesful rep air', data: err });
  }
} // end of sendAirtimeResponse function

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
    }

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
    };

    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: response.data.customer.email,
      subject: 'BotSub Pending Transaction',
      html: compiledPendingMailTemplate(mailParams),
    };

    const resp = await transporter.sendMail(mailOptions);

    console.log('in failed to deliver function', resp);
    return res.json({ status: 'pending', data: details });
  } catch (err) {
    console.log('send successfulvtu response error', err);
    return res.json({ status: 'error', message: 'send failed rep air', data: err });
    //return res.json({ status: 'failedDelivery', message: 'failed to deliver purchased product' });
  }
} // end of sendFailedToDeliverResponse

//function to form response for request

function formResponse(response) {
  const meta = response.data.meta;
  // create a Date object with the UTC time
  const date = new Date(response.data.customer.created_at);
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
  const nigeriaTimeString = nigeriaFormatter.format(date);
  const details = {
    network: meta.network,
    number: meta.number,
    email: response.data.customer.email,
    date: nigeriaTimeString,
  };
  return details;
} // end of formResponse

// function to check balance and add to it when necessary

async function topUpBalance() {
  try {
    const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

    const details = {
      account_bank: process.env.WALLET_ACC_NAME,
      account_number: process.env.WALLET_ACC_NUMBER,
      amount: parseInt(process.env.WALLET_FUND_AMOUNT),
      narration: 'REFUNDING WALLET',
      currency: 'NGN',
      reference: generateRandomString(),
      debit_currency: 'NGN',
      meta: { walletTopUp: true },
    };

    const response = await flw.Transfer.initiate(details);
    console.log('wallet transfer response', response);
  } catch (err) {
    console.log('balance top up error', err);
  }
}

module.exports = deliverValue;
