// module for frontend api
import { Router } from 'express';

import nodemailer from "nodemailer";

import handlebars from "handlebars";

import { default as fs } from 'node:fs';

const fsP = fs.promises;

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
      from: 'qsub@gmail.com',
      to: req.body.email,
      subject: 'BotSub survey',
      html: mail({chatBotUrl: process.env.CHATBOT_URL}),
    };

    const resp = await transporter.sendMail(mailOptions);
    console.log("mail send response", resp);

    res.json({ status: 'success' });
  } catch (err) {
    console.log("survey error", err);
    res.json({ status: "error" });
  }
});
