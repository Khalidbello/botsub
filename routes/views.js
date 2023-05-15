// module to serve views

import { Router } from "express";

import path from 'path';

import {fileURLToPath} from 'url';

//setting __filename since its not supported in type: module
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export const router = Router();


router.get("/", (req, res)=> {
  res.send("<h2>hello world</h2>");
});


router.get("/buy-data", (req, res)=> {
  res.sendFile( path.join(__dirname, "..", "views", "buy-data.html") );
});

router.get("/buy-airtime", (req, res)=> {
  res.sendFile( path.join(__dirname, "..", "views", "buy-airtime.html") );
});

router.get("/after-pay", (req, res)=> {
  res.sendFile( path.join(__dirname, "..", "views", "after-pay.html") );
});

router.get("/survey", (req, res)=> {
  res.sendFile( path.join(__dirname, "..", "views", "survey.html") );
});

