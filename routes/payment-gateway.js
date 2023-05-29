// module for things related to payment gate ways
import {default as fs } from "node:fs"; 
  
const fsP = fs.promises;

import cyclicDB from "cyclic-dynamodb";

import flutterwave from "flutterwave-node-v3";

import { Router } from "express";

import {checkIfPreviouslyDelivered, returnPreviouslyDelivered, checkRequirementMet, refundPayment} from "./../modules/payment-gateway-helpers.js";

import {deliverValue} from "./../modules/deliver-value.js";

import nodemailer from "nodemailer";

import axios from "axios";



export const router = Router();




// route for confirming payment and calling payment deliver function
router.get("/confirm", async (req, res)=> {
  console.log(req.query.webhook);
  if (!req.query.transaction_id || !req.query.tx_ref) {
    return res.json({status: "error", message: "query parameters missing"});
  };
  
  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY); 
  const response = await flw.Transaction.verify({id: req.query.transaction_id})
  .catch((err)=> {
    return res.json({status: "error", message: "failed to check transaction"}) 
  }); // end9f check transaction call
  
  if (response.status == "error") {
    return res.json({status: "error", message: "error fetching transaction"}); 
  };
  console.log(response);
  
  // calling function to check if transaction has ever beign made before
  
  const previouslyDelivered = await checkIfPreviouslyDelivered(req.query.transaction_id, req.query.tx_ref);
  
  if (previouslyDelivered && true) {
    let details = returnPreviouslyDelivered(response);
    return res.json({ status: "settled", data: details }); 
  };
  
  // calling function to ccheck if all transaction requirement were met
  let requirementMet = await checkRequirementMet(response, req, res);
  if (requirementMet.status && true) {
    return deliverValue(response, req, res, requirementMet);
    //return res.json({status:"success", message:"requirement met", data: requirementMet.type});
  };
  // calling refund payment if proper conditions were not met
  const finalResp = await refundPayment(req.query.transaction_id, req.query.tx_ref, response.data.customer.email); 
  return res.json(finalResp);
}); //end of confirm payment routes





// route for initialing account for payment to be made to
// Install with: npm i flutterwave-node-v3
router.post("/transfer-account", async (req, res)=> {
  const datas = req.body;
  console.log(datas);
  let meta;
  if (datas.type = "data") {
    meta = {
      network: datas.network,
      planID: datas.planID,
      networkID: datas.networkID,
      number: datas.phoneNumber,
      index: datas.index,
      type: datas.type,
      size: datas.size,
    };
  };
  console.log(meta);
  const details = {
    tx_ref: "MC-158523ghjjj0950508",
    amount: datas.price,
    email: datas.email,
    currency: "NGN",
    meta: meta,
  };

  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  const response = await flw.Charge.bank_transfer(details);
  console.log(response);
  res.json(response);
}); // end of transfer-account route


        

// route for flutterwave webhook
// In an Express-like app:

router.post("/flw-webhook", (req, res) => {
  console.log("am in webhook")
  // If you specified a secret hash, check for the signature
  const mySecret = process.env['FLW_H']
  const signature = req.headers["verif-hash"];
  console.log(signature);
  console.log(mySecret)
  if (!signature || (signature != mySecret)) {
    // This request isn't from Flutterwave; discard
    console.log("in ashhh")
    return res.status(401).end();
  };
  const payload = req.body;
  const host = req.hostname;
  console.log("btw hook")  
  //https://qsub0.khalidbello.repl.co/gateway/test
  axios.get(`https://qsub0.khalidbello.repl.co/gateway/confirm?transaction_id=${payload.id}&tx_ref=${payload.txRef}&webhook=webhooyouu`)
  .then(response => console.log(response.data) )
  .catch(error => console.error(error) );
  console.log("end hook")  
  res.status(200).end();
});  // end of flw webhook





router.get("/test", async(req, res)=> {
  const details = {
    tx_ref: "MC-1585230hftfghhhghjhhfhhfh950508",
    amount: 250,
    email: "bellokhalid74@gmail.com",
    currency: "NGN",
    meta: {
      network: "mtn",
      networkID: 1,
      planID: 7,
      index: 2,
      number: "08188146243",
    },
  };

  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  const response = await flw.Charge.bank_transfer(details);
  if (response.status = "success") {
    res.json(response.meta);
  } else {
    res.json({status: "error"});
  };
});