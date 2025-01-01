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
import viewsRouter from './routes/views';
import fbBotRouter from './routes/fb-bot-webhook';
import paymentGateWayRouter from './routes/payment-gateway';
import frontEndApiRouter from './routes/frontend-api';
import adminRouter from './routes/admin';

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
  //allowedOrigins = ['https://admin.botsub.com.ng', 'http://admin.botsub.com.ng'];
}

// // setting __filename since its not supported in type: module
// console.log(__filename, process.env.FLW_H);

// // // setting __dirname since its not supported in type: module
// console.log('directory-name 👉️', __dirname);

// initialising app
const app = express();

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
    origin: ['https://botsub.vercel.app', 'http://localhost:3000'],
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

app.use((req, res, next) => {
  res.on('finish', () => {
    const setCookieHeader = res.getHeader('Set-Cookie');
    console.log('Set-Cookie Header:', setCookieHeader);
  });
  next();
});

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

// connecting db
connectDB();

//app.use('/', storeRequest)
//locking in middlewares for route handling
app.use('/', viewsRouter);
app.use('/', fbBotRouter);
app.use('/gateway', paymentGateWayRouter);
app.use('/front-api', frontEndApiRouter);
app.use('/admin', adminRouter);

// handling 404
app.use(function (req: Request, res: Response, next: NextFunction) {
  res.status(404).render('not-found');
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log('running on port ' + port));
