// module to deliver value

import request from "request";
import cyclicDB from "cyclic-dynamodb";
import nodemailer from "nodemailer";
import {successfullDeliveryMail, failedDeliveryMail} from "./email-templates.js";

//import mailer from "./mailer.js";



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bellokhalid74@@gmail.com',
    pass: process.env.EMAIL_PASS
  }
});  // end of transporter



export function deliverValue(response, req, res, requirementMet) {
  if (requirementMet.type == "data") {
    return deliverData(response, req, res);
  } else if (requirementMet.type == "airtime") {
    return deliverAirtime(response, req, res);
  };
};


// function to make data purchase request

async function deliverData(response, req, res) {
  let options = {
    'method': 'POST',
    'url': 'https://opendatasub.com/api/data/',
    'headers': {
      'Authorization': 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      "network": Number(response.data.meta.networkID),
      "mobile_number": response.data.meta.number,
      "plan": Number(response.data.meta.planID),
      "Ported_number":true
    },
    json: true 
  };
  // making request
  request(options, (error, resp, body) => {
    if (error) {
      console.log(error); 
      return res.send(error);
    };
    console.log(response.body);
    // to do if succesfull transaction
    if (true) {
      addToDelivered(req);
      //calling function to send mail and json response object
      return sendDataResponse(response, res);
    } else if (true) {
      addToFailedToDeliver(req);
      return sendFailedToDeliverResponse(response, res);
    };
  });
};  // end of deliver value function




// function to make airtime purchase request
async function deliverAirtime(response, req, res) {
  let options = {
    'method': 'POST',
    'url': 'https://opendatasub.com/api/topup/',
    'headers': {
      'Authorization': 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      "network": Number(response.data.meta.networkID),
      "amount": Number(response.data.meta.amount),
      "mobile_number": response.data.meta.number,
      "Ported_number": true,
      "airtime_type":"VTU"
    },
    json: true 
  };
  // making request
  request(options, (error, resp, body) => {
    if (error) {
      console.log(error); 
      return res.send(error);
    };
    console.log(response.body);
    
    // to do dependent transaction status
    if (true) {
      addToDelivered(req)
      //calling function to send mail and json response object
      return sendAirtimeResponse(response, res);
    } else if (true) {
      addToFailedToDeliver(req);
      return sendFailedToDeliverResponse(response, res);
    };
  });
}; // end of deliverAirtime





// function to add transaction to delivered transaction
async function addToDelivered(req) {
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("settled");
  const response = await deliveredDB.set(req.query.tx_ref, {transactionID: req.query.transaction_id});
  console.log(response);
  return response;
}; // end of addToDelivered





// function to add transaction to failed to deliver
async function addToFailedToDeliver(req) {
  const db = cyclicDB(process.env.DB_TABLENAME);
  const deliveredDB = db.collection("failed-to-deliver");
  const response = await deliveredDB.set(req.query.tx_ref, {transactionID: req.query.transaction_id});
  console.log(response);
  return response;
}; // end if add to failed to deliver






// function to send data purchase mail and response
async function sendDataResponse(response, res) {
  const details = formResponse(response);
  details.product = `${response.data.meta.size} data`;
  const mailParams = {
    product: details.product,
    network: details.network,
    date: details.date,
    id: response.data.id,
    txRef: response.data.tx_ref,
    status: "successfull",
    price: response.data.amount,
  };
  const mailOptions = {
    from: 'qsub@gmail.com',
    to: response.data.customer.email,
    subject: 'Qsub receipt',
    html: successfullDeliveryMail(mailParams)
  };
  
  const resp = await transporter.sendMail(mailOptions)
  .catch((err)=> console.log("error sending data mail") );
  console.log(resp);
  return res.json({ status: "successful", data: details }); 
};  // end of sendDataResponse function



                    


// function to send data purchase mail and response
async function sendAirtimeResponse(response, res) {
  let details = formResponse(response);
  details.product = `&#8358;${response.data.meta.amount} airtime`;  
  const mailParams = {
    product: details.product,
    network: details.network,
    date: details.date,
    id: response.data.id,
    txRef: response.data.tx_ref,
    status: "successfull",
    price: response.data.amount,
  };
  const mailOptions = {
    from: 'qsub@gmail.com',
    to: response.data.customer.email,
    subject: 'Qsub receipt',
    html: successfullDeliveryMail(mailParams)
  };
  const resp = await transporter.sendMail(mailOptions)
  .catch((err)=> console.log("error sending data mail") );
  console.log(resp);
  return res.json({ status: "successful", data: details }); 
};  // end of sendAirtimeResponse function







// function to form response on failed to deliver
async function sendFailedToDeliverResponse(response, res) {
  const mailOptions = {
    from: 'qsub@gmail.com',
    to: response.data.customer.email,
    subject: 'Failed To Deliver Purchased product',
    html: failedDeliveryMail()
  };
  const resp = await transporter.sendMail(mailOptions)
  .catch((err)=> console.log("error sending data mail") );
  console.log(resp);
  return res.json({status: "failedDelivery", message: "failed to deliver purchased product"})
}; // end of sendFailedToDeliverResponse






//function to form response for request
function formResponse(response) {
  const meta = response.data.meta;
  // create a Date object with the UTC time
  const date = new Date(response.data.customer.created_at);
  // Create an Intl.DateTimeFormat object with the Nigeria time zone
  const nigeriaFormatter = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'long',
      timeStyle: 'medium',
  }); 
  // Format the Nigeria time using the formatter
  const nigeriaTimeString = nigeriaFormatter.format(date);
  const details = {
    network: meta.network,
    number: meta.number,
    email: response.data.customer.email,
    date: nigeriaTimeString,
  };  
  return details;
};  // end of formResponse






// function to check balance and add to it when necessary
async function topUpBalance() {
  
};