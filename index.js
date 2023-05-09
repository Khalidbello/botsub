// entry file for qsub

// making configurations for different environmet


import express from "express";
import handlebars from "express-handlebars";
import path from 'path';
import {fileURLToPath} from 'url';



// importing modules to handle different routes 
import {router as viewsRouter}  from "./modules/views.js";
import {router as frontEndApiRouter} from "./modules/front-end-api.js";
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
app.use("/gateway", paymentGateWayRouter);
app.use("/front-api", frontEndApiRouter);
app.use("/", viewsRouter );

// handling 404
app.use(function(req, res, next) {
  res.status(404).sendFile( path.join(__dirname, "views", "not-found.html") );
});


const port = process.env.PORT || 7070;

app.listen(port, ()=> console.log("running on port " + port) );
