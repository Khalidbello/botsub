// entry file for qsub

// making configurations for different environmet

const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const { fileURLToPath } = require('url');

// importing modules to handle different routes
const viewsRouter = require('./routes/views.js');
const frontEndApiRouter = require('./routes/frontend-api.js');
const paymentGateWayRouter = require('./routes/payment-gateway.js');
const fbBotRouter = require('./routes/fb-bot-webhook.js');

// adding configurations for environment

if (process.env.NODE_ENV === 'development') {
  console.log('in development mode');
  const env = process.env;
  env.FLW_PB_KEY = env.FLW_TEST_PB_KEY;
  env.FLW_SCRT_KEY = env.FLW_TEST_SCRT_KEY;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_TEST;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_TEST;
  env.SETTLED_COLLECTION = env.SETTLED_COLLECTION_TEST;
  env.PENDING_COLLECTION = env.PENDING_COLLECTION_TEST;
  env.TOREFUND_COLLECTION = env.TOREFUND_COLLECTION_TEST;
  env.USERS_COLLECTION = env.USERS_COLLECTION_TEST;
} else if (process.env.NODE_ENV === 'staging') {
  console.log('in staging mode');
} else if (process.env.NODE_ENV === 'production') {
  console.log('in production mode');
  const env = process.env;
  env.FLW_PB_KEY = process.env.F_P_K;
  env.FLW_SCRT_KEY = process.env.F_S_K;
  env.SETTLED_COLLECTION = env.S_C_P;
  env.PENDING_COLLECTION = env.P_C_P;
  env.TOREFUND_COLLECTION = env.R_C_P;
  env.USERS_COLLECTION = env.U_C_P;
}

// setting __filename since its not supported in type: module
console.log(__filename);

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

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
}

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//locking in middlewares for route handling
app.use('/gateway', paymentGateWayRouter);
app.use('/front-api', frontEndApiRouter);
app.use('/', viewsRouter);
app.use('/', fbBotRouter);

// handling 404
app.use(function (req, res, next) {
  res.status(404).render('not-found');
});

const port = process.env.PORT || 7270;

app.listen(port, () => console.log('running on port ' + port));
