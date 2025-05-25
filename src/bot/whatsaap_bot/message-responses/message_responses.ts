// message responses
import emailValidator from 'email-validator';
import { handleBuyDataW } from './data';
import sendMessageW from '../send_message_w';
import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import { validateAmount, validateNumber } from '../../modules/helper_functions';
import { createVAccount } from '../../../modules/gateway';
import { generateRandomString } from '../../../modules/helper_functions';
import ReportedIssues from '../../../models/reported-issues';
import { handleBuyAirtimeW } from './airtime';
import { cancelTransactionW } from './generic';
import { confirmDataPurchaseResponseW } from '../helper_functions';

const defaaultMessageW =
  'Hi what can i do for you today. \n\n 1. Buy data. \n 2. Buy Airtime. \n 3. My amount. \n 4. Refer a friend. \n 5. Report an issue. \n\nContact BotSub Customer Support: https://wa.me/09166871328';

// function to respond to unexpected message
async function defaultMessageHandlerW(messageObj: any, message: any) {
  try {
    //writeMessageToJson('in default message handler')
    const senderId = messageObj.from;
    let text;
    //const userName = await getUserName(senderId);

    if (message) {
      text = messageObj.message.text.trim();
      if (text.toLowerCase() === 'x') {
        await cancelTransactionW(senderId, false);
        return;
      }

      if (text.toLowerCase() === '1') return handleBuyDataW(messageObj);
      if (text.toLowerCase() === '2') return handleBuyAirtimeW(messageObj);
      if (text.toLowerCase() === '3') return;
      if (text.toLowerCase() === '4') return;
      if (text.toLowerCase() === '5') return;
    }

    await sendMessageW(senderId, defaaultMessageW);
    // await sendMessageW(senderId, { text: `Hi ${userName || ''} what can i do for you` });
    // await sendTemplate(senderId, responseServices);
    // await sendTemplate(senderId, responseServices2);
    // sendTemplate(senderId, responseServices3);
    //writeMessageToJson('end of default message handler');
  } catch (err) {
    console.error('error in default error ', err);
  }
} // end of defaultMessenger

// function to handle first email for users  that havent provided their emails
async function sendEmailEnteredResponseW(messageObj: any) {
  const senderId = messageObj.from;
  const email = messageObj.text ? messageObj.text.body : '';

  if (email.toLowerCase() === 'x') return cancelTransactionW(senderId, false);
  if (emailValidator.validate(email)) {
    await sendMessageW(senderId, 'email saved \nYou can change email when ever you want');
    const saveEmail = await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          email: email,
          nextAction: null,
        },
      },
      { upsert: true }
    );
    //console.log('in save enail', saveEmail);
    const user = await WhatsappBotUsers.findOne({ id: senderId }).select('purchasePayload');
    await confirmDataPurchaseResponseW(senderId, user, null);
  } else {
    await sendMessageW(
      senderId,
      'the email format you entered is invalid \nPlease enter a valid email.'
    );
  }
} // end of sendEmailEnteredResponseW

// funtion to handle bvn entred
async function bvnEntredW(messageObj: any) {
  const senderId = messageObj.from;

  try {
    let bvn = messageObj.text ? messageObj.text.body : '';
    let parsedBvn;

    if (bvn.toLowerCase() === 'x') {
      await sendMessageW(senderId, 'Creation of dedicated virtiual account cancled.');
      await sendMessageW(senderId, defaaultMessageW);

      // updaet user colletion
      await WhatsappBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
      return;
    }

    parsedBvn = parseInt(bvn);
    bvn = parsedBvn.toString();

    // Check if the parsed number is an integer and has exactly 11 digits
    if (!isNaN(parsedBvn) && Number.isInteger(parsedBvn) && bvn.length === 11) {
      const user = await WhatsappBotUsers.findOne({ id: senderId }).select('email');

      // upate user database
      WhatsappBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });

      await createVAccount(user?.email, senderId, bvn, 'facebook', 0);
    } else {
      await sendMessageW(
        senderId,
        'The NIN  you entred is invalid. \n\nPlease enter a valid NIN. \n\nEnter Q to cancel.'
      );
    }
  } catch (err) {
    console.error('An error occured in bvnEntredW', err);
    await sendMessageW(senderId, 'An error ocured please. \nplease enter resposne again');
  }
} // end of bvnEntredW

//==================================================
// airtime purchase response function

// function to handle airtime amount entred
async function sendAirtimeAmountReceivedW(messageObj: any) {
  const senderId = messageObj.from;
  const amount = messageObj.text ? messageObj.text.body : '';
  const userData = await WhatsappBotUsers.findOne({ id: senderId }).select('purchasePayload');

  if (amount.toLowerCase() === 'x') return cancelTransactionW(senderId, false);
  if (await validateAmount(amount)) {
    await sendMessageW(senderId, 'Amount recieved');
    await sendMessageW(
      senderId,
      ` Enter ${userData?.purchasePayload?.network} phone number for airtime purchase. \nEnter Q to cancel`
    );

    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'phoneNumber',
          'purchasePayload.price': parseInt(amount),
          'purchasePayload.product': `₦${amount} Airtime`,
          'purchasePayload.transactionType': 'airtime',
        },
      }
    );
    return null;
  }
  await sendMessageW(
    senderId,
    'Invalid amount entered \nPlease enter a valid amount. \nEnter Q to cancel'
  );
} // end of sendAirtimeAmountReceivedW

