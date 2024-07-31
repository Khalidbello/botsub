import BotUsers from "../../models/fb_bot_users";
import { changeMailBeforeTransact, changePhoneBeforeTransaction, confirmDataPurchaseResponse } from "../modules/buy-data";
import { sendMessage } from "../modules/send_message";
import { selectPurchaseMethod } from "./generic";

const confirmProductPurchase = async (event: any) => {
    const senderId = event.sender.id;
    const message: string = event.message.text.trim();

    try {
        const user = await BotUsers.findOne({ id: senderId });

        if (message === '1') return selectPurchaseMethod(event);
        if (message === '2') return changePhoneBeforeTransaction(event);
        if (message === '3') return changeMailBeforeTransact(event);

        await sendMessage(senderId, { text: 'Invalid response recieved.' });
        confirmDataPurchaseResponse(senderId, user)
    } catch (err) {
        console.error('An error occured in phoneNumberEntred', err);
        sendMessage(senderId, { text: 'An error occured plase enter resposne again.  \n Or enter Q to cancel' })
    };
};


export {
    confirmProductPurchase
}