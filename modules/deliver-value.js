// module to deliver value

import request from "request";
import cyclicDB from "cyclic-dynamodb";
import nodemailer from "nodemailer";
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
};





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
  let details = formResponse(response);
  details.product = `${response.data.meta.size} data`; 
  const mailOptions = {
    from: 'qsub@gmail.com',
    to: response.data.customer.email,
    subject: 'Qsub receipt',
    html: `
    <div style="width: 100%;">
     <div style="max-width: 1000px; margin: 0 auto; padding: 10px; border-radius: 10px; background-color: #eee;">
      <h1 style="padding: 10px; text-align: center; background-color: #112; color: white; border-radius: 10px;">Qsub Receipt</h1>
      <div style = "border-bottom: thin solid #fff;">
        <h3 style="float: left;">Product</h3> <h5 style="float: right;">${details.product}</h5>
      </div>
      <div style = "border-bottom: thin solid #fff;">
        <h3 style="float: left;">Network</h3> <h5 style="float: right;">${details.network}</h5>
      </div>
      <div style = "border-bottom: thin solid #fff;">
        <h3 style="float: left;">Product</h3> <h5 style="float: right;">2GB data bundle</h5>
      </div>
      div style="width: 150px; text-align: center; padding: 10px; margin: 20px auto 0; background-color: white; border-radius: 10px; font-weight: bold;">
        ${details.date}
      </div>
     </div>
    </div>`
  };
  
  const resp = await transporter.sendMail(mailOptions)
  .catch((err)=> console.log("error sending data mail") );
  console.log(resp);
  console.log("should have seen mail");
  return res.json({ status: "successful", data: details }); 
};  // end of sendDataResponse function



                    


// function to send data purchase mail and response
async function sendAirtimeResponse(response, res) {
  let details = formResponse(response);
  details.product = `&#8358;${response.data.meta.amount} airtime`;  
  const mailOptions = {
    from: 'qsub@gmail.com',
    to: response.data.customer.email,
    subject: 'Qsub receipt',
    html: `
    <div style="width: 100%;">
     <div style="max-width: 1000px; margin: 0 auto; padding: 10px; border-radius: 10px; background-color: #eee;">
      <h1 style="padding: 10px; text-align: center; background-color: #112; color: white; border-radius: 10px;">Qsub Receipt</h1>
      <div style = "border-bottom: thin solid #fff; display: flex; align-items: center; justify-content: space-around;">
        <h3>Product</h3> <h5>${details.product}</h5>
      </div>
      <div style = "border-bottom: thin solid #fff; display: flex; align-items: center; justify-content: space-around;">
        <h3>Network</h3> <h5>${details.network}</h5>
      </div>
      <div style = "border-bottom: thin solid #fff; display: flex; align-items: center; justify-content: space-around;">
        <h3>Product</h3> <h5>2GB data bundle</h5>
      </div>
      <div style="display: flex; align-items: center; justify-content: center; height: 30px; width: 150px; margin: 20px auto 0; background-color: white; border-radius: 10px; font-weight: bold;">
        ${details.date}
      </div>
     </div>
    </div>`
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log("failed to send airtime mail");
    } else {
      console.log(' airtime data mail sent: ' + info.response);
      res.send(info);
    };
  });
  return res.json({ status: "successful", data: details }); 
};  // end of sendAirtimeResponse function







// function to form response on failed to deliver
async function sendFailedToDeliverResponse(response, res) {
  const options = {
    from: 'qsub@gmail.com',
    to: response.data.customer.email,
    subject: 'Qsub receipt',
    html: `
    <div style="width: 100%;">
     <div style="max-width: 1000px; margin: 0 auto; padding: 10px; border-radius: 10px; background-color: #eee;">
      <h1 style="
    `
  };
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