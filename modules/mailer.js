// module to setup email sending
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bellokhalid74@@gmail.com',
    pass: process.env.EMAIL_PASS
  }
});

export default async function sendMail(mailOptions) { 
  transporter.sendMail(mailOptions, (err, data)=> {
    if(err) {
      console.log(err);
      console.log("failed mailer");
      return false;
    } else {
      return true;
    };
  });
};

