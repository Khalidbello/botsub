// file to contain generic functionality for

import emailValidator from 'email-validator';
import WhatsaapBotUsers from '../../../models/whatsaap_bot_users';
import PaymentAccounts from '../../../models/payment-accounts';
import { checkDataStatus } from '../../modules/data-network-checker';
import sendMessageW from '../send_message_w';
import { handleBuyAirtimeW } from './airtime';
import { handleBuyDataW, buyDataTextW } from './data';
import { makePurchase } from '../../../modules/v-account-make-purcchase';
import { validateNumber } from '../../modules/helper_functions';
import { showAccountDetailsW } from './virtual-account';
import { showDataPricesW } from './data-prices';
import { showActiveReferalls, showReferralCode } from './referral_message_responses';
import { handleReportIssueW } from './report-issue';
import { generateOneTimeAccountHelper, saveOneTimeAccount } from '../../modules/helper_function_2';
import {
  confirmDataPurchaseResponseW,
  handleDataNetworkNotAvailableW,
  remindToFundWalletW,
} from '../helper_functions';

// text to contain bot functionalities
const defaultTextW =
  'Hi what can i do for you today.  \n\n A. Buy data \n B. Buy airtime. \n C. My account. \n D. Show data prices' +
  '\n E. Refer a friend \n F. Active referals \n G. Report issue';

// function to respond to messages with out next action
async function defaultMessageHandlerW(messageObj: any, isMessage: any, transactNum: number) {
  const senderId = messageObj.from;

  try {
    let text;
    //const userName = await getUserName(senderId);

    if (!isMessage) return sendMessageW(senderId, defaultTextW);

    text = messageObj.text ? messageObj.text.body : '';

    if (text.toLowerCase() === 'a') return handleBuyDataW(messageObj);
    if (text.toLowerCase() === 'b') return handleBuyAirtimeW(messageObj);
    if (text.toLowerCase() === 'c') return showAccountDetailsW(messageObj);
    if (text.toLowerCase() === 'd') return showDataPricesW(messageObj, transactNum);
    if (text.toLowerCase() === 'e') return showReferralCode(messageObj);
    if (text.toLowerCase() === 'f') return showActiveReferalls(messageObj);
    if (text.toLowerCase() === 'g') return handleReportIssueW(messageObj);

    sendMessageW(senderId, defaultTextW);
  } catch (err) {
    console.error('error in default text ', err);
    await sendMessageW(senderId, 'Something went wrong');
    await sendMessageW(senderId, defaultTextW);
  }
} // end of defaultMessenger

async function cancelTransactionW(senderId: string, end: boolean) {
  await reset(senderId);

  if (end) return;
  await sendMessageW(senderId, 'Transaction  canceled.');
  sendMessageW(senderId, defaultTextW);
} // end of cancelTransactionW

// helper to help in resetting
const reset = async (senderId: string) => {
  await WhatsaapBotUsers.updateOne(
    { id: senderId },
    {
      $set: {
        nextAction: null,
        purchasePayload: {},
      },
    }
  );
}; // end of reset helpers

// function to decide hoe the transaction would be carried out depedent wether user has a virtual account or not
async function selectPurchaseMethodW(messageObj: any, transactNum: number) {
  const senderId = messageObj.from;
  const userAcount = await PaymentAccounts.findOne({ refrence: senderId });

  // if user has virtual account proceed with transaction else show user prompt to select payment type
  if (userAcount) return initMakePurchaseW(senderId);

  sendMessageW(
    senderId,
    'Select Payment Method: \n\nA. One-time account number (for this transaction only).' +
      ' \n\nB. Permanent account number (use for all future transactions, NIN required). \n\nChoose B for faster, hassle-free payments in the future! Enter X to cancel.'
  );
  await WhatsaapBotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'selectAccount' } });
  //await generateAccountNumberW(messageObj, transactNum);
} // end of selectPurchaseMehod

// function to handle no transaction found
const noTransactFoundW = async (senderId: string) => {
  sendMessageW(senderId, defaultTextW);
  reset(senderId);
};

// function to generate account number
async function generateAccountNumberW(messageObj: any, transactNum: number) {
  let payload;
  const senderId = messageObj.from;
  let whatsaapBotUser;

  //let us

  try {
    whatsaapBotUser = await WhatsaapBotUsers.findOne({ id: senderId }).select(
      'email purchasePayload referrer firstPurchase'
    );
    console.log('generateAccountNumberW in whatsaap bot : ', whatsaapBotUser);

    if (!whatsaapBotUser?.purchasePayload?.transactionType) return noTransactFoundW(senderId);

    // @ts-expect-error
    payload = whatsaapBotUser?.purchasePayload.toObject();
    payload.email = whatsaapBotUser?.email;
    payload.bot = true;
    payload.platform = 'whatsapp'; // to id which bot generated account
    payload.firstPurchase = whatsaapBotUser?.firstPurchase;
    payload.senderId = senderId;

    // check if data network is active bbefore proceedinn
    if (payload.type === 'data') {
      let check = await checkDataStatus(payload.network);

      if (!check) return handleDataNetworkNotAvailableW(senderId, payload.network);
    }

    await sendMessageW(
      senderId,
      'Make transfer to the account details below. \nPlease note that the account details below is valid only for this transaction and expires 1Hour from now.'
    );
    await sendMessageW(
      senderId,
      'Value would automatically delivered by our system once payment is made'
    );

    const response = await generateOneTimeAccountHelper(payload);

    if (response[0].status === 'success') {
      const data = response[0].meta.authorization;

      const isSaved = await saveOneTimeAccount(
        senderId,
        transactNum,
        data.transfer_account,
        data.transfer_amount,
        response[1]
      );

      if (!isSaved) throw 'An error occurede saving new transfer account';

      await sendMessageW(senderId, 'Bank Name: ' + data.transfer_bank);
      await sendMessageW(senderId, 'Account Name: BotSub FLW');
      await sendMessageW(senderId, 'Account Number: 👇');
      await sendMessageW(senderId, data.transfer_account);
      await sendMessageW(senderId, 'Amount: ₦' + data.transfer_amount);
      // removing purchasePayload
      cancelTransactionW(senderId, true);
      return;
    }
    throw response;
  } catch (err) {
    await sendMessageW(senderId, 'An error occured Please try again.');
    await confirmDataPurchaseResponseW(senderId, whatsaapBotUser, null);
    console.error('Error getting transfer account:', err);
  }
} // end of generateAccountNumberW

