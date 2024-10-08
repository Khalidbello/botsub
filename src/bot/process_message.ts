import { Response } from 'express';
import * as fs from 'fs';
import { sendMessage } from './modules/send_message';
import BotUsers from '../models/fb_bot_users';
import { sendNewConversationResponse } from './post-back-responses/postback_responses';
import { handleDataNetWorkSelected, handleOfferSelected, handlePhoneNumberEntred } from './message-responses/data';
import {
    bvnEntred,

} from './message-responses/message_responses';
import { changeReferralBonusPhoneNumber, referralBonusPhoneNumberRecieved, sendReferralCodeRecieved } from './message-responses/referral_message_responses';
import { defaultMessageHandler, handleChangeNumberBeforeTransaction, handleNewEmailBeforeTransasctionEntred } from './message-responses/generic';
import { handleConfirmProductPurchase } from './message-responses/data-2';
import { handleAirtimeNetworkSelected, handleEnterAirtimeAmount } from './message-responses/airtime';
import { handleEnterEmailToProcedWithPurchase } from './message-responses/generic-2';
import { enteredEmailForAccount, handleBvnEntred } from './message-responses/virtual-account';
import { handleReportIssueResponse } from './message-responses/report-issue';


async function processMessage(event: any, res: Response) {
    // check user previousky stored action to determine
    // how to respond to user messages

    if (process.env.MAINTENANCE === 'true') return sendMessage(event.sender.id, { text: 'BotSub is currently under maintenance. \nCheck back later.' }); // emergency response incase of bug fixes

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

    // fuctionalities for data purchase
    if (nextAction === 'selectDataNetwork') return handleDataNetWorkSelected(event);
    if (nextAction === 'selectDataOffer') return handleOfferSelected(event);


    // controls for buy airtime
    if (nextAction === 'selectAritimeNetwork') return handleAirtimeNetworkSelected(event);
    if (nextAction === 'enterAirtimeAmount') return handleEnterAirtimeAmount(event);


    // generic fuctionalites
    if (nextAction === 'enterPhoneNumber') return handlePhoneNumberEntred(event);
    if (nextAction === 'confirmProductPurchase') return handleConfirmProductPurchase(event);
    if (nextAction === 'changePhoneNumberBeforeTransact') return handleChangeNumberBeforeTransaction(event);
    if (nextAction === 'changeEmailBeforeTransact') return handleNewEmailBeforeTransasctionEntred(event);

    if (nextAction === 'enterEmailToProceedWithPurchase') return handleEnterEmailToProcedWithPurchase(event);

    // handlers related to virtual account
    if (nextAction === 'enterMailForAccount') return enteredEmailForAccount(event);
    if (nextAction === 'enterBvn') return handleBvnEntred(event);

    // controls related to issue report
    if (nextAction === 'enterIssue') return handleReportIssueResponse(event);

    // if (nextAction === 'phoneNumber') return sendPhoneNumberEnteredResponses(event);
    // if (nextAction === 'enterAirtimeAmount') return sendAirtimeAmountReceived(event);
    // if (nextAction === 'changeEmailBeforeTransact') return newEmailBeforeTransactResponse(event, transactionType);
    // if (nextAction === 'changePhoneNumberBeforeTransact') return newPhoneNumberBeforeTransactResponse(event, transactionType);

    // rferral related switch
    if (nextAction === 'referralCode') return sendReferralCodeRecieved(event);
    if (nextAction === 'referralBonusPhoneNumber') return referralBonusPhoneNumberRecieved(event);
    if (nextAction === 'changeReferralBonusPhoneNumber') return changeReferralBonusPhoneNumber(event);

    // default message handler
    defaultMessageHandler(event, true);
}; // end of process message switch

export default processMessage;
