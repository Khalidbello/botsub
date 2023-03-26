// entry file for qsub

// making configurations for different environmet
import dotenv from "dotenv";
if (process.env.NODE_ENV === "development") {
  dotenv.config();
};


import express from "express";
import handlebars from "express-handlebars";
import path from 'path';
import {fileURLToPath} from 'url';



// importing modules to handle different routes 
import {router as viewsRouter}  from "./modules/views.js";
import {router as paymentGateWayRouter} from "./modules/payment-gate-way.js";


console.log(process.env.TEST);


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
    defaultLayout: 'main',
    extname: '.html'
   })
);

app.set('view engine', 'html');




//locking in middlewares
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




//locking in middlewares for route handling
app.use("/payment", paymentGateWayRouter);
app.use("/view", viewsRouter );




const port = process.env.PORT || 8080;

app.listen(port, ()=> console.log("running on port " + port) );
