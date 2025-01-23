const fs = require('fs');
import Handlebars from 'handlebars';
import { sendMessage } from '../bot/modules/send_message';
import Transactions from '../models/transactions';
import { dateFormatter } from './helper_functions';
import { addDataProfit } from './save-profit';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';

// helper function for succesfull response
const helpSuccesfulDelivery = async (response: any, balance: number, type: 'data' | 'airtime') => {
  console.log('response in helpSuccesfulDekvery', response);
  await addToDelivered(response, type);

  // calling function to send mail and json response object
  //await sendSuccessfulResponse(response);

  if (response.data.meta.bot) {
    const date = new Date(); //new Date(response.data.customer.created_at);
    const nigeriaTimeString = dateFormatter(date);

    try {
      if (response.data.meta.platform === 'facebook') {
        await sendMessage(response.data.meta.senderId, {
          text: `Transaction Succesful \nProduct: ${product(response)} \nRecipient: ${
            response.data.meta.phoneNumber
          }\nPrice: ${response.data.amount} \nTransaction ID: ${
            response.data.id
          } \nDate: ${nigeriaTimeString}`,
        });

        await sendMessage(response.data.meta.senderId, {
          text: 'Thanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. \n\n〜BotSub',
        });

        await sendMessage(response.data.meta.senderId, {
          text:
            '\nTired of making tranfers to different account for every transaction...?' +
            '\nGet a permanet account number and experience faster and safer transactions. \n\nC. Create a virtual account',
        });
      } else if (response.data.meta.platform === 'whatsapp') {
        await sendMessageW(
          response.data.meta.senderId,
          `Transaction Succesful \nProduct: ${product(response)} \nRecipient: ${
            response.data.meta.phoneNumber
          }\nPrice: ${response.data.amount} \nTransaction ID: ${
            response.data.id
          } \nDate: ${nigeriaTimeString}`
        );

        await sendMessageW(
          response.data.meta.senderId,
          'Thanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. \n\n〜BotSub'
        );

        await sendMessageW(
          response.data.meta.senderId,
          '\nTired of making tranfers to different account for every transaction...?' +
            '\nGet a permanet account number and experience faster and safer transactions. \n\nC. Create a virtual account'
        );
      }
    } catch (err) {
      console.error(
        'An error ocured trying to sending succesfll transaction response in helpSuccesfulDelivery',
        err
      );
    }

    // add trnasaction to profit
    await addDataProfit(
      response.data.meta.senderId,
      response.data.id,
      response.data.amount,
      response.data.meta.type,
      'oneTime',
      response.data.meta.networkID,
      response.data.meta.index,
      date
    );

    //await sendTemplates(response.data.meta.senderId, getVirtualAccountTemp);
  }
  //if (parseInt(balance) <= 5000) fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
}; // end of helpSuccesfulDelivery

// helper function  for failed delivery
const helpFailedDelivery = async (response: any, info: string) => {
  await addFailed(response, info);

  if (response.data.meta.bot) {
    const date = new Date(); //new Date(response.data.customer.created_at);
    const nigeriaTimeString = dateFormatter(date);

    console.log('bot feed back');
    if (response.data.meta.platform === 'facebook') {
      await sendMessage(response.data.meta.senderId, {
        text: `Sorry your transaction is pending \nProduct: ${product(response)} \nRecipient: ${
          response.data.meta.phoneNumber
        } \nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`,
      });

      await sendMessage(response.data.meta.senderId, {
        text: `Auto retry has been initiated for your transaction. If value is not delivered after 2 minutes, please kindly report an issue.`,
      });
    } else if (response.data.meta.platform === 'whatsapp') {
      await sendMessageW(
        response.data.meta.senderId,
        `Sorry your transaction is pending \nProduct: ${product(response)} \nRecipient: ${
          response.data.meta.phoneNumber
        } \nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`
      );

      await sendMessageW(
        response.data.meta.senderId,
        `Auto retry has been initiated for your transaction. If value is not delivered after 2 minutes, please kindly report an issue.`
      );
    }
  }
}; // end of failed delivery helper

// function to add transaction to delivered transaction
const addToDelivered = async (response: any, type: 'data' | 'airtime') => {
  const transaction = await Transactions.findOne({ id: response.data.id });
  if (transaction) {
    if (transaction.status === 'delvered') return;
    const response = transaction.updateOne({
      status: 'delivered',
      info: 'value succesfully delivered',
    });
    return response;
  }

  let prod = product(response);

  const newTransaction = new Transactions({
    id: response.data.id,
    email: response.data.customer.email,
    txRef: response.data.tx_ref,
    status: 'delivered',
    date: Date(),
    product: prod,
    senderId: response.data.meta.senderId,
    transactionType: response.data.meta.transactionType,
    accountType: 'oneTime',
    beneficiary: parseInt(response.data.meta.phoneNumber),
    info: 'Value succesfully delvered',
  });

  const response2 = await newTransaction.save();
  console.log('add to delivered response', response2);
  return;
}; // end of addToDelivered

