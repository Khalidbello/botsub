// module to serve views

import { Router, Response, Request } from "express";
import path from 'path';
import Users from "../models/users";
const viewsRouter = Router();
const TEST = process.env.NODE_ENV === 'development';


viewsRouter.get('/', (req: Request, res: Response) => {
  console.log('am serving home');
  res.render('home', { TEST: TEST });
});

viewsRouter.get('/env-test', (req: Request, res: Response) => {
  res.send("upgraded to api v-20 consle.error................." + process.env.HOST + '  ||||  ' + process.env.NODE_ENV);
});

viewsRouter.get('/test-1', async (req: Request, res: Response) => {
  try {
    res.json({ 'test-1': 'in testing of views js test-1' });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  };
});

viewsRouter.get('/users', async (req: Request, res: Response) => {
  const user = await Users.findOne({ 'email': 'bellokhali74@gmail.com' });
  console.log(user);
  res.json(user);
});

viewsRouter.get('/buy-data', (req: Request, res: Response) => {
  res.render('buy-data', { TEST: TEST });
});

viewsRouter.get('/buy-airtime', (req: Request, res: Response) => {
  res.render('buy-airtime', { TEST: TEST });
});

viewsRouter.get('/after-pay', (req: Request, res: Response) => {
  res.render('after-pay', { TEST: TEST });
});

viewsRouter.get('/data-pricing', (req: Request, res: Response) => {
  res.render('data-pricing', { TEST: TEST });
});

viewsRouter.get('/survey', (req: Request, res: Response) => {
  res.render('survey', { TEST: TEST });
});

viewsRouter.get('/retry-failed-delivery', (req: Request, res: Response) => {
  res.render('retry-failed-delivery', { TEST: TEST });
});

viewsRouter.get('/privacy-policy', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../views/privacy_policy.html');
  res.sendFile(file);
});

viewsRouter.get('/test', (req, res) => {
  res.render('test', { TEST });
});

viewsRouter.get('/success-mail', (rreq: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/succesfull-mail.html');
  res.sendFile(file);
});

viewsRouter.get('/failed-mail', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/failed-delivery.html');
  res.sendFile(file);
});

viewsRouter.get('/refund-mail', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/refund-email.html');
  res.sendFile(file);
});

viewsRouter.get('/survey-mail', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../modules/email-templates/survey-mail.html');
  res.sendFile(file);
});


export default viewsRouter;