import { Response } from 'express';
import * as fs from 'fs';
import { sendMessage } from './modules/send_message';
import BotUsers from '../models/fb_bot_users';
import { sendNewConversationResponse } from './post-back-responses/postback_responses';
import { handleBuyData, handleDataNetWorkSelected } from './message-responses/data';
import {
    bvnEntred,
    enteredEmailForAccount,
    newEmailBeforeTransactResponse,
    newPhoneNumberBeforeTransactResponse,
    reportIssue,
    sendAirtimeAmountReceived,
    sendEmailEnteredResponse,
    sendPhoneNumberEnteredResponses
} from './message-responses/message_responses';
import { changeReferralBonusPhoneNumber, referralBonusPhoneNumberRecieved, sendReferralCodeRecieved } from './message-responses/referral_message_responses';
import { defaultMessageHandler } from './message-responses/generic';


async function processMessage(event: any, res: Response) {
    // check user previousky stored action to determine
    // how to respond to user messages

    if (process.env.botMaintenance === 'true') return sendMessage(event.sender.id, { text: 'Sorry network services are currenly down and would be restored by 10:30 PM' }); // emergency response incase of bug fixes

    const senderId = event.sender.id;
    const user = await BotUsers.findOne({ 'id': senderId }).select('_id purchasePayload nextAction');
    console.log('user mongo db payload process message', user);

    if (!user) return sendNewConversationResponse(event);

    let transactionType;
    try {
        transactionType = user?.purchasePayload?.transactionType;
    } catch (err) {
        console.error('no transactionType in process message');
    };

    const nextAction = user.nextAction;

    // cases for data purchase;
    if (nextAction === 'buyData') return handleBuyData(event);
    if (nextAction === 'selectDataNetwork') return handleDataNetWorkSelected(event)

    if (nextAction === 'enterEmailFirst') return sendEmailEnteredResponse(event);
    if (nextAction === 'phoneNumber') return sendPhoneNumberEnteredResponses(event);
    if (nextAction === 'enterAirtimeAmount') return sendAirtimeAmountReceived(event);
    // @ts-expect-error
    if (nextAction === 'changeEmailBeforeTransact') return newEmailBeforeTransactResponse(event, transactionType);
    // @ts-expect-error
    if (nextAction === 'changePhoneNumberBeforeTransact') return newPhoneNumberBeforeTransactResponse(event, transactionType);
    if (nextAction === 'enterMailForAccount') return enteredEmailForAccount(event);
    if (nextAction === 'enterBvn') return bvnEntred(event);
    if (nextAction === 'enterIssue') return reportIssue(event);


    // rferral related switch
    if (nextAction === 'referralCode') return sendReferralCodeRecieved(event);
    if (nextAction === 'referralBonusPhoneNumber') return referralBonusPhoneNumberRecieved(event);
    if (nextAction === 'changeReferralBonusPhoneNumber') return changeReferralBonusPhoneNumber(event);

    // default message handler
    defaultMessageHandler(event, true);
}; // end of process message switch

export default processMessage;