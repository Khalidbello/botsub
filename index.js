// entry file for qsub

// making configurations for different environmet


import express from "express";
import handlebars from "express-handlebars";
import path from 'path';
import { fileURLToPath } from 'url';



// importing modules to handle different routes 
import { router as viewsRouter } from "./routes/views.js";
import { router as frontEndApiRouter } from "./routes/frontend-api.js";
import { router as paymentGateWayRouter } from "./routes/payment-gateway.js";
import { router as fbBotRouter } from "./routes/fb-bot-webhook.js";

// adding configurations for environment

if (process.env.NODE_ENV == "development") {
  console.log("in development mode");
  const env = process.env;
  
  env.FLW_PB_KEY = env.FLW_TEST_PB_KEY;
  env.FLW_SCRT_KEY = env.FLW_TEST_SCRT_KEY;
  env.WALLET_ACC_NUMBER = env.WALLET_ACC_NUMBER_TEST;
  env.WALLET_ACC_NAME = env.WALLET_ACC_NAME_TEST;
  env.SETTLED_COLLECTION = env.SETTLED_COLLECTION_TEST;
  env.PENDING_COLLECTION = env.PENDING_COLLECTION_TEST;
  env.TOREFUND_COLLECTION = env.TOREFUND_COLLECTION_TEST;
} else if (process.env.NODE_ENV === "staging") {
  console.log("in staging mode");

} else if (process.env.NODE_ENV === "production") {
  console.log("in production mode");
  const env = process.env; 
  
  process.env.FLW_PB_KEY = process.env.FLW_OG_PB_KEY;
  process.env.FLW_SCRT_KEY = process.env.FLW_OG_TEST_SCRT_KEY;
};





// setting __filename since its not supported in type: module
const __filename = fileURLToPath(import.meta.url);
console.log(__filename)

// // setting __dirname since its not supported in type: module
const __dirname = path.dirname(__filename);
console.log('directory-name 👉️', __dirname);




// initialising app
const app = express();


// configuring handlebars as app templating engine
app.engine('html', handlebars.engine({
  defaultLayout: false,
  extname: '.html'
})
);

app.set('view engine', 'html');




//locking in middlewares

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
};


app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




//locking in middlewares for route handling
app.use("/gateway", paymentGateWayRouter);
app.use("/front-api", frontEndApiRouter);
app.use("/", viewsRouter);
app.use("/", fbBotRouter)

// handling 404
app.use(function(req, res, next) {
  res.status(404).render("not-found");
});

const port = process.env.PORT || 7270;

app.listen(port, () => console.log("running on port " + port));
