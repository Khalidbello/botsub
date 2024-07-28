import BotUsers from "../../models/fb_bot_users";
import { networkDetailsType } from "../../types/bot/module-buy-data-types";
import { formDataOffers } from "../modules/buy-data";
import { confirmDataPurchaseResponse, validateNumber } from "../modules/helper_functions";
import { sendMessage } from "../modules/send_message";
import { cancelTransaction } from "../post-back-responses/postback_responses";
import fs from 'fs';


// function to handle buy data selected
async function handleBuyData(event: any) {
    const senderId = event.sender.id;
    const text = `Select network for data Purchase \n 1. MTN \n 2. GLO \n 3. Airtel \n 4. 9Mobile \n 0. cancel`;

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

        // @ts-expect-error check if entred response is with in expected
        if (message !== '1' || message !== '2' || message !== '3' || message !== '4') {
            await sendMessage(senderId, { text: 'Invalid response recieved.' });
            return handleBuyData(event);
        };

        let dataDetails: any = await fs.promises.readFile('files/data-details.json');
        dataDetails = JSON.parse(dataDetails);
        // details of user selected network
        const networkDetails: any = dataDetails[message];
        const network = networkDetails[0].network;
        const networkID = networkDetails[0].networkID;
        const response = await formDataOffers(networkDetails);
        //const nextAction = `selectDataOffer`

        sendMessage(senderId, { text: response });
        // update bot user inof
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
        console.error('An error occured in handleDataNetWorkSelected', err);
        sendMessage(senderId, { text: 'An error occcured please enter again.  \n Or enter Q to cancel' });
    };
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
            await sendMessage(senderId, { text: 'Invalid response entred' });
            return handleDataNetWorkSelected(event);
        };

        sendMessage(senderId, { text: `Enter phone number for ${network} data purchase` });

        // update user document
        BotUsers.updateOne(
            { id: senderId },
            {
                $set: {
                    nextAction: 'enterPhoneNumber',
                    'purchasePayload.price': dataOffer.price,
                    'purchasePayload.size': dataOffer.size,
                    'purchasePayload.index': dataOffer.index,
                    'purchasePayload.planID': dataOffer.planID,
                    'purchasePayload.product': `${dataOffer.size} ${dataOffer.network} data`
                }
            }
        );
    } catch (err) {
        console.error('An error occured in handleOfferSelected', err);
        sendMessage(senderId, { text: 'An error occured plase enter resposne again.  \n Or enter Q to cancel' })
    };
};




// functiion to respond to phone number entred
const handlePhoneNumberEntred = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    try {
        if (message.toLowerCase() === 'q') return cancelTransaction(senderId, true);

        const validatedNum = validateNumber(message);
        const user = await BotUsers.findOne({ id: senderId });

        // to run if number valid and user has provided email
        if (validatedNum && user?.email) {
            await sendMessage(senderId, { text: 'phone  number recieved' });
            await BotUsers.updateOne({ id: senderId }, {
                $set: {
                    nextAction: 'selectOrderPreviewAction',
                    'purchasePayload.phoneNumber': validatedNum,
                }
            });

            return confirmDataPurchaseResponse(senderId);
        };

        // to run if number is valid but user has never provided email
        if (validatedNum && !user?.email) {
            sendMessage(senderId, { text: 'Please enter your email. \nReciept would be sent to the provided email' });

            await BotUsers.updateOne({ id: senderId }, {
                $set: {
                    nextAction: 'enterEmailToProceed',
                    'purchasePayload.phoneNumber': validatedNum
                }
            });
            return;
        };


        sendMessage(senderId, { text: 'Phone number not valid. \nPlease enter a valid phone number. \nEnter Q to cancel.' });
    } catch (err) {
        console.error('An error occured in phoneNumberEntred', err);
        sendMessage(senderId, { text: 'An error occured plase enter resposne again.  \n Or enter Q to cancel' })
    };
};



// function to handle selected order preview
const handleSelectedOrderPreviewAction = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    try {

    } catch (err) {
        console.error('An error occured in phoneNumberEntred', err);
        sendMessage(senderId, { text: 'An error occured plase enter resposne again.  \n Or enter Q to cancel' })
    };
};

export {
    handleBuyData,
    handleDataNetWorkSelected,
    handleOfferSelected,
    handlePhoneNumberEntred,
    handleSelectedOrderPreviewAction,
}