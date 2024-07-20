// entry file for BotSub
// ngrok http --domain=weekly-settled-falcon.ngrok-free.app 8080
// https://weekly-settled-falcon.ngrok-free.app


require('dotenv').config();
const express = require('express');
const session = require('express-session');
const handlebars = require('express-handlebars');
const fs = require('fs'); // File system module for writing to JSON
const cors = require('cors');


let origin = 'http://127.0.0.1:3000';

// setting  configurations for different environment
if (process.env.NODE_ENV === 'development') {
  console.log('in development mode');
  const env = process.env;

  env.DB_NAME = 'development';
  env.DB_CONNECTION_STR = env.DB_CONNECTION_STR_TEST
  env.FLW_PB_KEY = env.FLW_PB_KEY_TEST;
  env.FLW_SCRT_KEY = env.FLW_SCRT_KEY_TEST;
  env.FLW_H = env.FLW_H_TEST;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_TEST;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_TEST;
  env.SETTLED_COLLECTION = env.SETTLED_COLLECTION_TEST;
  env.FAILED_DELIVERY_COLLECTION = env.FAILED_DELIVERY_COLLECTION_TEST;
  env.TOREFUND_COLLECTION = env.TOREFUND_COLLECTION_TEST;
  env.USERS_COLLECTION = env.USERS_COLLECTION_TEST;
  env.FB_BOT_COLLECTION = env.FB_BOT_COLLECTION_TEST;
  env.FB_VERIFICATION_KEY = env.FB_VERIFICATION_KEY_TEST;
  env.FBM_TOKEN = env.FBM_TOKEN_TEST;
} else if (process.env.NODE_ENV === 'staging') {
  console.log('in staging mode');
  const env = process.env;

  env.DB_NAME = 'staging';
  env.DB_CONNECTION_STR = env.DB_CONNECTION_STR_STAGING
  env.FLW_PB_KEY = env.FLW_PB_KEY_STAGING;
  env.FLW_SCRT_KEY = env.FLW_SCRT_KEY_STAGING;
  env.FLW_H = env.FLW_H_STAGING;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_STAGING;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_STAGING;
  env.SETTLED_COLLECTION = env.SETTLED_COLLECTION_STAGING;
  env.FAILED_DELIVERY_COLLECTION = env.FAILED_DELIVERY_COLLECTION_STAGING;
  env.TOREFUND_COLLECTION = env.TOREFUND_COLLECTION_STAGING;
  env.USERS_COLLECTION = env.USERS_COLLECTION_STAGING;
  env.FB_BOT_COLLECTION = env.FB_BOT_COLLECTION_STAGING;
  env.FB_VERIFICATION_KEY = env.FB_VERIFICATION_KEY_STAGING;
  env.FBM_TOKEN = env.FBM_TOKEN_STAGING;
  //origin = 'https:admin.botsub.com.ng';
} else if (process.env.NODE_ENV === 'production') {
  console.log('in production mode');
  const env = process.env;

  env.DB_NAME = 'production';
  env.DB_CONNECTION_STR = env.DB_CONNECTION_STR_PRODUCTION;
  env.FLW_PB_KEY = env.FLW_PB_KEY_PRODUCTION;
  env.FLW_SCRT_KEY = env.FLW_SCRT_KEY_PRODUCTION;
  env.FLW_H = env.FLW_H_PRODUCTION;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_PRODUCTION;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_PRODUCTION;
  env.SETTLED_COLLECTION = env.SETTLED_COLLECTION_PRODUCTION;
  env.FAILED_DELIVERY_COLLECTION = env.FAILED_DELIVERY_COLLECTION_PRODUCTION;
  env.TOREFUND_COLLECTION = env.TOREFUND_COLLECTION_PRODUCTION;
  env.USERS_COLLECTION = env.USERS_COLLECTION_PRODUCTION;
  env.FB_BOT_COLLECTION = env.FB_BOT_COLLECTION_PRODUCTION;
  env.FB_VERIFICATION_KEY = env.FB_VERIFICATION_KEY_PRODUCTION;
  env.FBM_TOKEN = env.FBM_TOKEN_PRODUCTION;
  origin = ['https://admin.botsub.com.ng', 'http://admin.botsub.com.ng'];
};

// importing modules to handle different routes
const viewsRouter = require('./routes/views.js');
const frontEndApiRouter = require('./routes/frontend-api.js');
const paymentGateWayRouter = require('./routes/payment-gateway.js');
const fbBotRouter = require('./routes/fb-bot-webhook.js');
const adminRouter = require('./routes/admin.js');
const connectDB = require('./models/connectdb.js');

// setting __filename since its not supported in type: module
console.log(__filename, process.env.FLW_H);

// // setting __dirname since its not supported in type: module
console.log('directory-name 👉️', __dirname);

// initialising app
const app = new express();

// configuring handlebars as app templating engine
app.engine(
  'html',
  handlebars.engine({
    defaultLayout: false,
    extname: '.html',
  })
);

app.set('view engine', 'html');

const noCacheMiddleware = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
};

//locking in middlewares

// Use the middleware for all routes
app.use(noCacheMiddleware);
app.use(express.json());
//app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: origin, // Specify the allowed origin
  credentials: true // Allow credentials (cookies) to be sent
}));

app.use(session({
  key: 'ooksy',
  secret: 'iusbrh fk',
  cookie: {
    httpOnly: false,
    maxAge: 1000000,
  },
  resave: false,
  saveUninitialized: true,
}));

// static middleware
app.use(express.static('public'));

// connecting db
connectDB();


// middle ware to store requests
const storeRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const headers = { ...req.headers }; // Clone to avoid modifying original object
  delete headers.host; // Remove host header for security

  let body;
  if (!req.is('application/json') && !req.is('text/*')) {
    body = 'Non-JSON/text request';
  } else {
    try {
      body = req.body || ''; // Use existing parsed body or empty string
    } catch (error) {
      console.error('Error parsing request body:', error);
      body = 'Error parsing body';
    }
  }

  const data = { timestamp, headers, body };

  try {
    const existingData = fs.existsSync('requests.json')
      ? JSON.parse(fs.readFileSync('requests.json', 'utf8'))
      : [];
    existingData.push(data);
    fs.writeFileSync('requests.json', JSON.stringify(existingData, null, 2));
  } catch (error) {
    console.error('Error writing request to JSON file:', error);
  }
  console.error('in save requesrt.........');
  next();
};

//app.use('/', storeRequest)
//locking in middlewares for route handling
app.use('/', viewsRouter);
app.use('/', fbBotRouter);
app.use('/gateway', paymentGateWayRouter);
app.use('/front-api', frontEndApiRouter);
app.use('/admin', adminRouter);



// handling 404
app.use(function (req, res, next) {
  res.status(404).render('not-found');
});

const port = process.env.PORT || 8080;

app.listen(port, () => console.log('running on port ' + port));
