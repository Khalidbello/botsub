// module to  hold all payment related functions relating to users with virtual account

const axios = require('axios');
const Flutterwave = require('flutterwave-node-v3');
const sendMessage = require('./../bot_modules/send_message.js');
const PaymentAccounts = require("./../models/payment-accounts.js");
const FBotUsers = require("./../models/fb_bot_users.js");
const sendTemplate = require('../bot_modules/send_templates.js');
const { responseServices3 } = require('../bot_modules/templates.js');
const { initMakePurchase } = require('./../bot_modules/postback_responses.js');



// function to create a virtual account
async function createVAccount(email, reference, bvn, botType, currentCount = 0) {
    console.log('viertual account current count is: ', currentCount);

    if (currentCount > 5) {
        await sendMessage(reference, { text: 'Creation of dedicated virtual account failed.' });
        await sendMessage(senderId, { text: 'Please kindly click my account to restart process and ensure all provided infrmations are accurate ' });
        sendTemplate(reference, responseServices3);
        return;
    };

    // first check to confirm no account with specific referance occurs
    const existing = await PaymentAccounts.findOne({ refrence: reference });

    if (existing) return console.log('virtual account already exist for user');

    const num = await PaymentAccounts.countDocuments({});
    const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    const details = {
        email: email,
        tx_ref: reference,
        is_permanent: true,
        bvn: bvn,
        firstname: "Botsub",
        lastname: 'FLW00' + `${num + 1}`
    };

    try {
        const accountDetails = await flw.VirtualAcct.create(details);
        console.log("create virtual account deatails::::::::: ", accountDetails);
        if (accountDetails.status !== "success") return createVAccount(email, reference, bvn, botType, currentCount + 1);

        // save user account in vrtual accounts db
        let account = {
            refrence: reference,
            balance: 0,
            accountName: "Botsub " + 'FLW00' + `${num + 1}`,
            accountNumber: accountDetails.data.account_number,
            botType: botType,
            bankName: accountDetails.data.bank_name,
            bvn: bvn
        };
        const vAccount = new PaymentAccounts(account);

        await vAccount.save();
        await sendMessage(reference, { text: 'Creation of dedicated virtual account succesful.' });
        await sendMessage(reference, { text: 'Your dedicated virtual account details: ' });
        await sendMessage(reference, { text: `Bank Name: ${account.bankName}` });
        await sendMessage(reference, { text: `Account Name: ${account.accountName}` });
        await sendMessage(reference, { text: 'Acccount Number: ' });
        await sendMessage(reference, { text: account.accountNumber });
        await sendMessage(reference, { text: `Account Balance: ₦${account.balance}` });
        sendMessage(reference, { text: 'Fund your dedicated virtual account once andd make mutltiple purchases seamlessly' });
    } catch (error) {
        console.log('in virtual account catch error:::', currentCount, error);
        return createVAccount(email, reference, bvn, botType, currentCount + 1);
    };
}; // end of create virtual account



// webhook handler function to handle updating user balance
async function respondToWebhook(webhookPayload, res, host) {
    const data = webhookPayload.data || webhookPayload;
    if (data.status.toLowerCase() !== "successful") {
        console.error('transaction not succesful::::::::::::: account funding not sucesfully carried out'); // check if transaction was succesful 
        return;
    };

    const id = data.id;
    const reference = Number(data.txRef) || Number(data.tx_ref); // this vlaue is same as that of bot user sender id
    const amount = Number(data.amount);
    try {
        res.status(200).send(); // return ok response to webhook
        // verify if payment was made
        const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

        const response = await flw.Transaction.verify({ id: id }); // check again if transaction is succesful
        console.log('transaction details', response);

        if (response.status === 'error') {
            console.log('error occured while confirming tansacion');
            return;
        };

        if (response.data.status.toLowerCase() !== "successful") {
            console.log("transaction not successfully carried out: in wallet top up");
            return;
        };

        console.log('reference in wallet topup: ', reference, data);

        // check if transaction was made by user with no virtual account
        if (response.data.meta && response.data.meta.type) {
            await carryOutNonVAccount(data, host);
            return;
        };


        // fetch user account and update user balance
        const account = await PaymentAccounts.findOneAndUpdate(
            { refrence: reference },
            { $inc: { balance: amount } },
            { new: true }
        );

        console.log('account in wallet topup', account);
        if (account.botType === "facebook") {
            // send botuser a notification to
            await sendMessage(reference, { text: 'Your account account topup was successful.' });
            await sendMessage(reference, { text: `Your new account balance is: ${account.balance}` });

            // check if user has an outsanding transaction and automatic initiate if any
            const response = await FBotUsers.findOne({ id: reference }).select("purchasePayload");
            const purchasePayload = response.purchasePayload;

            if (purchasePayload.outStanding) initMakePurchase(reference);
        };
    } catch (error) {
        console.error('an error ocured wallet topping up:::::::::::::::::         ', error);
    };
}; // end of respondToWebhook



// helper function to carry out non-v-account purchase request
async function carryOutNonVAccount(data, host) {
    console.log('carrying out no v account purchase request:::::::::::      ::::::::::');
    try {
        await axios.get(
            `https://${host}/gateway/confirm?transaction_id=${data.id}&tx_ref=${data.tx_ref || data.txRef}&webhook=webhooyouu`
        );
    } catch (error) {
        // Handle errors
        if (error.response) {
            console.error('Server responded with an error status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            console.error('No response received from the server:', error.request);
        } else {
            console.error('Error occurred while setting up the request:', error.message);
        };
        console.error('Error config:', error.config);
    };
}; // end of carryOutVAccount

export {
    respondToWebhook,
    createVAccount,
};