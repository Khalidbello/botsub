// module for things related to payment gate ways
import {default as fs } from "node:fs"; 
  
const fsP = fs.promises;

import cyclicDB from "cyclic-dynamodb";

import flutterwave from "flutterwave-node-v3";

import { Router } from "express";

import mailer from "./mailer.js";

import {deliverValue} from "./deliver-value.js";

import nodemailer from "nodemailer";

export const router = Router();



// route for confirming payment and calling payment deliver function
router.get("/confirm", async (req, res)=> {
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
  
  if (previouslyDelivered) {
    const meta = response.data.meta;
    // Create a Date object with the UTC time
    const date = new Date(response.data.customer.created_at);
    // Create an Intl.DateTimeFormat object with the Nigeria time zone
    const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'long',
      timeStyle: 'medium',
    }); 
    // Format the Nigeria time using the formatter
    const nigeriaTimeString = nigeriaFormatter.format(date);

    console.log(nigeriaTimeString); // Output: 5/6/2023, 11:02:44 PM

    const details = {
      network: meta.network,
      number: meta.number,
      email: response.data.customer.email,
      date: nigeriaTimeString,
    };
    if (meta.type == "airtime") {
      details.product = `&#8358;${meta.amount} airtime`;
    };
    if (meta.type == "data") {
      details.product = `${meta.size} data`;
    };
    return res.json({ status: "settled", data: details }); 
  };
  
  // calling function to ccheck if all transaction requirement were met
  let requirementMet = await checkRequirementMet(response, req, res);
  if (requirementMet.status) {
    return deliverValue(response, req, res, requirementMet);
    //return res.json({status:"success", message:"requirement met", data: requirementMet.type});
  };
  // calling refund payment if proper conditions were not met
  const finalResp = await refundPayment(req.query.transaction_id, req.query.tx_ref, response.data.customer.email); 
  return res.json(finalResp);
}); //end of confirm payment routes





// route for initialing account for payment to be made to
// Install with: npm i flutterwave-node-v3
router.get("/transfer-account", async (req, res)=> {
  const details = {
    tx_ref: "MC-1585230950508",
    amount: "1500",
    email: "johnmadakin@gmail.com",
    currency: "NGN",
  };

  const response = await flw.Charge.bank_transfer(details);
  console.log(response);
  res.json(response);
}); // end of transfer-account routes




// function to check if transaction has ever beign made
const checkIfPreviouslyDelivered = async function (transaction_id, transactionRef) {
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("settled");
  const toConfirm = await deliveredDB.get(transactionRef);
  
  if (toConfirm) {
    let condition = toConfirm.props.transactionID === transaction_id;
    return condition;
  };
  return false;
};//end of checkIfPreviouslyDelivered




// function to check if all requirements are met 
const checkRequirementMet = async function (response, req, res) {
  let returnFalse = false;
  if (response.data.meta.type === "data") {
    let dataDetails = await fsP.readFile("files/data-details.json")
    .catch((err)=> returnFalse = true );

    if (returnFalse) return {status: false, messsage: "error reading data-details.json"};
    
    dataDetails = JSON.parse(dataDetails); 
    let price;
    try {
      price = Number( dataDetails[response.data.meta.networkID][response.data.meta.index]["price"] );
    } catch (err) { 
      returnFalse = true 
    };
    
    if (returnFalse) return {status: false, message: "data plan with id not found"};
    let pricePaid = Number(response.data.amount);

    if (
      response.data.status === "successful" && 
      pricePaid >= price &&
      response.data.currency === "NGN" &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price; //amount to be refunded
      return {status: true, refund: toRefund, type: "data"};
    };
  };

  if (response.data.meta.type === "airtime") {
    let price = Number(response.data.meta.amount);
    let pricePaid = Number(response.data.amount);
    console.log(price);
    console.log(pricePaid);
    if (
      response.data.status === "successful" && 
      pricePaid >= price &&
      response.data.currency === "NGN" &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price;
      return {status: true, refund: toRefund, type: "airtime"};
    };
  }; 
  return {status: false, message: "payment requirement not met"};
}; //end of checkRequiremtMet
	



// helper function to refund payment

async function refundPayment(transactionId, transactionRef, customerMail) {
  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  const response = await flw.Transaction.refund({
    id: transactionId,
    amount: null,
    comments: "transaction requirement not met"
  });
  const date = new Date();
  // Create an Intl.DateTimeFormat object with the Nigeria time zone
  const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'long',
      timeStyle: 'medium',
  }); 
  // Format the Nigeria time using the formatter
  const nigeriaTimeString = nigeriaFormatter.format(date);

  const options = {
    from: 'qsub@gmail.com',
    to: customerMail,
    subject: 'Qsub Transaction failed',
    html: `
    <div style="width: 100%;">
     <div style="max-width: 1000px; margin: 0 auto; padding: 10px; border-radius: 10px; background-color: #eee;">
      <h1 style="padding: 10px; text-align: center; background-color: #112; color: white; border-radius: 10px;">Qsub Failed Transaction</h1>
      <p> payment has been refunded due to the fact that some transaction requirement was not met.
        <br>
        this might be as a result of transfering insufficient amount for product purchase.
        <br>
        Refund would be received between 3 to 5 days 
        <br><br>
        thank you...
      </p>
      <div style="width: 150px; text-align: center; padding: 10px; margin: 20px auto 0; background-color: white; border-radius: 10px; font-weight: bold;">
        ${nigeriaTimeString}
      </div>`
  };
  console.log(response);
  await mailer(options);
  // adding transaction to toRefundDb
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("toRefund");
  let resp = await deliveredDB.set(transactionRef, {transactionID: transactionId});
  console.log(resp);
  return {
    status: "requirementNotMet",
  };
}; // end of refundPayment



router.get("/test", async(req, res)=> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'bellokhalid74@@gmail.com',
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: 'qsub.com',
    to: 'bellokhalid74@gmail.com',
    subject: 'testing Qmail',
    html: '<p style="color:red; background-color:black; border-radius: 10px;">Qsub is on </p>'
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
      res.send(err);
    } else {
      console.log('Email sent: ' + info.response);
      res.send(info);
    };
  });
});