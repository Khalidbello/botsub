// file to contain generic functionality for 

import { sendMessage } from "../modules/send_message";
import { cancelTransaction } from "../post-back-responses/postback_responses";
import { handleBuyAirtime } from "./airtime";
import { handleBuyData } from "./data";

// text to contain bot functionalities 
const defaultText = 'Hy what can i do for you today.  \n 1. Buy data \n 2. Buy airtime';

// function to respond to messages with out next action
async function defaultMessageHandler(event: any, isMessage: any) {
    try {
        //writeMessageToJson('in default message handler')
        const senderId = event.sender.id;
        let text;
        //const userName = await getUserName(senderId);

        if (!isMessage) return sendMessage(senderId, { text: defaultText });

        text = event.message.text.trim();

        if (text.toLowerCase() === 'q') return cancelTransaction(senderId, true);

        if (text.toLowerCase() === '1') return handleBuyData(event);

        if (text.toLowerCase() === '2') return handleBuyAirtime(event);

        sendMessage(senderId, {text: 'Hy what can i do for you today. \n 1. Buy data \n 2. Buy Airtime'});
        // await sendMessage(senderId, { text: `Hy ${userName || ''} what can i do for you` });
        // await sendTemplate(senderId, responseServices);
        // await sendTemplate(senderId, responseServices2);
        // sendTemplate(senderId, responseServices3);
        //writeMessageToJson('end of default message handler');
    } catch (err) {
        console.error('error in default error ', err);
    };
}; // end of defaultMessenger


export {
    defaultMessageHandler
}