// module to setup email sending
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail(mailOptions: any) {
  transporter.sendMail(mailOptions, (err: Error, data: any) => {
    if (err) {
      console.error('failed mailer');
    } else {
      console.log('mail sent');
    }
  });
}

export { sendMail };
