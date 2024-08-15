import BotUsers from "../../models/fb_bot_users";
import { networkDetailsType } from "../../types/bot/module-buy-data-types";
import { confirmDataPurchaseResponse, formDataOffers } from "../modules/buy-data";
import { validateNumber } from "../modules/helper_functions";
import { sendMessage } from "../modules/send_message";
import { cancelTransaction } from "./generic";
import fs from 'fs';

const text = `Select network for data Purchase \n\n 1. MTN \n 2. Glo \n 3. 9mobile \n 4. Airtel \n\n 0. cancel`;
const confirmPurchaseText = ``;

// function to handle buy data selected
async function handleBuyData(event: any) {
    const senderId = event.sender.id;

    sendMessage(senderId, { text: text });
    await BotUsers.updateOne({ id: senderId }, {
        $set: { nextAction: 'selectDataNetwork' }
    });
}; // end of sendEmailEnteredResponse


// functiion to data network selected
const handleDataNetWorkSelected = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    try {
        if (message === '0') return cancelTransaction(senderId, true);

        // Read data-details.json file
        let dataDetails: any = await fs.promises.readFile('files/data-details.json', 'utf-8');
        dataDetails = JSON.parse(dataDetails);

        // Get details of user selected network
        const networkDetails: networkDetailsType = dataDetails[message];

        if (!networkDetails) {
            await sendMessage(senderId, { text: 'Invalid response received.' });
            return handleBuyData(event); // Ensure handleBuyData is an asynchronous function if needed
        };

        //console.log('network details', networkDetails, networkDetails['1']);
        const { network, networkID } = networkDetails['1'];
        const response = await formDataOffers(networkDetails);

        await sendMessage(senderId, { text: response });

        // Update bot user info
        await BotUsers.updateOne(
            { id: senderId },
            {
                $set: {
                    nextAction: 'selectDataOffer',
                    'purchasePayload.network': network,
                    'purchasePayload.networkID': networkID,
                    'purchasePayload.transactionType': 'data'
                }
            }
        );
    } catch (err) {
        console.error('An error occurred in handleDataNetWorkSelected', err);
        await sendMessage(senderId, { text: 'An error occurred, please try again. \n\nOr enter 0 to cancel' });
    }
};


// funciton to handle network data offer selected
const handleOfferSelected = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    try {
        if (message.toLocaleLowerCase() === '0') return cancelTransaction(senderId, true);
        const user = await BotUsers.findOne({ id: senderId }).select('purchasePayload');
        // @ts-expect-error
        const network: number = user?.purchasePayload?.network;
        // @ts-expect-error
        const networkID: number = user?.purchasePayload?.networkID;

        let dataDetails: any = await fs.promises.readFile('files/data-details.json'); // get data details
        dataDetails = JSON.parse(dataDetails);
        const networkDetails: networkDetailsType = dataDetails[networkID];         // details of user selected network
        const dataOffer = networkDetails[message];                  // the offer user selected

        if (!dataOffer) {
            await sendMessage(senderId, { text: 'Invalid response entred.' });
            return handleDataNetWorkSelected(event);
        };

        sendMessage(senderId, { text: `Enter phone number for ${network} data purchase` });

        // update user document
        await BotUsers.updateOne(
            { id: senderId },
            {
                $set: {
                    nextAction: 'enterPhoneNumber',
                    'purchasePayload.price': dataOffer.price,
                    'purchasePayload.size': dataOffer.size,
                    'purchasePayload.index': dataOffer.index,
                    'purchasePayload.planID': dataOffer.planID,
                    'purchasePayload.product': `${dataOffer.size} ${dataOffer.network} data`,
                    'purchasePayload.transactionType': 'data',
                }
            }
        );
    } catch (err) {
        console.error('An error occured in handleOfferSelected', err);
        sendMessage(senderId, { text: 'An error occured plase enter resposne again.  \n Or enter 0 to cancel' });
    };
};




// functiion to respond to phone number entred
const handlePhoneNumberEntred = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    try {
        if (message.toLowerCase() === '0') return cancelTransaction(senderId, true);

        const validatedNum = validateNumber(message);
        const user = await BotUsers.findOne({ id: senderId });

        // to run if number valid and user has provided email
        if (validatedNum && user?.email) {
            await BotUsers.updateOne({ id: senderId }, {
                $set: {
                    nextAction: 'confirmProductPurchase',
                    'purchasePayload.phoneNumber': validatedNum,
                }
            });
            await sendMessage(senderId, { text: 'phone  number recieved.' });
            await confirmDataPurchaseResponse(senderId, user, validatedNum)
            return;
        };

        // to run if number is valid but user has never provided email
        if (validatedNum && !user?.email) {
            sendMessage(senderId, { text: 'Please enter your email. \nReciept would be sent to the provided email' });

            await BotUsers.updateOne({ id: senderId }, {
                $set: {
                    nextAction: 'enterEmailToProceedWithPurchase',
                    'purchasePayload.phoneNumber': validatedNum
                }
            });
            return;
        };

        sendMessage(senderId, { text: 'Phone number not valid. \nPlease enter a valid phone number. \nEnter 0 to cancel.' });
    } catch (err) {
        console.error('An error occured in phoneNumberEntred', err);
        sendMessage(senderId, { text: 'An error occured plase enter resposne again.  \n Or enter 0 to cancel' })
    };
};



export {
    text,
    confirmPurchaseText,
    handleBuyData,
    handleDataNetWorkSelected,
    handleOfferSelected,
    handlePhoneNumberEntred,
};