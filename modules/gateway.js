// module to  hold all payment related functions relating to users with virtual account

const Flutterwave = require('flutterwave-node-v3');
const sendMessage = require('./../bot_modules/send_message.js');
const PaymentAccounts = require("./../models/payment_accounts.js");
const FBotUsers = require("./../models/fb_bot_users.js");
const { initMakePurchase } = require('./../bot_modules/postback_responses.js');



// function to create a virtual account
async function createVAccount(email, reference, bvn, botType, currentCount = 0) {
    console.log('viertual account current count is: ', currentCount);

    if (currentCount > 5) return console.log("thrshold reached creation of virtual account failed::");

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
        if (accountDetails.status !== "success") return createVAccount(email, reference, botType, currentCount + 1);

        // save user account in vrtual accounts db
        let account = {
            refrence: reference,
            balance: 0,
            accountName: "Botsub " +'FLW00' + `${num + 1}`,
            accountNumber: accountDetails.data.account_number,
            botType: botType,
            bankName: accountDetails.data.bank_name,
            bvn: bvn
        };
        const vAccount = new PaymentAccounts(account);
        await vAccount.save();
        return account;
    } catch (error) {
        console.log('in virtual account catch error:::', currentCount, error);
        return createVAccount(email, reference, botType, currentCount + 1);
    };
}; // end of create virtual account



// webhook handler function to handle updating user balance
async function respondToWebhook(webhookPayload, res) {
    console.log('webhook virtual account purchase payload:::::::;;;;', webhookPayload);
    const data = webhookPayload.data || webhookPayload;
    if (data.status !== "successful") return fconsole.log('transaction nit succesful::::::::::::: account funding not sucesfully carried out'); // check if transaction was succesful 
    const id = data.id;
    const reference = Number(data.txRef) || Number(data.tx_ref); // this vlaue is same as that of bot user sender id
    const amount = Number(data.amount);
    try {
        // verify if payment was made
        const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

        const response = await flw.Transaction.verify({ id: id }); // check again if transaction is succesful
        console.log('transaction details', response);

        if (response.status === 'error') return res.json({ status: 'error', message: 'error fetching transaction' });


        console.log('reference in wallet topup: ', reference, data);
        // fetch user account and update user balance
        const account = await PaymentAccounts.findOneAndUpdate(
            { refrence: reference },
            { $inc: { balance: amount } },
            { new: true }
        );
        res.status(200).send('ok');

        console.log('account in wallet topup', account);
        if (account.botType === "facebook") {
            // send botuser a notification to
            await sendMessage(reference, { text: `Your new account balance is: ${account.balance}` });

            // check if user has an outsanding transaction and automatic initiate if any
            const response = await FBotUsers.findOne({ id: reference }).select("purchasePayload");
            const purchasePayload = response.purchasePayload;

            if (purchasePayload.outStanding) initMakePurchase(reference);
        };
    } catch (error) {
        console.log('an error ocured wallet topping up:::::::::::::::::         ', error);
    };
}; // end of respondToWebhook


module.exports = {
    respondToWebhook,
    createVAccount,
};