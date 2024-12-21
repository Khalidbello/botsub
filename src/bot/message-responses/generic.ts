// file to contain generic functionality for

import emailValidator from 'email-validator';
import BotUsers from '../../models/fb_bot_users';
import PaymentAccounts from '../../models/payment-accounts';
import { checkDataStatus, handleDataNetworkNotAvailable } from '../modules/data-network-checker';
import { sendMessage } from '../modules/send_message';
import { handleBuyAirtime } from './airtime';
import { handleBuyData, buyDataText } from './data';
import { confirmDataPurchaseResponse } from '../modules/buy-data';
import { makePurchase } from '../../modules/v-account-make-purcchase';
import { remindToFundWallet, validateNumber } from '../modules/helper_functions';
import { showAccountDetails } from './virtual-account';
import { showDataPrices } from './data-prices';
import { showActiveReferalls, showReferralCode } from './referral_message_responses';
import { handleReportIssue } from './report-issue';
import { generateOneTimeAccountHelper, saveOneTimeAccount } from '../modules/helper_function_2';
import fbBotRouter from '../../routes/fb-bot-webhook';

// text to contain bot functionalities
const defaultText =
  'Hy what can i do for you today.  \n\n A. Buy data \n B. Buy airtime. \n C. My account. \n D. Show data prices' +
  '\n E. Refer a friend \n F. Active referals \n G. Report issue';

// function to respond to messages with out next action
async function defaultMessageHandler(event: any, isMessage: any, transactNum: number) {
  const senderId = event.sender.id;

  try {
    let text;
    //const userName = await getUserName(senderId);

    if (!isMessage) return sendMessage(senderId, { text: defaultText });

    text = event.message.text.trim();

    if (text.toLowerCase() === 'a') return handleBuyData(event);
    if (text.toLowerCase() === 'b') return handleBuyAirtime(event);
    if (text.toLowerCase() === 'c') return showAccountDetails(event);
    if (text.toLowerCase() === 'd') return showDataPrices(event, transactNum);
    if (text.toLowerCase() === 'e') return showReferralCode(event);
    if (text.toLowerCase() === 'f') return showActiveReferalls(event);
    if (text.toLowerCase() === 'g') return handleReportIssue(event);

    sendMessage(senderId, { text: defaultText });
  } catch (err) {
    console.error('error in default text ', err);
    await sendMessage(senderId, { text: 'Something went wrong' });
    await sendMessage(senderId, { text: defaultText });
  }
} // end of defaultMessenger

async function cancelTransaction(senderId: string, end: boolean) {
  await reset(senderId);

  if (end) return;
  await sendMessage(senderId, { text: 'Transaction  canceled.' });
  sendMessage(senderId, { text: defaultText });
} // end of cancelTransaction

// helper to help in resetting
const reset = async (senderId: string) => {
  await BotUsers.updateOne(
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
async function selectPurchaseMethod(event: any, transactNum: number) {
  const senderId = event.sender.id;
  const userAcount = await PaymentAccounts.findOne({ refrence: senderId });

  // if user has virtual account proceed with transaction else show user prompt to select payment type
  if (userAcount) return initMakePurchase(senderId);

  sendMessage(senderId, {
    text:
      'Select Payment method. \n\nA. Create a virtual account for quick and hassle-free future payments.' +
      ' \n\nB. Use a one-time account number for this transaction only. \n\nEnter X to cancel.',
  });
  await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'selectAccount' } });
  //await generateAccountNumber(event, transactNum);
} // end of selectPurchaseMehod

// function to generate account number
async function generateAccountNumber(event: any, transactNum: number) {
  let payload, response;
  const senderId = event.sender.id;
  let botUser;

  //let us

  try {
    botUser = await BotUsers.findOne({ id: senderId }).select(
      'email purchasePayload referrer firstPurchase'
    );
    console.log('generateAccountNumber', botUser);

    // @ts-expect-error
    if (!botUser.purchasePayload.transactionType) return noTransactFound(senderId);

    // @ts-expect-error
    payload = botUser.purchasePayload.toObject();
    payload.email = botUser?.email;
    payload.bot = true;
    payload.firstPurchase = botUser?.firstPurchase;
    payload.senderId = senderId;

    // check if data network is active bbefore proceedinn
    if (payload.type === 'data') {
      let check = await checkDataStatus(payload.network);

      if (!check) return handleDataNetworkNotAvailable(senderId, payload.network);
    }

    await sendMessage(senderId, {
      text: 'Make transfer to the account details below. \nPlease note that the account details below is valid only for this transaction and expires 1Hour from now.',
    });
    await sendMessage(senderId, {
      text: 'Value would automatically delivered by our system once payment is made',
    });

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

      await sendMessage(senderId, { text: 'Bank Name: ' + data.transfer_bank });
      await sendMessage(senderId, { text: 'Account Name: BotSub FLW' });
      await sendMessage(senderId, { text: 'Account Number: 👇' });
      await sendMessage(senderId, { text: data.transfer_account });
      await sendMessage(senderId, { text: 'Amount: ₦' + data.transfer_amount });
      // removing purchasePayload
      cancelTransaction(senderId, false);
      return;
    }
    throw response;
  } catch (err) {
    await sendMessage(senderId, { text: 'An error occured Please try again.' });
    await confirmDataPurchaseResponse(senderId, botUser, null);
    console.error('Error getting transfer account:', err);
  }
} // end of generateAccountNumber

