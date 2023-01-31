// module for things related to payment gate ways
import {default as fsWithCallbacks} from "node:fs";
const fs = fsWithCallbacks.promises;
import cyclicDB from "cyclic-dynamodb";
import flutterwave from "flutterwave-node-v3";
import { Router } from "express";


export const router = Router();



// route for confirming payment
router.get("/confirm", (req, res)=> {
  const flw = new flutterwave(process.env.FLUTTER_PB_KEY,  
    process.env.FLUTTER_PRV_KEY);

  flw.Transaction.verify({id: req.query.transaction_id})
  .then((response)=> {
    
    if (true) {
      res.json({status: response}); res.end();
    };

    /*/ calling function to check if transaction has never beign 
    // made before
    const previouslyDelivered = checkIfPreviouslyDelivered(
      req.query.transaction_id, req.query.tx_ref);
    
    if (previouslyDelivered) {
      res.json({status: "ok", state: "previouslyDelivered"});
      return;
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
    res.end();*/
  })
  .catch((err)=> res.json({status: "failed", error: err}) );
}); //end of confirm payment routes




// function to check if transaction has ever beign made
const checkIfPreviouslyDelivered = async function (transaction_id,
 transactionRef) {
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("delivered");
  const toConfirm = await deliveredDB.get(transactionRef);

  if (toConfirm) {
    let condition = toConfirm.props.refrence === req.query
     .transactionRef;
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

    let price = Number( dataDetails[response.meta.networkID][response
     .meta.planID]["price"] );
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
	



const deliverValue = function (response, req, res, requireMet) {
  if (requirementMet.type === "data"); return reDirect(type="data");
  if (requirementMet.type === "airtime"); return reDirect(type=
  "airtime");	
  // function to perform reDirect
  let reDirect = function (type=false) {
    let info = {
      networkID: response.meta.networkID,
      number: response.meta.number,
    }

    if (type === "data") {
      info["planId"] = response.meta.planID;
      let  toDeliverCode = createStoreToDeliverCode(info); 
      res.redirect(303, `/deliver/data?tDCode=${toDeliverCode}`);
      return;
    };
    if (type === "airtime") {
      info["amount"] = response.meta.amount;
      let  toDeliverCode = createStoreToDeliverCode(info);
      res.redirect(303, `/deliver/airtme?tDCode=${toDeliverCode}`);
      return;
    };
  }; // end of redirect function
}; // end of deliver value function



// function to create and store to deliver code
const createStoreToDeliverCode = async function(info) {
  const codes = "QTYOPLMBCVTDSAGK0985674321&@#$_&-+()/%£¢¥";
  const length = code.length;
  let code;
  
  for (i < 10; i = 0;) {
    code += codes.charAt(Math.floor( Math.random()*length) );
  };

  let storedCodes = await fs.readFile("stored-codes.json",
  "utf8").catch((err)=> console.log(err) );
  storedCodes = JSON(storedCodes);
  
  if (storedCodes.hasOwnProperty(code)) createStoreToDeliverCode(info);
 
  storedCodes[code] = info;
  storedCodes = JSON.stringify(storedCodes);
  
  await fs.writeFile("stored-codes.json").catch((err)=> 
  console.log(err) );

  return code;
};//




