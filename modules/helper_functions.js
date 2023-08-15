const fsP = require('fs').promises;

const nodemailer = require('nodemailer');

const handlebars = require('handlebars');

const flutterwave = require('flutterwave-node-v3');

const axios = require('axios');

const createClient = require('./mongodb.js');

const uri = `mongodb+srv://bellokhalid74:${process.env.MONGO_PASS1}@botsubcluster.orij2vq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
  },
}); // end of transporter

// function to check if transaction has ever beign made

const checkIfPreviouslyDelivered = async function (transactionId, tx_ref) {
  const client = createClient();
  await client.connect();
  const collection = client.db(process.env.BOTSUB_DB).collection(process.env.SETTLED_COLLECTION);

  const transact = await collection.findOne({ _id: transactionId });

  console.log('transaction in check if previous', transact);

  if (transact) {
    return transact.txRef === tx_ref && transact.status === 'settled';
  }

  client.close();
  return false;
}; //end of checkIfPreviouslyDelivered

function returnPreviouslyDelivered(response) {
  const meta = response.data.meta;
  // Create a Date object with the UTC time
  const date = new Date(response.data.customer.created_at);
  // Create an Intl.DateTimeFormat object with the Nigeria time zone
  const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'long',
    timeStyle: 'medium',
  });
  // Format the Nigeria time using the formatter
  const nigeriaTimeString = nigeriaFormatter.format(date);

  const details = {
    network: meta.network,
    number: meta.number,
    email: response.data.customer.email,
    date: nigeriaTimeString,
  };
  if (meta.type == 'airtime') {
    details.product = `&#8358;${meta.amount} airtime`;
  }
  if (meta.type == 'data') {
    details.product = `${meta.size} data`;
  }
  return details;
} // end of returnPreviouslyDelivered

// function to check if all requirements are met
const checkRequirementMet = async function (response, req, res) {
  let returnFalse = false;
  let price;
  if (response.data.meta.type === 'data') {
    let dataDetails = await fsP
      .readFile('files/data-details.json')
      .catch((err) => (returnFalse = true));

    if (returnFalse) return { status: false, messsage: 'error reading data-details.json' };

    dataDetails = JSON.parse(dataDetails);
    try {
      price = Number(dataDetails[response.data.meta.networkID][response.data.meta.index]['price']);
    } catch (err) {
      returnFalse = true;
    }

    if (returnFalse) {
      console.log('data plan with id not found');
      return { status: false, message: 'data plan with id not found' };
    }
    let pricePaid = Number(response.data.amount);

    if (
      response.data.status === 'successful' &&
      pricePaid >= price &&
      response.data.currency === 'NGN' &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price; //amount to be refunded
      return { status: true, refund: toRefund, type: 'data', price };
    }
  }

  if (response.data.meta.type === 'airtime') {
    price = Number(response.data.meta.amount);
    let pricePaid = Number(response.data.amount);
    console.log(price);
    console.log(pricePaid);
    if (
      response.data.status === 'successful' &&
      pricePaid >= price &&
      response.data.currency === 'NGN' &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price;
      return { status: true, refund: toRefund, type: 'airtime', price };
    }
  }
  return { status: false, message: 'payment requirement not met', price };
}; //end of checkRequiremtMet

// helper function to refund payment
async function refundPayment(response, price) {
  try {
    const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    const resp = await flw.Transaction.refund({
      id: response.data.id,
      amount: null,
      comments: 'transaction requirement not met',
    });

    console.log('payment refund response', resp);
    const date = new Date();
    // Create an Intl.DateTimeFormat object with the Nigeria time zone
    const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'long',
      timeStyle: 'medium',
    });

    // Format the Nigeria time using the formatter
    const nigeriaTimeString = nigeriaFormatter.format(date);

    const emailTemplate = await fsP.readFile('modules/email-templates/refund-mail.html', 'utf8');
    const mail = handlebars.compile(emailTemplate);

    const refundData = {
      date: nigeriaTimeString,
      network: response.data.meta.network,
      price: price,
      amountPaid: response.data.amount,
      recipientNumber: response.data.meta.number,
      id: response.data.id,
      txRef: response.data.tx_ref,
      supportEmail: process.env.EMAIL_ADDRESS,
      chatBotUrl: process.env.CHATBOT_URL,
    };

    // setting product name
    refundData.product = `${response.data.meta.size} data`;

    if (response.data.meta.type === 'airtime') {
      refundData.product = `₦${response.data.meta.amount} airtime`;
    }

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: response.data.customer.email,
      subject: 'BotSub Payment Refund',
      html: mail(refundData),
    };

    const resp1 = await transporter.sendMail(mailOptions);

    console.log('refund mail response', resp1);

    // adding transaction to toRefundDb
    const client = createClient();

    await client.connect();
    const collection = client.db(process.env.BOTSUB_DB).collection(process.env.TORFUND_COLLECTION);

    const resp2 = await collection.insertOne({
      txRef: response.data.tx_ref,
      transactionId: response.data.id,
      status: 'pending',
    });
    client.close();
    console.log('add to toRefund response', resp2);

    return {
      status: 'requirementNotMet',
    };
  } catch (err) {
    console.log('regund error', err);
  }
} // end of refundPayment

// function to generate random Strings
function generateRandomString(length = 15) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
} // end of generateRandomString

// finction to add transact to settled collection and remove from pending collection

async function removeFromPendingAddToSettled(transaction_id, tx_ref) {
  const client = createClient();

  client.connect();
  const pendingCollection = client
    .db(process.env.BOTSUB_DB)
    .collection(process.env.FAILED_DELIVERY_COLLECTION);

  await pendingCollection.deleteOne({ _id: transaction_id });
  client.close();
}

async function retryAllFailedDelivery(req) {
  const client = createClient();
  await client.connect();
  const collection = client
    .db(process.env.BOTSUB_DB)
    .collection(process.env.FAILED_DELIVERY_COLLECTION);
  const length = await collection.countDocuments();
  const flag = Math.round(length / 20) + 1;
  console.log('flag', flag);
  const statistic = {
    total: length,
    successful: 0,
    failed: 0,
  };

  for (let i = 0; i < flag; i++) {
    const transacts = await collection.find().limit(20).toArray();
    console.log('transacts', transacts);

    // Create an array to store the promises for each transaction
    const transactionPromises = transacts.map(async (transact) => {
      const { _id, txRef } = transact;
      const response = await axios.get(
        `https://${req.hostname}/gateway/confirm?transaction_id=${_id}&tx_ref=${txRef}`
      );
      const data = response.data;

      if (data.status === 'successful' || data.status === 'settled') {
        statistic.successful += 1;
        await removeFromPendingAddToSettled(_id, txRef);
      } else {
        statistic.failed += 1;
      }
    });

    // Wait for all transaction promises to resolve
    await Promise.all(transactionPromises);
  } // end of for loop

  client.close();
  return statistic;
}

module.exports = {
  checkIfPreviouslyDelivered,
  returnPreviouslyDelivered,
  checkRequirementMet,
  refundPayment,
  generateRandomString,
  removeFromPendingAddToSettled,
  retryAllFailedDelivery,
};
