// module to serve views

const { Router } = require('express');

const path = require('path');

const { fileURLToPath } = require('url');

const router = Router();

const TEST = process.env.NODE_ENV === 'development';

router.get('/', (req, res) => {
  res.render('home', { TEST });
});

router.get('/buy-data', (req, res) => {
  res.render('buy-data', { TEST });
});

router.get('/buy-airtime', (req, res) => {
  res.render('buy-airtime', { TEST });
});

router.get('/after-pay', (req, res) => {
  res.render('after-pay', { TEST });
});

router.get('/data-pricing', (req, res) => {
  res.render('data-pricing', { TEST });
});

router.get('/survey', (req, res) => {
  res.render('survey', { TEST });
});

router.get('/retry-failed-delivery', (req, res) => {
  res.render('retry-failed-delivery', { TEST });
});

router.get('/privacy-policy', (req, res) => {
  const file = path.join(__dirname, '../views/privacy_policy.html');
  res.sendFile(file);
});
router.get('/test', (req, res) => {
  res.render('test', { TEST });
});

router.get('/success-mail', (req, res) => {
  res.sendFile(`${__dirname + '/../modules/email-templates/successful-delivery.html'}`);
});

router.get('/failed-mail', (req, res) => {
  res.sendFile('/home/runner/qsub0/modules/email-templates/failed-delivery.html');
});

router.get('/refund-mail', (req, res) => {
  res.sendFile('/home/runner/qsub0/modules/email-templates/refund-mail.html');
});

router.get('/survey-mail', (req, res) => {
  res.sendFile('/home/runner/qsub0/modules/email-templates/survey-recieved-mail.html');
});


module.exports = router;