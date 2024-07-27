import { Response } from "express";

// file to initiate make purhase
const handlebars = require('handlebars');

import Transactions from "../models/transactions";
import PaymentAccounts from "../models/payment-accounts";
import creditReferrer from "./credit_referrer";
import handleFirstMonthBonus from "./monthly_bonuses";
import { addDataProfit } from "./save-profit";
import { sendMessage } from "../bot/modules/send_message";
import { confirmDataPurchaseResponse, dateFormatter } from "../bot/modules/helper_functions";
import { generateRandomString } from "./helper_functions";
import * as fs from 'fs';
const axios = require('axios');


// function to carryout purchase
async function makePurchase(purchasePayload: any, bot: string, senderId: string) {
    console.log('in make purchase')
    if (purchasePayload.transactionType === 'data') return deliverData(purchasePayload, bot, senderId);
    if (purchasePayload.transactionType === 'airtime') return deliverAirtime(purchasePayload, bot, senderId);
    console.log('no matched transaction type::::::::::::::::::::::::   ');
}; // end of function to make purchase



// function to make data purchase request
async function deliverData(purchasePayload: any, bot: string, senderId: string) {
    let options = {
        url: 'https://opendatasub.com/api/data/',
        headers: {
            Authorization: 'Token ' + process.env.OPENSUB_KEY,
            'Content-Type': 'application/json',
        },
        payload: {
            network: Number(purchasePayload.networkID),
            mobile_number: purchasePayload.phoneNumber,
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
function deliverAirtime(purchasePayload: any, bot: string, senderId: string) {
    let options = {
        url: 'https://opendatasub.com/api/topup/',
        headers: {
            Authorization: 'Token ' + process.env.OPENSUB_KEY,
            'Content-Type': 'application/json',
        },
        payload: {
            network: Number(purchasePayload.networkID),
            amount: Number(purchasePayload.price),
            mobile_number: purchasePayload.phoneNumber,
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
async function makePurchaseRequest(purchasePayload: any, options: any, bot: string, transactionType: 'airtime' | 'data', senderId: string) {
    console.log('in make purchase request');
    try {
        const resp = await axios.post(options.url, options.payload, { headers: options.headers });
        console.log('response: ', resp.data);

        if (resp.data.Status === 'successful') {
            helpSuccesfulDelivery(purchasePayload, resp.data.balance_after, senderId, bot);
        } else {
            throw 'could not deliver data'
        };
    } catch (error: any) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log('errror while makig purchase request in v-acounnt::: Server responded with status:', error.response.status);
            console.log('Response data:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.log('No response received. Request:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error:', error.message);
        };

        if (bot === 'facebook') {
            await sendMessage(senderId, { text: 'Transaction failed please try again.' });
            return confirmDataPurchaseResponse(senderId);
        };
    };
}; // end of actualBuyData


// function to make product purchase request simulation
async function simulateMakePurchaseRequest(purchasePayload: any, options: any, bot: string, data: any, senderId: string) {
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
async function helpSuccesfulDelivery(purchasePayload: any, balance: number, senderId: string, bot: string) {
    let id;
    const date = new Date() //new Date(response.data.customer.created_at);
    const nigeriaTimeString = dateFormatter(date);
    const product = formProduct(purchasePayload);

    // first run while loop to generate a random id
    while (true) {
        id = generateRandomString(15);
        let existing = await Transactions.findOne({ id: id });
        if (existing) {
            console.log('id exists')
        } else {
            break;
        };
    };

    // add profit 
    if (purchasePayload.transactionType === 'data') await addDataProfit(purchasePayload.networkID, purchasePayload.index, date, id);

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
        await sendMessage(senderId, { text: 'Thanks for your patronage. \nEagerly awaiting the opportunity to serve you once more. \n\n〜BotSub' })

    };

    //if (parseInt(balance) <= 5000) fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
}; // end of helpSuccesfulDelivery


// function to add transaction to delivered transaction
async function addToDelivered(id: string, purchasePayload: any, senderId: string) {
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
    if (purchasePayload.transactionType === 'data') await handleFirstMonthBonus(purchasePayload.email, purchasePayload.phoneNumber, purchasePayload.networkID, senderId, false);
    return;
}; // end of addToDelivered



// helper function to form product
function formProduct(payload: any) {
    let product = `${payload.size}  ${payload.network} data`;

    if (payload.transactionType === 'airtime') {
        product = `₦${payload.price} ${payload.network} airtime`;
    };
    return product
}; // end of procuct


// function to send data purchase mail and response
async function sendSuccessfulResponse(response: any, res: Response) {
    try {
        const successfulMailTemplate = await fs.promises.readFile(
            'modules/email-templates/successful-delivery.html',
            'utf8'
        );
        const compiledSuccessfulMailTemplate = handlebars.compile(successfulMailTemplate);
        let details = formResponse(response);
        // @ts-ignore
        details.product = product(response);
        const mailParams = {
            // @ts-ignore
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
function formResponse(response: any) {
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

export { makePurchase };