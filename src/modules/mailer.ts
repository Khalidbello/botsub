// module to setup email sendingr
import nodemailer, { SentMessageInfo } from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail(mailOptions: any) {
  transporter.sendMail(mailOptions, (err: Error | null, data: SentMessageInfo) => {
    if (err) {
      console.error('failed mailer');
    } else {
      console.log('mail sent');
    }
  });
}

export { sendMail };
