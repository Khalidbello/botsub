// module to setup email sending
import nodemailer from "nodemailer"
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "bellokhalid74@gmail.com",
    pass: "kH9L!D_BELL0",
  },
});
export const sendMail = function(mailOptions) { 
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