// function to add transaction to failed to deliver
const addFailed = async (response: any, info: string) => {
  try {
    let transaction = await Transactions.findOne({ id: response.data.id });
    if (transaction) {
      await Transactions.updateOne({ id: response.data.id }, { $set: { info: info } });
      return console.log('Refuned transaction succesfully udated info', info);
    }

    let prod = product(response);
    const newTransaction = new Transactions({
      id: response.data.id,
      email: response.data.customer.email,
      txRef: response.data.tx_ref,
      status: 'failed',
      date: Date(),
      product: prod + ' ' + response.data.meta.network,
      amount: response.data.meta.price,
      senderId: response.data.meta.senderId,
      transactionType: response.data.meta.transactionType,
      accountType: 'oneTime',
      beneficiary: parseInt(response.data.meta.phoneNumber),
      info: info || 'Transaction delivery failed.',
    });
    const response2 = await newTransaction.save();
    console.log('add to refunded delivery response', response2);
    return;
  } catch (err) {
    console.error('error occured while adding refunded trnasaction to databasae', err);
  }
}; // end if add to failed to deliver

// helper function to form product
const product = (response: any) => {
  let product = `${response.data.meta.size}  ${response.data.meta.network} data`;

  if (response.data.meta.type === 'airtime') {
    product = `₦${response.data.meta.amount} ${response.data.meta.network} airtime`;
  }
  return product;
}; // end of procuct

// function to send data purchase mail and response
const sendSuccessfulResponse = async (response: any) => {
  try {
    const successfulMailTemplate = await fs.promises.readFile(
      'modules/email-templates/successful-delivery.html',
      'utf8'
    );
    const compiledSuccessfulMailTemplate = Handlebars.compile(successfulMailTemplate);
    let details = formResponse(response);
    // @ts-ignore
    details.product = product(response);
    const mailParams = {
      // @ts-ignores
      product: details.product,
      network: details.network,
      date: details.date,
      id: response.data.id,
      txRef: response.data.tx_ref,
      status: 'Successfull',
      price: response.data.amount,
      recipientNumber: details.number,
      chatBotUrl: process.env.CHATBOT_URL,
      host: process.env.HOST,
    };

    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: response.data.customer.email,
      subject: 'BotSub Receipt',
      html: compiledSuccessfulMailTemplate(mailParams),
    };

    //const resp = await transporter.sendMail(mailOptions);

    //console.log('successful delivery function', resp);
    console.log('in sucess');
    return { message: 'Successful resposne' };
  } catch (err) {
    console.log('send successful vtu response error', err);
    return { error: 'An error occured sending delivered success response' };
  }
}; // end of sendAirtimeResponse function

// function to form response on failed to deliver
const sendFailedToDeliverResponse = async (response: any, res: Response) => {
  try {
    const pendingMailTemplate = await fs.promises.readFile(
      'modules/email-templates/failed-delivery.html',
      'utf8'
    );
    const compiledPendingMailTemplate = Handlebars.compile(pendingMailTemplate);
    let details = formResponse(response);
    // @ts-ignore
    details.product = `${response.data.meta.size} data`;

    if (response.data.meta.type === 'airtime') {
      // @ts-ignore
      details.product = `₦${response.data.meta.amount} airtime`;
    }

    const mailParams = {
      // @ts-ignore
      product: details.product,
      network: details.network,
      date: details.date,
      id: response.data.id,
      txRef: response.data.tx_ref,
      status: 'Pending',
      price: response.data.amount,
      recipientNumber: details.number,
      chatBotUrl: process.env.CHATBOT_URL,
      host: process.env.HOST,
    };
    const mailOptions = {
      from: process.env.ADMIN_MAIL,
      to: response.data.customer.email,
      subject: 'BotSub Pending Transaction',
      html: compiledPendingMailTemplate(mailParams),
    };

    //const resp = await transporter.sendMail(mailOptions);

    //sconsole.log('in failed to deliver function', resp);
    // @ts-expect-error eror
    return res.json({ status: 'pending', data: details });
  } catch (err) {
    console.error('send successful vtu response error', err);
    // @ts-expect-error error
    return res.json({ status: 'error', message: 'send failed response error air', data: err });
    //return res.json({ status: 'failedDelivery', message: 'failed to deliver purchased product' });
  }
}; // end of sendFailedToDeliverResponse

//function to form response for request
const formResponse = (response: any) => {
  const meta = response.data.meta;
  // create a Date object with the UTC time
  const date = new Date(response.data.customer.created_at);
  const nigeriaTimeString = dateFormatter(date);

  const details = {
    network: meta.network,
    number: meta.number,
    email: response.data.customer.email,
    date: nigeriaTimeString,
  };
  return details;
}; // end of formResponse

export { helpSuccesfulDelivery, helpFailedDelivery };
