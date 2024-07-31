// message responses
import emailValidator from 'email-validator';
import { getUserName } from '../modules/get_user_info';
import { cancelTransaction } from '../post-back-responses/postback_responses';
import { handleBuyData } from './data';
import { sendMessage } from '../modules/send_message';
import BotUsers from '../../models/fb_bot_users';
import {
    confirmDataPurchaseResponse,
    helperConfirmPurchase,
    validateAmount,
    validateNumber
} from '../modules/helper_functions';
import sendTemplates from '../modules/send_templates';
import { responseServices, responseServices2, responseServices3 } from '../templates/templates';
import { createVAccount } from '../../modules/gateway';
import { generateRandomString } from '../../modules/helper_functions';
import ReportedIssues from '../../models/reported-issues';

// function to respond to unexpected message
async function defaultMessageHandler(event: any, message: any) {
    try {
        //writeMessageToJson('in default message handler')
        const senderId = event.sender.id;
        let text;
        const userName = await getUserName(senderId);

        if (message) {
            text = event.message.text.trim();
            if (text.toLowerCase() === 'q') {
                await cancelTransaction(senderId, false);
                return;
            };

            if (text.toLowerCase() === '1') return handleBuyData(event);
        };

        // await sendMessage(senderId, { text: `Hy ${userName || ''} what can i do for you` });
        // await sendTemplate(senderId, responseServices);
        // await sendTemplate(senderId, responseServices2);
        // sendTemplate(senderId, responseServices3);
        //writeMessageToJson('end of default message handler');
    } catch (err) {
        console.error('error in default error ', err);
    };
}; // end of defaultMessenger


// function to handle first email
async function sendEmailEnteredResponse(event: any) {
    const senderId = event.sender.id;
    const email = event.message.text.trim();

    if (email.toLowerCase() === 'q') return (event);
    if (emailValidator.validate(email)) {
        await sendMessage(senderId, { text: 'email saved \nYou can change email when ever you want' });
        const saveEmail = await BotUsers.updateOne({ id: senderId },
            {
                $set: {
                    email: email,
                    nextAction: null
                }
            },
            { upsert: true }
        );
        console.log('in save enail', saveEmail);
        await confirmDataPurchaseResponse(senderId);
    } else {
        const response = {
            text: 'the email format you entered is invalid \nPlease enter a valid email.',
        };
        await sendMessage(senderId, response);
    };
}; // end of sendEmailEnteredResponse


// function to respod to emal entred, this function also calls create virtual acount function
async function enteredEmailForAccount(event: any) {
    const senderId = event.sender.id;
    const email = event.message.text.trim();

    if (email.toLowerCase() === 'q') {
        await sendMessage(senderId, { text: 'Creatioin of dedicatd virtiual account cancled.' });
        await sendMessage(senderId, { text: 'what do you want to do next.' });
        await sendTemplates(senderId, responseServices);
        await sendTemplates(senderId, responseServices2);
        await sendTemplates(senderId, responseServices3);

        // updaet user colletion
        await BotUsers.updateOne(
            { id: senderId },
            { $set: { nextAction: null } }
        );

        return;
    };

    if (emailValidator.validate(email.toLowerCase())) {
        const saveEmail = await BotUsers.updateOne({ id: senderId },
            {
                $set: {
                    email: email,
                    nextAction: 'enterBvn'
                }
            },
            { upsert: true }
        );

        await sendMessage(senderId, { text: 'please enter your BVN.' });
        return sendMessage(senderId, { text: 'In accordeance with CBN regulations, your BVN is required to create a virtual account. \nEnter Q to  cancel' });
    } else {
        sendMessage(senderId, { text: "The email you entred is invalid. \nPlease enter a valid email for the creation of dedicated virtual account. \n\nEner Q to cancel" });
    };
}; // end of sendEmailEntere



// funtion to handle bvn entred
async function bvnEntred(event: any) {
    const senderId = event.sender.id;
    let bvn = event.message.text.trim();
    let parsedBvn;

    if (bvn.toLowerCase() === 'q') {
        await sendMessage(senderId, { text: 'Creatioin of dedicated virtiual account cancled.' });
        await sendMessage(senderId, { text: 'what do you want to do next.' });
        // await sendTemplate(senderId, responseServices);
        // await sendTemplate(senderId, responseServices2);
        // await sendTemplate(senderId, responseServices3);

        // updaet user colletion
        await BotUsers.updateOne(
            { id: senderId },
            { $set: { nextAction: null } }
        );
        return;
    };

    parsedBvn = parseInt(bvn);
    bvn = parsedBvn.toString();

    // Check if the parsed number is an integer and has exactly 11 digits
    if (!isNaN(parsedBvn) && Number.isInteger(parsedBvn) && bvn.length === 11) {
        const user = await BotUsers.findOne({ id: senderId }).select('email');
        // @ts-expect-error
        createVAccount(user?.email, senderId, bvn, 'facebook', 0);

        // upate user database
        await BotUsers.updateOne(
            { id: senderId },
            { $set: { nextAction: null } }
        );
    } else {
        await sendMessage(senderId, { text: 'The BVN  you entred is invalid. \n\nPlease enter a valid BVN. \n\nEnter Q to cancle.' })
    };
}; // end of bvnEntred



//==================================================
// airtime purchase response function

