import BotUsers from "../../models/fb_bot_users";
import { airtimeNetworkType } from "../../types/bot/module-airtime-types";
import { validateAmount } from "../modules/helper_functions";
import { sendMessage } from "../modules/send_message";
import { cancelTransaction } from "./generic";

// const function to respond to buy airtime
const handleBuyAirtime = async (event: any) => {
    const senderId = event.sender.id;

    try {
        await sendMessage(senderId, { text: 'Select network for Airtime purchase. \n \n 1. MTN. \n 2. GLO. \n 3. Airtel. \n 4. 9mobile. \n\n 0. cancel.' });
        await BotUsers.updateOne(
            { id: senderId },
            { $set: { nextAction: 'selectAritimeNetwork' } }
        );
    } catch (err) {
        console.error('An error occurred in handleDataNetWorkSelected', err);
        await sendMessage(senderId, { text: 'An error occurred, please try again. \n\nOr enter 0 to cancel' });
    }
};



// fucntion to handle selection of netework for airtime purchase
const handleAirtimeNetworkSelected = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();
    const airtimeNetwork: airtimeNetworkType = {
        '1': {
            network: 'MTN',
            id: 1
        },
        '2': {
            network: 'GLO',
            id: 2
        },
        '3': {
            network: 'Airtel',
            id: 4
        },
        '4': {
            network: '9mobile',
            id: 3
        }
    };

    try {
        if (message === '0') return cancelTransaction(senderId, true);

        if (!airtimeNetwork[message]) {
            sendMessage(senderId, { text: 'Invalid response, enter response again. \n\n Enter 0 to cancel.' })
        };

        await sendMessage(senderId, { text: 'Enter airtime amount.' });
        await BotUsers.updateOne(
            { id: senderId },
            {
                $set: {
                    nextAction: 'enterAirtimeAmount',
                    'purchasePayload.network': airtimeNetwork[message].network,
                    'purchasePayload.networkID': airtimeNetwork[message].id
                }
            }
        );
    } catch (err) {
        console.error('An error occurred in handleDataNetWorkSelected', err);
        await sendMessage(senderId, { text: 'An error occurred, please try again. \n\nOr enter 0 to cancel' });
    };
}; // end of handleAirtimeNetworkSelected



// function to handle enter airtime amount
const handleEnterAirtimeAmount = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    try {
        if (message === '0') return cancelTransaction(senderId, true);
        const amountValid = await validateAmount(message); console.log('Amont validdddddddddddddddd', amountValid);
        if (!amountValid) return sendMessage(senderId, { text: 'Invalid amount entered.\nAmount should be a number and at least 100. \n\nEnter 0 to cancel.' });

        const user = await BotUsers.findOne({ id: senderId });

        await sendMessage(senderId, { text: `Enter phone number for ${user?.purchasePayload?.network} airtime purchase` });

        await BotUsers.updateOne(
            { id: senderId },
            {
                $set: {
                    nextAction: 'enterPhoneNumber',
                    'purchasePayload.price': parseFloat(message),
                    'purchasePayload.product': `${message} ${user?.purchasePayload?.network} airtime.`,
                    'purchasePayload.transactionType': 'airtime',
                }
            }
        )
    } catch (err) {
        console.error('An error occurred in handleDataNetWorkSelected', err);
        await sendMessage(senderId, { text: 'An error occurred, please try again. \n\nOr enter 0 to cancel' });
    };
};


export {
    handleBuyAirtime,
    handleAirtimeNetworkSelected,
    handleEnterAirtimeAmount,
}