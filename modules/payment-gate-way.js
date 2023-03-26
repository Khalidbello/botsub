// module for things related to payment gate ways
import {default as fs} from "node:fs"; 
  
const fsP = fs.promises;

import cyclicDB from "cyclic-dynamodb";

import flutterwave from "flutterwave-node-v3";

import { Router } from "express";

import {sendMail} from "./mailer.js";


export const router = Router();



// route for confirming payment
router.get("/confirm", (req, res)=> {
  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  
  flw.Transaction.verify({id: req.query.transaction_id})
  .then((response)=> {
    if (respone.status == "succees") {
      res.json({status: response, ok: 'okkkk'}); res.end();
    };

    // calling function to check if transaction has never beign 
    // made before
    const previouslyDelivered = checkIfPreviouslyDelivered(req.query.transaction_id, req.query.tx_ref);
    
    if (previouslyDelivered) {
      res.json({status: "ok", state: "previouslyDelivered"});
      res.end();
    };

    // calling function to ccheck if all transaction requirement
    // were met
    const requirementMet = checkRequirementMet(response, req, res);
    if (requirementMet.status) {
      deliverValue(response, req, res, requirementMet);
      res.end();
    };

    // calling refund payment if proper conditions were not met
    refundPayment(req, res, response);
    res.end();
  })
  .catch((err)=> res.json({status: "error", error: err}) );
}); //end of confirm payment routes




// function to check if transaction has ever beign made
const checkIfPreviouslyDelivered = async function (transaction_id, transactionRef) {
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("delivered");
  const toConfirm = await deliveredDB.get(transactionRef);

  if (toConfirm) {
    let condition = toConfirm.props.refrence === req.query.transactionRef;
    return condition;
  };
  return false;
};//end of checkIfPreviouslyDelivered




// function to check if all requirements are met 
const checkRequirementMet = async function (response, req, res) {
  if (response.meta.type === "data") {
    let dataDetails = await fs.readFile("data-details.json", "utf8")
    .catch((err)=> {
      console.log("err:", err);
      res.json({status: "error"});
      res.end();
    });
    dataDetails = JSON.parse(dataDetails); 

    let price = Number( dataDetails[response.meta.networkID][response.meta.planID]["price"] );
    let pricePaid = Number(response.data.amount);

    if (
      response.status === "successful" && 
      pricePaid >= price &&
      response.data.currency === "NGN" &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price; //amount to be refunded
      return {status: true, refund: toRefund, type: "data"};
    };
  };

  if (response.meta.type === "airtime") {
    let price = Number(response.meta.amount);
    let pricePaid = Number(response.data.amount);
    
    if (
      response.status === "successful" &&
      pricePaid >= price &&
      response.data.currency === "NGN" &&
      response.data.tx_ref === req.query.tx_ref
    ) {
      let toRefund = pricePaid - price;
      return {status: true, refund: toRefund, type: "airtime"};
    };
  };
  
  return {status: false};
}; //end of checkRequiremtMet
	




router.get("/test", async(req, res)=> {
  console.log("tes5");
  let mailOptions = {
    from: "qsub@gmail.com",
    to: "fawazbello11@gmail.com",
    subject: "testimg qsub mailing system",
    text: "rough work"
  };

  let resp = sendMail(mailOptions);
  if(resp){
    console.log("sent");
    res.end("sent");
  } else {
    console.log("not sent");
    res.end("failed to send");
  };
});