// function to handle airtime amount entred
async function sendAirtimeAmountReceived(event: any) {
    const senderId = event.sender.id;
    const amount = event.message.text.trim();
    const userData = await BotUsers.findOne({ id: senderId }).select('purchasePayload');

    if (amount.toLowerCase() === 'q') return cancelTransaction(senderId, true);
    if (await validateAmount(amount)) {
        await sendMessage(senderId, { text: 'Amount recieved' });
        await sendMessage(senderId, {
            // @ts-expect-error
            text: ` Enter ${userData?.purchasePayload.network} phone number for airtime purchase. \nEnter Q to cancel`,
        });

        await BotUsers.updateOne({ id: senderId }, {
            $set: {
                nextAction: 'phoneNumber',
                'purchasePayload.price': parseInt(amount),
                'purchasePayload.product': `₦${amount} Airtime`,
                'purchasePayload.transactionType': 'airtime',
            }
        });
        return null;
    };
    await sendMessage(senderId, {
        text: 'Invalid amount entered \nPlease enter a valid amount. \nEnter Q to cancel',
    });
}; // end of sendAirtimeAmountReceived


// function to handle phone number entred
async function sendPhoneNumberEnteredResponses(event: any) {
    const senderId = event.sender.id;
    const phoneNumber = event.message.text.trim();
    const validatedNum = validateNumber(phoneNumber);
    let user;

    if (phoneNumber.toLowerCase() === 'q') return cancelTransaction(senderId, true);
    if (validatedNum) {
        await sendMessage(senderId, { text: 'phone  number recieved' });
        user = await BotUsers.findOne({ id: senderId });
        if (user?.email) {
            await BotUsers.updateOne({ id: senderId }, {
                $set: {
                    nextAction: null,
                    'purchasePayload.phoneNumber': validatedNum,
                }
            });
            await confirmDataPurchaseResponse(senderId);
            return;
        };

        await sendMessage(senderId, {
            text: 'Please enter your email. \nReciept would be sent to the provided email',
        });

        await BotUsers.updateOne({ id: senderId }, {
            $set: {
                nextAction: 'enterEmailFirst',
                'purchasePayload.phoneNumber': phoneNumber,
            }
        });
        return;
    };
    await sendMessage(senderId, {
        text: 'Phone number not valid. \nPlease enter a valid phone number. \nEnter Q to cancel.',
    });
}; // end of sendPhoneNumberEnteredResponses


// function to handle change of email before transaction
async function newEmailBeforeTransactResponse(event: any, transactionType: 'data' | 'airtime') {
    const senderId = event.sender.id;
    const email = event.message.text.trim();

    try {
        if (email.toLowerCase() === '0') {
            await sendMessage(senderId, { text: 'Change email cancled' });
            return await helperConfirmPurchase(transactionType, senderId);
        };

        if (emailValidator.validate(email)) {
            await BotUsers.updateOne({ id: senderId }, {
                $set: {
                    nextAction: 'confirmProductPurchase',
                    email: email,
                }
            });
            await sendMessage(senderId, { text: 'Email changed successfully.' });
            return helperConfirmPurchase(transactionType, senderId);
        } else {
            const response = { text: 'the email format you entered is invalid. \nPlease enter a valid email. \n\nEnter 0 to cancel.' };
            await sendMessage(senderId, response);
        };
    } catch (err) {
        console.error('Error occured in newEmailBeforeTransactResponse', err);
        sendMessage(senderId, { text: 'An error occured plase enter resposne again.  \n Or enter 0 to cancel' });
    };
}; // end of newEmailBeforeTransactResponse




// function to handle change of phoneNumber
async function newPhoneNumberBeforeTransactResponse(event: any, transactionType: 'data' | 'airtime') {
    const senderId = event.sender.id;
    const phoneNumber = event.message.text.trim();
    const validatedNum = validateNumber(phoneNumber);

    if (phoneNumber.toLowerCase() === 'q') {
        await sendMessage(senderId, { 'text': 'Change phone number cancled' });
        return await helperConfirmPurchase(transactionType, senderId);
    };

    if (validatedNum) {
        await BotUsers.updateOne({ id: senderId }, {
            $set: {
                nextAction: null,
                'purchasePayload.phoneNumber': validatedNum,
            }
        });
        await sendMessage(senderId, { text: 'Phone number changed successfully' });
        console.log('transactionType', transactionType);
        helperConfirmPurchase(transactionType, senderId);
    } else {
        const response = {
            text: 'The phone number you entered is invalid. \nPlease enter a valid phone number. \nEnter Q to cancel.',
        };
        await sendMessage(senderId, response);
    };
}; // end of newPhoneNumberBeforeTransactResponse


// function to handle issue reporting
async function reportIssue(event: any) {
    const senderId = event.sender.id;
    const message = event.message.text.trim();
    const date = new Date();
    const id = generateRandomString(10);

    if (!message) {
        await sendMessage(senderId, {
            text: 'Sorry issue report can not be empty.'
        });
        return;
    };

    const issue = new ReportedIssues({
        id,
        description: message,
        date,
        reporterId: senderId,
        platformType: 'facebook',
        status: true,
    });

    await issue.save()
        .then(async (data: any) => {
            sendMessage(senderId, {
                text: 'Your issue have beign directed to BotSub support team. \nSorry for any inconveniences caused.',
            });

            await BotUsers.updateOne({ id: senderId }, {
                $set: {
                    nextAction: null,
                }
            });
        })
        .catch((err: Error) => {
            console.error('error occured in report issue fucntion', err);
            sendMessage(senderId, {
                text: 'Sorry somrthing went wrong. \nPlease enter issue again',
            });
        });
};  // end of report issue function


export {
    defaultMessageHandler,
    sendEmailEnteredResponse,
    sendAirtimeAmountReceived,
    sendPhoneNumberEnteredResponses,
    newEmailBeforeTransactResponse,
    newPhoneNumberBeforeTransactResponse,
    enteredEmailForAccount,
    bvnEntred,
    reportIssue,
};