// function to handle phone number entred
async function sendPhoneNumberEnteredResponsesW(messageObj: any) {
  const senderId = messageObj.from;
  const phoneNumber = messageObj?.text?.body;
  const validatedNum = validateNumber(phoneNumber);
  let user;

  if (phoneNumber.toLowerCase() === 'x') return cancelTransactionW(senderId, false);
  if (validatedNum) {
    await sendMessageW(senderId, 'phone  number recieved');
    user = await WhatsappBotUsers.findOne({ id: senderId });
    if (user?.email) {
      await WhatsappBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            nextAction: null,
            'purchasePayload.phoneNumber': validatedNum,
          },
        }
      );
      await confirmDataPurchaseResponseW(senderId, user, null);
      return;
    }

    await sendMessageW(
      senderId,
      'Please enter your email. \nReciept would be sent to the provided email'
    );

    await WhatsappBotUsers.updateOne(
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
    'Phone number not valid. \nPlease enter a valid phone number. \nEnter Q to cancel.'
  );
} // end of sendPhoneNumberEnteredResponsesW

// function to handle change of email before transaction
async function newEmailBeforeTransactResponseW(
  messageObj: any,
  transactionType: 'data' | 'airtime'
) {
  const senderId = messageObj.from;
  const email = messageObj?.text?.body;
  const user = await WhatsappBotUsers.findOne({ id: senderId }).select('purchasePayload email');

  try {
    if (email.toLowerCase() === 'x') {
      await sendMessageW(senderId, 'Change email cancled');
      return confirmDataPurchaseResponseW(senderId, user, null);
    }

    if (emailValidator.validate(email)) {
      await WhatsappBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            nextAction: 'confirmProductPurchase',
            email: email,
          },
        }
      );
      await sendMessageW(senderId, 'Email changed successfully.');
      return confirmDataPurchaseResponseW(senderId, user, null);
    } else {
      await sendMessageW(
        senderId,
        'the email format you entered is invalid. \nPlease enter a valid email. \n\nEnter 0 to cancel.'
      );
    }
  } catch (err) {
    console.error('Error occured in newEmailBeforeTransactResponseW', err);
    sendMessageW(senderId, 'An error occured plase enter resposne again.  \n Or enter 0 to cancel');
  }
} // end of newEmailBeforeTransactResponseW

// function to handle change of phoneNumber
async function newPhoneNumberBeforeTransactResponseW(
  messageObj: any,
  transactionType: 'data' | 'airtime'
) {
  const senderId = messageObj.from;
  const phoneNumber = messageObj?.text?.body;
  const validatedNum = validateNumber(phoneNumber);
  const user = await WhatsappBotUsers.findOne({ id: senderId }).select('purchasePayload email');
  if (phoneNumber.toLowerCase() === 'x') {
    await sendMessageW(senderId, 'Change phone number cancled');
    return confirmDataPurchaseResponseW(senderId, user, null);
  }

  if (validatedNum) {
    await WhatsappBotUsers.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: null,
          'purchasePayload.phoneNumber': validatedNum,
        },
      }
    );
    await sendMessageW(senderId, 'Phone number changed successfully');
    //console.log('transactionType', transactionType);
    confirmDataPurchaseResponseW(senderId, user, null);
  } else {
    await sendMessageW(
      senderId,
      'The phone number you entered is invalid. \nPlease enter a valid phone number. \nEnter Q to cancel.'
    );
  }
} // end of newPhoneNumberBeforeTransactResponseW

// function to handle issue reporting
async function reportIssueW(messageObj: any) {
  const senderId = messageObj.from;
  const message = messageObj?.text?.body.toLowerCase();
  const date = new Date();
  const id = generateRandomString(10);

  if (!message) {
    await sendMessageW(senderId, 'Sorry issue report can not be empty.');
    return;
  }

  if (message === 'x') return cancelTransactionW(senderId, false);

  const issue = new ReportedIssues({
    id,
    description: message,
    date,
    reporterId: senderId,
    platform: 'whatsapp',
    status: true,
  });

  await issue
    .save()
    .then(async (data: any) => {
      sendMessageW(
        senderId,
        'Your issue have beign directed to BotSub support team. \nSorry for any inconveniences caused.'
      );

      await WhatsappBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            nextAction: null,
          },
        }
      );
    })
    .catch((err: Error) => {
      console.error('error occured in report issue fucntion', err);
      sendMessageW(senderId, 'Sorry something went wrong. \nPlease enter issue again');
    });
} // end of report issue function

export {
  defaaultMessageW,
  defaultMessageHandlerW,
  sendEmailEnteredResponseW,
  sendAirtimeAmountReceivedW,
  sendPhoneNumberEnteredResponsesW,
  newEmailBeforeTransactResponseW,
  newPhoneNumberBeforeTransactResponseW,
  bvnEntredW,
  reportIssueW,
};