// functin to initiate tranacion for users with virtual account
async function initMakePurchaseW(senderId: any) {
  try {
    const userDet = WhatsaapBotUsers.findOne({ id: senderId }).select('purchasePayload email'); // requesting user transacion details
    const userAcount = PaymentAccounts.findOne({ refrence: senderId });
    const promises = [userDet, userAcount];
    const data = await Promise.all(promises);
    // @ts-expect-error
    const purchasePayload = data[0].purchasePayload; //console.log('purchase ayload in initmakePurchase', purchasePayload);
    // @ts-expect-error
    if (purchasePayload) purchasePayload.email = data[0].email;

    console.log('prchase payload: ', purchasePayload);
    if (!purchasePayload.transactionType) {
      await sendMessageW(senderId, 'No transaction found');
      await sendMessageW(senderId, defaultTextW);
      return;
    }

    // @ts-expect-error
    if (parseInt(purchasePayload.price) > parseInt(data[1].balance))
      return remindToFundWalletW(
        senderId,
        // @ts-expect-error error
        data[1].balance - purchasePayload.price,
        // @ts-expect-error error
        data[1].balance,
        data[1]
      ); // returning function to remind user to fund wallet

    makePurchase(purchasePayload, 'whatsapp', senderId); // calling function to make function
  } catch (err) {
    console.error('an error occured in initMakePurchaseW', err);
  }
} // end of function to initialise function

// function to handle phone number entred
async function handleChangeNumberBeforeTransactionW(messageObj: any) {
  const senderId = messageObj.from;
  const phoneNumber = messageObj?.text?.body.trim();

  try {
    const user = await WhatsaapBotUsers.findOne({ id: senderId });
    const validatedNum = validateNumber(phoneNumber);

    if (phoneNumber.toLowerCase() === 'x') {
      await sendMessageW(senderId, 'Change phone number canceled');
      await confirmDataPurchaseResponseW(senderId, user, null);
      return WhatsaapBotUsers.updateOne(
        { id: senderId },
        {
          $set: { nextAction: 'confirmProductPurchase' },
        }
      );
    }

    if (validatedNum) {
      await sendMessageW(senderId, 'phone  number recieved');
      if (user?.email) {
        await WhatsaapBotUsers.updateOne(
          { id: senderId },
          {
            $set: {
              nextAction: 'confirmProductPurchase',
              'purchasePayload.phoneNumber': validatedNum,
            },
          }
        );
        await confirmDataPurchaseResponseW(senderId, user, validatedNum);
        return;
      }

      await sendMessageW(
        senderId,
        'Please enter your email. \nReciept would be sent to the provided email'
      );

      await WhatsaapBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            nextAction: 'enterEmailFirst',
            'purchasePayload.phoneNumber': phoneNumber,
          },
        }
      );
      return;
    }
    await sendMessageW(
      senderId,
      'Phone number not valid. \nPlease enter a valid phone number. \n\nEnter X to cancel.'
    );
  } catch (err) {}
} // end of sendPhoneNumberEnteredResponses

// function to handle change of email before transaction
async function handleNewEmailBeforeTransasctionEntredW(messageObj: any) {
  const senderId = messageObj.from;
  const email = messageObj?.text?.body.trim();

  try {
    const user = await WhatsaapBotUsers.findOne({ id: senderId });

    if (email.toLowerCase() === 'x') {
      await sendMessageW(senderId, 'Change email canceled');
      await confirmDataPurchaseResponseW(senderId, user, null);
      await WhatsaapBotUsers.updateOne(
        { id: senderId },
        {
          $set: { nextAction: 'confirmProductPurchase' },
        }
      );
      return;
    }

    if (emailValidator.validate(email)) {
      await sendMessageW(senderId, 'Email changed successfully.');
      await WhatsaapBotUsers.updateOne(
        { id: senderId },
        {
          $set: { email: email },
        }
      );
      await confirmDataPurchaseResponseW(senderId, user, null);
    } else {
      await sendMessageW(
        senderId,
        'The email format you entered is invalid. \nPlease enter a valid email. \n\nEnter x to cancel.'
      );
    }
  } catch (err) {
    console.error('Error occured in changeEmailBeforeTransaction', err);
    sendMessageW(senderId, 'An error occured plase enter resposne again.  \n\nEnter X to cancel');
  }
} // end of changeEmailBeforeTransaction

export {
  defaultTextW,
  defaultMessageHandlerW,
  cancelTransactionW,
  initMakePurchaseW,
  selectPurchaseMethodW,
  handleNewEmailBeforeTransasctionEntredW,
  handleChangeNumberBeforeTransactionW,
  generateAccountNumberW,
  noTransactFoundW,
};
