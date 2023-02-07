// module to setup email sending
import nodemailer from "nodemailer"

export const sendMail = function(mailOptions) {
  let transporter = nodemailer.createTransport({
     service: "gmail",
     auth: {
       user: "bellokhalid74@gmail.com",
       pass: "kH9L!D_bello",
     }
  });
  
  transporter.sendMail(mailOptions, (err, data)=> {
    if(err) {
      return false;
      console.log(err);
    } else {
      return true;
    };
  });
};

