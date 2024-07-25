// @ts-nocheck

// module for frontend api
const { Router } = require('express');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const axios = require('axios')
const Transactions = require('./../models/transactions.js');
const Survey = require('./../models/survey.js');
const Users = require('./../models/users.js');
const { ObjectId } = require('mongodb');
const {
  retryFailedHelper,
  retryAllFailedDelivery,
} = require('./../modules/helper_functions.js');
const fsP = require('fs').promises;
const router = Router();


const transporter = nodemailer.createTransport({
  host: 'mail.botsub.com.ng',  // Replace with your SMTP server hostname
  port: 465,  // Port number for SMTP (e.g., 587 for TLS)
  secure: true,  // Set to true if using SSL
  auth: {
    user: process.env.SURVEY_MAIL,
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
    const data = req.body;
    const toSave = {
      network: data.network,
      dataSize: data.dataSize,
      dataFrequency: data.dataFrequency,
      gender: data.gender
    };

    const mailTemplate = await fsP.readFile(
      'modules/email-templates/survey-recieved-mail.html',
      'utf8'
    );

    const user = await Users.updateOne(
      { email: data.email },
      { $set: { survey: toSave } },
      { upsert: true }
    );
    console.log('updated: ', user)
    res.json({ status: 'successful' });
  } catch (err) {
    console.log('survey error', err);
    res.json({ status: 'error' });
  };
});




// routes for admin
router.post('/retry', async (req, res) => {
  const { transaction_id, tx_ref } = req.query;
  console.log('req.query', req.query);

  return retryFailedHelper(transaction_id, tx_ref, res);
});



router.post('/retry-all', async (req, res) => {
  const statistic = await retryAllFailedDelivery(req);
  console.log('statistic', statistic);
  res.json(statistic);
});


// route to changed transaction status to settled
router.post('/change-to-setlled', async (req, res) => {
  console.log('got in changed to settled')
  try {
    await Transactions.updateOne(
      { id: req.query.transaction_id },
      { $set: { status: true } }
    );
    res.json({ status: 'successful' });
  } catch (err) {
    res.json({ status: 'error' });
  }
});

router.get('/fetch-failed-transactions', async (req, res) => {
  try {
    const { toSkip, limit } = req.query;
    const data = await Transactions.find({ status: false });

    console.log('failed transact', data);
    res.json(data);
  } catch (err) {
    console.error('error fetching pemding transaction', err);
    res.json({ error: err });
  };
});


export default router;