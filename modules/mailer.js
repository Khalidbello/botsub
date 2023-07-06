// module to setup email sending
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
  },
});

export default async function sendMail(mailOptions) {
  transporter.sendMail(mailOptions, (err, data) => {
    if (err) {
      console.log('failed mailer');
    } else {
      console.log('mail sent');
    }
  });
}
