// file to initiate make purhase
const transactions = require('../models/transactions');
const { confirmDataPurchaseResponse } = require('./../bot_modules/helper_functions.js');
const sendMessage = require('./../bot_modules/send_message.js');
const randomstring = require('randomstring');
const { dateFormatter } = require('./helper_functions.js');
const Transactions = require('./../models/transactions.js');
const PaymentAccounts = require('./../models/payment-accounts.js');
const { creditReferrer } = require('./credit_referrer.js');
const handleFirstMonthBonus = require('./monthly_bonuses.js');


// function to carryout purchase
async function makePurchase(purchasePayload, bot, senderId) {
    console.log('in make purchase')
    if (purchasePayload.transactionType === 'data') return deliverData(purchasePayload, bot, senderId);
    if (purchasePayload.transactionType === 'airtime') return deliverAirtime(purchasePayload, bot, senderId);
    console.log('no matched transaction type::::::::::::::::::::::::   ');
}; // end of function to make purchase



// function to make data purchase request
async function deliverData(purchasePayload, bot, senderId) {
    let options = {
        url: 'https://opendatasub.com/api/data/',
        headers: {
            Authorization: 'Token ' + process.env.OPENSUB_KEY,
            'Content-Type': 'application/json',
        },
        payload: {
            network: Number(purchasePayload.networkID),
            mobile_number: purchasePayload.number,
            plan: Number(purchasePayload.planID),
            Ported_number: true,
        }
    };

    if (process.env.NODE_ENV === 'production') {
        makePurchaseRequest(purchasePayload, options, bot, 'data', senderId);
    } else {
        simulateMakePurchaseRequest(purchasePayload, true, bot, 'data', senderId);
    };
}; // end of deliver value function



// function to make airtime purchase request
function deliverAirtime(purchasePayload, bot, senderId) {
    let options = {
        url: 'https://opendatasub.com/api/topup/',
        headers: {
            Authorization: 'Token ' + process.env.OPENSUB_KEY,
            'Content-Type': 'application/json',
        },
        payload: {
            network: Number(purchasePayload.networkID),
            amount: Number(purchasePayload.amount),
            mobile_number: purchasePayload.number,
            Ported_number: true,
            airtime_type: 'VTU',
        }
    };

    if (process.env.NODE_ENV === 'production') {
        makePurchaseRequest(purchasePayload, options, bot, 'data', senderId);
    } else {
        simulateMakePurchaseRequest(purchasePayload, true, bot, 'data', senderId);
    };
}; // end of deliverAirtime



// function to make product purchase request
async function makePurchaseRequest(purchasePayload, options, bot, transactionType, senderId) {
    console.log('in make purchase request');
    try {
        const resp = await axios.post(options.url, options.payload, { headers: options.headers });
        console.log('response: ', resp.data);

        if (resp.data.Status === 'successful') {
            console.log('in succesfull make purchase request');
            helpSuccesfulDelivery(purchasePayload, resp.data.balance_after, senderId, bot);
        } else {
            console.log('response value::::::::::::::: ', resp.data.Status);
            throw 'could not deliver data'
        };
    } catch (error) {
        console.log('in make purchase request failed in cacth error block: ', error);
        if (bot === 'facebook') {
            await sendMessage(senderId, { text: 'Transaction failed please try again.' });
            return confirmDataPurchaseResponse(senderId);
        };
    };
}; // end of actualBuyData


// function to make product purchase request simulation
async function simulateMakePurchaseRequest(purchasePayload, options, bot, data, senderId) {
    try {
        if (options) return helpSuccesfulDelivery(purchasePayload, 6000, senderId, bot);
        throw 'product purchas request not successful';
    } catch (error) {
        console.log('make purchase request simulation failed in cacth error block:', error);
        if (bot === 'facebook') {
            await sendMessage(senderId, { text: 'Transaction failed please try again' });
            return confirmDataPurchaseResponse(senderId);
        };
    };
}; // end of makePurchaserequest simulaing


// helper function for succesfull response
async function helpSuccesfulDelivery(purchasePayload, balance, senderId, bot) {
    let id;
    const date = new Date() //new Date(response.data.customer.created_at);
    const nigeriaTimeString = dateFormatter(date);
    const product = formProduct(purchasePayload);

    // first run while loop to generate a random id
    while (true) {
        id = randomstring.generate({
            length: 8,
            charset: 'alphanumeric'
        });
        let existing = await transactions.findOne({ id: id });
        if (existing) {
            console.log('id existing')
        } else {
            break;
        };
    };

    // updating user deducting user balance
    const accBalance = await PaymentAccounts.findOneAndUpdate(
        { refrence: senderId },
        { $inc: { balance: -Number(purchasePayload.price) } },
        { new: true }
    );
    console.log('account balance::::::::::', accBalance);

    addToDelivered(id, purchasePayload, senderId); // fuction to add trnasction to sucesful purchase
    //sendSuccessfulResponse(purchasePayload); // functio to send succsful delivery response

    if (bot === 'facebook') {
        //await sendMessage(senderId, { text: `Transaction Succesful \nProduct: ${product}\nTransaction ID: ${id} \nDate: ${nigeriaTimeString}` });
        await sendMessage(senderId, { 
            text: `Your current account balance is:   ₦${accBalance.balance}` 
        });
        await sendMessage(senderId, {
            text: `Transaction Succesful \nProduct: ${product} \nRecipient: ${purchasePayload.phoneNumber} \nTransaction ID: ${id} \nDate: ${nigeriaTimeString}`,
        
        });
          await sendMessage(senderId, { text: 'Thanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. \n-BotSub'})
         
    };

    if (parseInt(balance) <= 5000) fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
}; // end of helpSuccesfulDelivery


// function to add transaction to delivered transaction
async function addToDelivered(id, purchasePayload, senderId) {
    const cancelTransaction = require('./../bot_modules/postback_responses.js').cancelTransaction;
    let product, newTransaction, response2;

    product = formProduct(purchasePayload);

    newTransaction = new Transactions({
        id: id,
        email: purchasePayload.email,
        status: true,
        date: Date(),
        product: product,
        beneficiary: parseInt(purchasePayload.phoneNumber)
    });
    response2 = await newTransaction.save();
    console.log('add to delivered response', response2);
    cancelTransaction(senderId, true);
    if (Number(purchasePayload.firstPurchase) === 1 && purchasePayload.transactionType === 'data') await creditReferrer(senderId);
    if (purchasePayload.transactionType === 'data') await handleFirstMonthBonus(purchasePayload.email, purchasePayload.phoneNumber, purchasePayload.networkID, senderId);
    return;
}; // end of addToDelivered



// helper function to form product
function formProduct(payload) {
    let product = `${payload.size}  ${payload.network} data`;

    if (payload.transactionType === 'airtime') {
        product = `₦${payload.price} ${payload.network} airtime`;
    };
    return product
}; // end of procuct


// function to send data purchase mail and response
async function sendSuccessfulResponse(response, res) {
    try {
        const successfulMailTemplate = await fsP.readFile(
            'modules/email-templates/successful-delivery.html',
            'utf8'
        );
        const compiledSuccessfulMailTemplate = handlebars.compile(successfulMailTemplate);
        let details = formResponse(response);
        details.product = product(response);
        const mailParams = {
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
        return res.json({ status: 'successful', data: details });
    } catch (err) {
        console.log('send successful vtu response error', err);
        return res.json({ status: 'error', message: 'error sending succesfull response', data: err });
    };
}; // end of sendAirtimeResponse function



//function to form response for request
function formResponse(response) {
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

module.exports = makePurchase;