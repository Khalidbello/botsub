// module for frontend api
const { Router } = require('express');

const nodemailer = require('nodemailer');

const handlebars = require('handlebars');

const axios = require('axios');

const {
  removeFromPendingAddToSettled,
  retryAllFailedDelivery,
} = require('./../modules/helper_functions.js');

const fsP = require('fs').promises;

const createClient = require('./../modules/mongodb.js');

const router = Router();

const transporter = nodemailer.createTransport({
  host: 'mail.botsub.com.ng',  // Replace with your SMTP server hostname
  port: 465,  // Port number for SMTP (e.g., 587 for TLS)
  secure: true,  // Set to true if using SSL
  auth: {
    user: 'admin@botsub.com.ng',
    pass: process.env.ADMIN_MAIL_P,
  },
}); // end of transporter

router.get('/data-offers', async (req, res) => {
  let dataOffers = await fsP.readFile('files/data-details.json');
  dataOffers = JSON.parse(dataOffers);
  dataOffers.FLW_PB_KEY = process.env.FLW_PB_KEY;
  res.json(dataOffers);
});

// to get key
router.get('/get-key', (req, res) => {
  res.json({ key: process.env.FLW_PB_KEY });
});

// route to recieve and  save survey datas
router.post('/survey', async (req, res) => {
  try {
    console.log('survey payload', req.body);
    const mailTemplate = await fsP.readFile(
      'modules/email-templates/survey-recieved-mail.html',
      'utf8'
    );
    const mail = handlebars.compile(mailTemplate);
    const mailOptions = {
      from: process.env.SURVEY_MAIL,
      to: req.body.email,
      subject: 'BotSub survey',
      html: mail({ chatBotUrl: process.env.CHATBOT_URL }),
    };

    const resp = await transporter.sendMail(mailOptions);
    console.log('mail send response', resp);

    const client = createClient();
    await client.connect();
    const collection = client.db(process.env.BOTSUB_DB).collection(process.env.USERS_COLLECTION);

    const filter = { user: req.body.emai };
    const update = { $set: { survey: req.body } };
    const option = { upsert: true };
    const survey = await collection.updateOne(filter, update, option);

    console.log('survey stored', survey);
    client.close();

    res.json({ status: 'success' });
  } catch (err) {
    console.log('survey error', err);
    res.json({ status: 'error'});
  }
});

// routes for admin

router.post('/retry', async (req, res) => {
  const { transaction_id, tx_ref } = req.query;
  console.log('req.quer', req.query);

  const response = await axios.get(
    `https://${req.hostname}/gateway/confirm?retry=Retry&transaction_id=${transaction_id}&tx_ref=${tx_ref}`
  );
  const data = await response.data;
  console.log('retry data', data);

  if (data.status === 'successful') {
    // calling function to delete transaction from pemding and add to setled
    await removeFromPendingAddToSettled(transaction_id, tx_ref);
    return res.json(data);
  }

  res.json(data);
});

router.post('/retry-all', async (req, res) => {
  const statistic = await retryAllFailedDelivery(req);
  console.log('statistic', statistic);
  res.json(statistic);
});

router.get('/fetch-failed-transactions', async (req, res) => {
  try {
    const client = createClient();
    await client.connect();
    const collection = client
      .db(process.env.BOTSUB_DB)
      .collection(process.env.FAILED_DELIVERY_COLLECTION);

    const { toSkip, limit } = req.query;
    const data = await collection.find().skip(parseInt(toSkip)).limit(parseInt(limit)).toArray();

    console.log('failed transact', data);
    res.json(data);
  } catch (err) {
    console.log('error fetching pemding transaction', err);
    res.json({ error: err });
  }
});

module.exports = router;
