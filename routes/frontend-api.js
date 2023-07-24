// module for frontend api
import { Router } from 'express';

import nodemailer from "nodemailer";

import handlebars from "handlebars";

import axios from "axios";

import { removeFromPendingAddToSettled, retryAllFailedDelivery } from "./../modules/helper_functions.js";

import { default as fs } from 'node:fs';

const fsP = fs.promises;

import { createClient } from "./../modules/mongodb.js";

export const router = Router();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
  },
}); // end of transporter


router.get('/data-offers', async (req, res) => {
  let dataOffers = await fsP.readFile('files/data-details.json');
  dataOffers = JSON.parse(dataOffers);
  dataOffers.FLW_PB_KEY = process.env.FLW_PB_KEY;
  res.json(dataOffers);
});

// route to recieve and  save survey datas
router.post('/survey', async (req, res) => {
  try {
    console.log("survey payload", req.body);
    const mailTemplate = await fsP.readFile("modules/email-templates/survey-recieved-mail.html", "utf8");
    const mail = handlebars.compile(mailTemplate);
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: req.body.email,
      subject: 'BotSub survey',
      html: mail({ chatBotUrl: process.env.CHATBOT_URL }),
    };

    const resp = await transporter.sendMail(mailOptions);
    console.log("mail send response", resp);

    res.json({ status: 'success' });
  } catch (err) {
    console.log("survey error", err);
    res.json({ status: "error" });
  }
});


// routes for admin

router.post("/retry", async (req, res) => {
  const { transaction_id, tx_ref } = req.query;
  console.log("req.quer", req.query);

  const response = await axios.get(`https://${req.hostname}/gateway/confirm?retry=Retry&transaction_id=${transaction_id}&tx_ref=${tx_ref}`);
  const data = await response.data;
  console.log("retry data", data);

  if (data.status === "successful") {
    // calling function to delete transaction from pemding and add to setled
    await removeFromPendingAddToSettled(transaction_id, tx_ref);
    return res.json(data);
  }

  res.json(data);
});


router.post("/retry-all", async (req, res) => {
  const statistic = await retryAllFailedDelivery(req);
  console.log("statistic", statistic);
  res.json(statistic);
});


router.get("/fetch-failed-transactions", async (req, res) => {
  try {
    const client = createClient();
    await client.connect();
    const collection = client.db(process.env.BOTSUB_DB).collection(process.env.FAILED_DELIVERY_COLLECTION);

    const { toSkip, limit } = req.query;
    const data = await collection.find()
      .skip(parseInt(toSkip))
      .limit(parseInt(limit))
      .toArray();

    console.log("failed transact", data);
    res.json(data);
  } catch (err) {
    console.log("error fetching pemding transaction", err);
    res.json({ error: err });
  };
});