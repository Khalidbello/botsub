// module to serve views
const axios = require('axios');

const createClient = require("./../modules/mongodb.js");

const { Router } = require('express');

const path = require('path');

const router = Router();

const TEST = process.env.NODE_ENV === 'development';

router.get('/', (req, res) => {
  console.log('am serving home');
  res.render('home', { TEST: TEST });
});

router.get('/env-test', (req, res)=> {
  res.send("variables: " + process.env.NODE_ENV);
});

router.get('/test-1', async (req, res) => {
  try {
    /*/ Make a request to the JSONPlaceholder API
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts');

    // Return the data to the frontend*/
    const client = createClient();
    await client.connect();
    const collection = client.db(process.env.BOTSUB_DB).collection(process.env.SETTLED_COLLECTION);

    const transacts = await collection.find({});
    const array = await transacts.toArray();
    res.json(array)

    //res.json(response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});
  
router.get('/buy-data', (req, res) => {
  res.render('buy-data', { TEST: TEST });
});

router.get('/buy-airtime', (req, res) => {
  res.render('buy-airtime', { TEST: TEST });
});

router.get('/after-pay', (req, res) => {
  res.render('after-pay', { TEST: TEST });
});

router.get('/data-pricing', (req, res) => {
  res.render('data-pricing', { TEST: TEST });
});

router.get('/survey', (req, res) => {
  res.render('survey', { TEST: TEST });
});

router.get('/retry-failed-delivery', (req, res) => {
  res.render('retry-failed-delivery', { TEST: TEST });
});

router.get('/privacy-policy', (req, res) => {
  const file = path.join(__dirname, '../views/privacy_policy.html');
  res.sendFile(file);
});
router.get('/test', (req, res) => {
  res.render('test', { TEST });
});

router.get('/success-mail', (req, res) => {
  const file = path.join(__dirname, '../modules/email-templates/succesfull-mail.html');
  res.sendFile(file);
});

router.get('/failed-mail', (req, res) => {
  const file = path.join(__dirname, '../modules/email-templates/failed-delivery.html');
  res.sendFile(file);
});

router.get('/refund-mail', (req, res) => {
  const file = path.join(__dirname, '../modules/email-templates/refund-email.html');
  res.sendFile(file);
});

router.get('/survey-mail', (req, res) => {
  const file = path.join(__dirname, '../modules/email-templates/survey-mail.html');
  res.sendFile(file);
});


module.exports = router;
