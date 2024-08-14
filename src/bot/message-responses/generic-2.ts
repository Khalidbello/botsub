import BotUsers from "../../models/fb_bot_users";
import { confirmDataPurchaseResponse } from "../modules/buy-data";
import { sendMessage } from "../modules/send_message";
import { cancelTransaction } from "./generic";
import emailValidator from 'email-validator';


// function to handle first email for users  that havent provided their emails
async function handleEnterEmailToProcedWithPurchase(event: any) {
    const senderId = event.sender.id;
    const email = event.message.text.trim();

    try {
        if (email.toLowerCase() === '0') return cancelTransaction(senderId, true);

        const user = await BotUsers.findOne({ id: senderId });

        if (emailValidator.validate(email)) {
            await sendMessage(senderId, { text: 'email saved \nYou can change email when ever you want' });
            await BotUsers.updateOne({ id: senderId },
                {
                    $set: {
                        email: email,
                        nextAction: 'confirmProductPurchase'
                    }
                },
                { upsert: true }
            );
            await confirmDataPurchaseResponse(senderId, user, null);
            return;
        } else {
            const response = { text: 'the email format you entered is invalid \nPlease enter a valid email. \n\nnter 0 to cancel.' };
            await sendMessage(senderId, response);
        };
    } catch (err) {
        console.error('an error occured in send handleEnterEmailToProcedWithPurchase', err);
        await sendMessage(senderId, { text: 'Something went wrong please enter respons again.' });
    };
}; // end of sendEmailEnteredResponse



export {
    handleEnterEmailToProcedWithPurchase,
}