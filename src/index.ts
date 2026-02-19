// entry file for BotSub
// ngrok http --domain=weekly-settled-falcon.ngrok-free.app 8080
// https://weekly-settled-falcon.ngrok-free.app

require('dotenv').config();
const handlebars = require('express-handlebars');
const cors = require('cors');

import cookieParser from 'cookie-parser';
import session from 'express-session';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import connectDB from './models/connectdb';
import fbBotRouter from './routes/fb-bot-webhook';
import paymentGateWayRouter from './routes/payment-gateway';
import frontEndApiRouter from './routes/frontend-api';
import adminRouter from './routes/admin';
import whatsaapRouter from './routes/whatsaap-bot-hook';
import morgan from 'morgan';
import timekeeper from 'timekeeper';
import { getNetworkAndLocalNumber } from './bot/unified/phone_number_checker';

// setting  configurations for different environment
if (process.env.NODE_ENV === 'development') {
  console.log('in development mode');
  const env = process.env;

  env.DB_NAME = 'development';
  env.HOST = env.HOST_STAGING;
  env.DB_CONNECTION_STR = env.DB_CONNECTION_STR_TEST;
  env.FLW_PB_KEY = env.FLW_PB_KEY_TEST;
  env.FLW_SCRT_KEY = env.FLW_SCRT_KEY_TEST;
  env.FLW_H = env.FLW_H_TEST;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_TEST;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_TEST;
  env.FB_VERIFICATION_KEY = env.FB_VERIFICATION_KEY_TEST;
  env.FBM_TOKEN = env.FBM_TOKEN_TEST;
  env.OPENSUB_KEY = env.OPENSUB_KEY_TEST;
  env.ASBDATA_KEY = env.ASBDATA_KEY_TEST;
  env.WHATSAAP_VERIF_TOKEN = env.WHATSAAP_VERIF_TOKEN_TEST;
  env.WHATSAPP_NUM_ID = env.WHATSAPP_NUM_ID_TEST;
  env.WHATSAPP_ACCESS_TOK = env.WHATSAPP_ACCESS_TOK_TEST;
} else if (process.env.NODE_ENV === 'staging') {
  console.log('in staging mode');
  const env = process.env;

  env.DB_NAME = 'staging';
  env.HOST = env.HOST_TEST;
  env.DB_CONNECTION_STR = env.DB_CONNECTION_STR_STAGING;
  env.FLW_PB_KEY = env.FLW_PB_KEY_STAGING;
  env.FLW_SCRT_KEY = env.FLW_SCRT_KEY_STAGING;
  env.FLW_H = env.FLW_H_STAGING;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_STAGING;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_STAGING;
  env.FB_VERIFICATION_KEY = env.FB_VERIFICATION_KEY_STAGING;
  env.FBM_TOKEN = env.FBM_TOKEN_STAGING;
  env.OPENSUB_KEY = env.OPENSUB_KEY_STAGING;
  env.ASBDATA_KEY = env.ASBDATA_KEY_STAGING;
  //origin = 'https:admin.botsub.com.ng';
} else if (process.env.NODE_ENV === 'production') {
  console.log('in production mode');
  const env = process.env;

  env.DB_NAME = 'botsub';
  env.HOST = env.HOST_PRODUCTION;
  env.DB_CONNECTION_STR = env.DB_CONNECTION_STR_PRODUCTION;
  env.FLW_PB_KEY = env.FLW_PB_KEY_PRODUCTION;
  env.FLW_SCRT_KEY = env.FLW_SCRT_KEY_PRODUCTION;
  env.FLW_H = env.FLW_H_PRODUCTION;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_PRODUCTION;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_PRODUCTION;
  env.FB_VERIFICATION_KEY = env.FB_VERIFICATION_KEY_PRODUCTION;
  env.FBM_TOKEN = env.FBM_TOKEN_PRODUCTION;
  env.OPENSUB_KEY = env.OPENSUB_KEY_PRODUCTION;
  env.ASBDATA_KEY = env.ASBDATA_KEY_PRODUCTION;
  env.WHATSAAP_VERIF_TOKEN = env.WHATSAAP_VERIF_TOKEN_PRODUCTION;
  env.WHATSAPP_NUM_ID = env.WHATSAPP_NUM_ID_PRODUCTION;
  env.WHATSAPP_ACCESS_TOK = env.WHATSAPP_ACCESS_TOK_PRODUCTION;
  //allowedOrigins = ['https://admin.botsub.com.ng', 'http://admin.botsub.com.ng'];
}

// // setting __filename since its not supported in type: module
// console.log(__filename, process.env.FLW_H);

// // // setting __dirname since its not supported in type: module
// console.log('directory-name 👉️', __dirname);

// initialising app
const app = express();

app.use(morgan('combined'));

// configuring handlebars as app templating engine
app.engine(
  'html',
  handlebars.engine({
    defaultLayout: false,
    extname: '.html',
  })
);

app.set('view engine', 'html');

const noCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
};

//locking in middlewares

// Use the middleware for all routes
app.use(
  cors({
    origin: ['https://botsub.vercel.app', 'https://botsub.com.ng', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(
  session({
    secret: 'yourSecretKey', // Use a strong secret for production
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      maxAge: 1000 * 60 * 10, // Session cookie expires after 10 minutes
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Adjust SameSite based on environment
    },
  })
);

app.use(noCacheMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static middleware
app.use(express.static('public'));

// app.use((req, res, next) => {
//   res.on('finish', () => {
//     const setCookieHeader = res.getHeader('Set-Cookie');
//     console.log('Set-Cookie Header:', setCookieHeader);
//   });
//   next();
// });

// Route to set a cookie
app.get('/set-cookie', (req, res) => {
  // Set a cookie named 'exampleCookie' with a value 'testValue'
  // res.cookie('exampleCookie', 'testValue', {
  //   httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
  //   secure: process.env.NODE_ENV === 'production', // Ensures the cookie is sent only over HTTPS in production
  //   maxAge: 1000 * 60 * 10, // Cookie expires after 10 minutes (in milliseconds)
  //   sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Adjust SameSite based on environment
  // });
  // @ts-ignore
  req.session.exampleData = 'This is session data';

  res.send('Cookie has been set!');
});

app.get('/lookup/:phone', async (req: Request, res: Response) => {
  const { phone } = req.params;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required in the request body.' });
  }

  try {
    const result = await getNetworkAndLocalNumber(phone);
    return res.send(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

if (process.env.NODE_ENV === 'development') {
  app.get('/admin/set-time/:date', (req, res) => {
    const newDate = new Date(req.params.date);
    if (isNaN(newDate.getTime())) {
      return res.status(400).send('Invalid Date format. Use YYYY-MM-DD');
    }

    timekeeper.travel(newDate);
    res.send(`Server has traveled to ${new Date().toLocaleString()}`);
  });

  app.get('/admin/reset-time', (req, res) => {
    timekeeper.reset();
    res.send(`Server returned to real time: ${new Date().toLocaleString()}`);
  });
}

//locking in middlewares for route handling
app.use('/', fbBotRouter);
app.use('/whatsapp', whatsaapRouter);
app.use('/gateway', paymentGateWayRouter);
app.use('/front-api', frontEndApiRouter);
app.use('/admin', adminRouter);

// handling 404
app.use(function (req: Request, res: Response, next: NextFunction) {
  res.status(404).render('not-found');
});

const port = process.env.PORT || 4000;

//  connecting db
connectDB(app, port as number);
