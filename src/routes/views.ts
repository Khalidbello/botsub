// module to serve views

import { Router, Response, Request } from "express";
const path = require('path');
const router = Router();
const TEST = process.env.NODE_ENV === 'development';
const Users = require('../../models/users.js');


router.get('/', (req: Request, res: Response) => {
  console.log('am serving home');
  res.render('home', { TEST: TEST });
});

router.get('/env-test', (req: Request, res: Response) => {
  res.send("upgraded to api v-20 consle.error................." + process.env.HOST + '  ||||  ' + process.env.NODE_ENV);
});

router.get('/test-1', async (req: Request, res: Response) => {
  try {
    res.json({ 'test-1': 'in testing of views js test-1' });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  };
});

router.get('/users', async (req: Request, res: Response) => {
  const user = await Users.findOne({ 'email': 'bellokhali74@gmail.com' });
  console.log(user);
  res.json(user);
});

router.get('/buy-data', (req: Request, res: Response) => {
  res.render('buy-data', { TEST: TEST });
});

router.get('/buy-airtime', (req: Request, res: Response) => {
  res.render('buy-airtime', { TEST: TEST });
});

router.get('/after-pay', (req: Request, res: Response) => {
  res.render('after-pay', { TEST: TEST });
});

router.get('/data-pricing', (req: Request, res: Response) => {
  res.render('data-pricing', { TEST: TEST });
});

router.get('/survey', (req: Request, res: Response) => {
  res.render('survey', { TEST: TEST });
});

router.get('/retry-failed-delivery', (req: Request, res: Response) => {
  res.render('retry-failed-delivery', { TEST: TEST });
});

router.get('/privacy-policy', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../views/privacy_policy.html');
  res.sendFile(file);
});

router.get('/test', (req, res) => {
  res.render('test', { TEST });
});

router.get('/success-mail', (rreq: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/succesfull-mail.html');
  res.sendFile(file);
});

router.get('/failed-mail', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/failed-delivery.html');
  res.sendFile(file);
});

router.get('/refund-mail', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/refund-email.html');
  res.sendFile(file);
});

router.get('/survey-mail', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/survey-mail.html');
  res.sendFile(file);
});


export default router;