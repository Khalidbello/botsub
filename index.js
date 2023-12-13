// entry file for BotSub
// ngrok http --domain=weekly-settled-falcon.ngrok-free.app 4040
// https://weekly-settled-falcon.ngrok-free.app

require('dotenv').config();
const express = require('express');
const handlebars = require('express-handlebars');

// importing modules to handle different routes
// just to commit
const viewsRouter = require('./routes/views.js');
const frontEndApiRouter = require('./routes/frontend-api.js');
const paymentGateWayRouter = require('./routes/payment-gateway.js');
const fbBotRouter = require('./routes/fb-bot-webhook.js');
const connectDB = require('./models/connectdb.js');

// setting  configurations for different environment
if (process.env.NODE_ENV === 'development') {
  console.log('in development mode');
  const env = process.env;

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
} else if (process.env.NODE_ENV === 'production') {
  console.log('in production mode');
  const env = process.env;

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
};

// setting __filename since its not supported in type: module
console.log(__filename, process.env.FLW_H);

// // setting __dirname since its not supported in type: module
console.log('directory-name 👉️', __dirname);

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

//locking in middlewares
const noCacheMiddleware = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
};

// static middleware
app.use(express.static('public'));
// Use the middleware for all routes
app.use(noCacheMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connecting db
connectDB();

//locking in middlewares for route handling
app.use('/gateway', paymentGateWayRouter);
app.use('/front-api', frontEndApiRouter);
app.use('/', viewsRouter);
app.use('/', fbBotRouter);

// handling 404
app.use(function(req, res, next) {
  res.status(404).render('not-found');
});

const port = process.env.PORT || 4040;

app.listen(port, () => console.log('running on port ' + port));