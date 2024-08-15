// helper funtion from user select networ offer

import BotUsers from "../../models/fb_bot_users";
import { networkDetailsType } from "../../types/bot/module-buy-data-types";
import { noTransactFound } from "./helper_functions";
import { sendMessage } from "./send_message";

const formDataOffers = async (networkInfo: networkDetailsType) => {
    const lenght = Object.keys(networkInfo).length;
    let text = `Select ${networkInfo['1'].network} data offer \n`;

    for (let i = 1; i < lenght + 1; i++) {
        text += `\n ${i}. ${networkInfo[i].size} ₦${networkInfo[i].price} ${networkInfo[i].validity}`;
    };

    text += '\n\n 0. Cancel';
    return text;
};



// function to form product response
async function confirmDataPurchaseResponse(senderId: string, user: any, phoneNumber: any) {
    const message1 = {
        text:
            'Product: ' +
            user?.purchasePayload?.product +
            '\nNetwork: ' +
            user?.purchasePayload?.network +
            '\nPrice: ' +
            '₦' + user?.purchasePayload?.price +
            '\nPhone Number: ' +
            (phoneNumber ? phoneNumber : user?.purchasePayload?.phoneNumber) +
            '\nEmail: ' +
            user?.email +
            '\n\n 1. Make purchase. \n 2. Change number. \n 3. Change Email \n\n 0. Cancel transaction'
    };
    await sendMessage(senderId, message1);

    return BotUsers.updateOne(
        { id: senderId },
        {
            $set: { nextAction: 'confirmProductPurchase' }
        }
    );
}; // confirmPurchaseTemplate



// function to change phone numbe before making purhase
async function changePhoneBeforeTransaction(event: any) {
    const senderId = event.sender.id;
    const user = await BotUsers.findOne({ id: senderId });

    // @ts-expect-error
    if (user.purchasePayload.$isEmpty()) {
        noTransactFound(senderId);
        await BotUsers.updateOne({ id: senderId }, {
            $set: { nextAction: null }
        });
        return;
    };

    await sendMessage(senderId, { text: 'Enter new phone number \n\nEnter 0 to cancel' });
    await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'changePhoneNumberBeforeTransact' } });
}; // end of  changeNumber



// function to chanege email b4 transaction
async function changeMailBeforeTransact(event: any) {
    const senderId = event.sender.id;
    const user = await BotUsers.findOne({ id: senderId });
    // @ts-expect-error
    if (user.purchasePayload.$isEmpty()) {
        noTransactFound(senderId);
        // updating database
        await BotUsers.updateOne({ id: senderId }, {
            $set: { nextAction: null }
        });
        return;
    };

    await sendMessage(senderId, { text: 'Enter new email \n\nEnter 0 to cancel' });
    await BotUsers.updateOne({ id: senderId }, {
        $set: { nextAction: 'changeEmailBeforeTransact' }
    });
}; // end of changeMailBeforeTransact


export {
    formDataOffers,
    confirmDataPurchaseResponse,
    changePhoneBeforeTransaction,
    changeMailBeforeTransact,
}