// functin to initiate tranacion for users with virtual account
async function initMakePurchase(senderId: any) {
  try {
    const userDet = BotUsers.findOne({ id: senderId }).select('purchasePayload email'); // requesting user transacion details
    const userAcount = PaymentAccounts.findOne({ refrence: senderId });
    const promises = [userDet, userAcount];
    const data = await Promise.all(promises);
    // @ts-expect-error
    const purchasePayload = data[0].purchasePayload; //console.log('purchase ayload in initmakePurchase', purchasePayload);
    // @ts-expect-error
    if (purchasePayload) purchasePayload.email = data[0].email;

    console.log('prchase payload: ', purchasePayload);
    if (!purchasePayload.transactionType) {
      await sendMessage(senderId, { text: 'No transaction found' });
      await sendMessage(senderId, { text: defaultText });
      return;
    }

    // @ts-expect-error
    if (parseInt(purchasePayload.price) > parseInt(data[1].balance))
      return remindToFundWallet(
        senderId,
        // @ts-expect-error error
        data[1].balance - purchasePayload.price,
        // @ts-expect-error error
        data[1].balance,
        data[1]
      ); // returning function to remind user to fund wallet

    makePurchase(purchasePayload, 'facebook', senderId); // calling function to make function
  } catch (err) {
    console.error('an error occured in initMakePurchase', err);
  }
} // end of function to initialise function

// function to handle phone number entred
async function handleChangeNumberBeforeTransaction(event: any) {
  const senderId = event.sender.id;
  const phoneNumber = event.message.text.trim();

  try {
    const user = await BotUsers.findOne({ id: senderId });
    const validatedNum = validateNumber(phoneNumber);

    if (phoneNumber.toLowerCase() === 'x') {
      await sendMessage(senderId, { text: 'Change phone number canceled' });
      await confirmDataPurchaseResponse(senderId, user, null);
      return BotUsers.updateOne(
        { id: senderId },
        {
          $set: { nextAction: 'confirmProductPurchase' },
        }
      );
    }

    if (validatedNum) {
      await sendMessage(senderId, { text: 'phone  number recieved' });
      if (user?.email) {
        await BotUsers.updateOne(
          { id: senderId },
          {
            $set: {
              nextAction: 'confirmProductPurchase',
              'purchasePayload.phoneNumber': validatedNum,
            },
          }
        );
        await confirmDataPurchaseResponse(senderId, user, validatedNum);
        return;
      }

      await sendMessage(senderId, {
        text: 'Please enter your email. \nReciept would be sent to the provided email',
      });

      await BotUsers.updateOne(
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
    await sendMessage(senderId, {
      text: 'Phone number not valid. \nPlease enter a valid phone number. \n\nEnter X to cancel.',
    });
  } catch (err) {}
} // end of sendPhoneNumberEnteredResponses

// function to handle change of email before transaction
async function handleNewEmailBeforeTransasctionEntred(event: any) {
  const senderId = event.sender.id;
  const email = event.message.text.trim();

  try {
    const user = await BotUsers.findOne({ id: senderId });

    if (email.toLowerCase() === 'x') {
      await sendMessage(senderId, { text: 'Change email canceled' });
      await confirmDataPurchaseResponse(senderId, user, null);
      await BotUsers.updateOne(
        { id: senderId },
        {
          $set: { nextAction: 'confirmProductPurchase' },
        }
      );
    }

    if (emailValidator.validate(email)) {
      await sendMessage(senderId, { text: 'Email changed successfully.' });
      await BotUsers.updateOne(
        { id: senderId },
        {
          $set: { email: email },
        }
      );
      await confirmDataPurchaseResponse(senderId, user, null);
    } else {
      const response = {
        text: 'The email format you entered is invalid. \nPlease enter a valid email. \n\nEnter x to cancel.',
      };
      await sendMessage(senderId, response);
    }
  } catch (err) {
    console.error('Error occured in changeEmailBeforeTransaction', err);
    sendMessage(senderId, {
      text: 'An error occured plase enter resposne again.  \n\nEnter X to cancel',
    });
  }
} // end of changeEmailBeforeTransaction

export {
  defaultText,
  defaultMessageHandler,
  cancelTransaction,
  initMakePurchase,
  selectPurchaseMethod,
  handleNewEmailBeforeTransasctionEntred,
  handleChangeNumberBeforeTransaction,
  generateAccountNumber,
};
