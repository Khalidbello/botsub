// entry file for BotSub
// ngrok http --domain=weekly-settled-falcon.ngrok-free.app 8080
// https://weekly-settled-falcon.ngrok-free.app

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const handlebars = require('express-handlebars');
const cors = require('cors');

// importing modules to handle different routes
// just to commit
const viewsRouter = require('./routes/views.js');
const frontEndApiRouter = require('./routes/frontend-api.js');
const paymentGateWayRouter = require('./routes/payment-gateway.js');
const fbBotRouter = require('./routes/fb-bot-webhook.js');
const adminRouter = require('./routes/admin.js');
const connectDB = require('./models/connectdb.js');
let origin = 'http://127.0.0.1:3000';

// setting  configurations for different environment
if (process.env.NODE_ENV === 'development') {
  console.log('in development mode');
  const env = process.env;

  env.DB_NAME = 'development';
  env.FLW_PB_KEY = env.FLW_TEST_PB_KEY;
  env.FLW_SCRT_KEY = env.FLW_TEST_SCRT_KEY;
  env.FLW_H = env.FLW_H_TEST;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_TEST;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_TEST;
  env.SETTLED_COLLECTION = env.SETTLED_COLLECTION_TEST;
  env.FAILED_DELIVERY_COLLECTION = env.FAILED_DELIVERY_COLLECTION_TEST;
  env.TOREFUND_COLLECTION = env.TOREFUND_COLLECTION_TEST;
  env.USERS_COLLECTION = env.USERS_COLLECTION_TEST;
  env.FB_BOT_COLLECTION = env.FB_BOT_COLLECTION_TEST;
} else if (process.env.NODE_ENV === 'staging') {
  console.log('in staging mode');
  const env = process.env;

  env.DB_NAME = 'botsub';
  env.FLW_PB_KEY = env.FLW_TEST_PB_KEY;
  env.FLW_SCRT_KEY = env.FLW_TEST_SCRT_KEY;
  env.FLW_H = env.FLW_H_TEST;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_TEST;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_TEST;
  env.SETTLED_COLLECTION = env.SETTLED_COLLECTION_TEST;
  env.FAILED_DELIVERY_COLLECTION = env.FAILED_DELIVERY_COLLECTION_TEST;
  env.TOREFUND_COLLECTION = env.TOREFUND_COLLECTION_TEST;
  env.USERS_COLLECTION = env.USERS_COLLECTION_TEST;
  env.FB_BOT_COLLECTION = env.FB_BOT_COLLECTION_TEST;
  //origin = 'https:admin.botsub.com.ng';
} else if (process.env.NODE_ENV === 'production') {
  console.log('in production mode');
  const env = process.env;

  env.DB_NAME = 'botsub';
  env.FLW_PB_KEY = process.env.F_P_K;
  env.FLW_SCRT_KEY = process.env.F_S_K;
  env.FLW_H = env.F_H_K;
  env.WALLET_ACC_NUMBER = env.W_A_C_P;
  env.WALLET_ACC_NAME = env.W_A_N_P;
  env.SETTLED_COLLECTION = env.S_C_P;
  env.FAILED_DELIVERY_COLLECTION = env.F_C_P;
  env.TOREFUND_COLLECTION = env.R_C_P;
  env.USERS_COLLECTION = env.U_C_P;
  env.FB_BOT_COLLECTION = env.FB_BOT_C;
  origin = ['https://admin.botsub.com.ng', 'http://admin.botsub.com.ng'];
};

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
