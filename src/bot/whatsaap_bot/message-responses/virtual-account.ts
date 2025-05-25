import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import sendMessageW from '../send_message_w';
import emailValidator from 'email-validator';
import PaymentAccounts from '../../../models/payment-accounts';
import { createVAccount, createVAccountW } from '../../../modules/gateway';
import { defaultTextW } from './generic';
import { confirmDataPurchaseResponseW } from '../helper_functions';

// function to show user account details
async function showAccountDetailsW(messageObj: any) {
  const senderId = messageObj.from;
  let account = await PaymentAccounts.findOne({ refrence: senderId });

  if (!account) {
    const user = await WhatsappBotUsers.findOne({ id: senderId }).select('email');
    if (!user?.email) {
      await sendMessageW(senderId, 'You do not have a permanent account number yet.');
      await sendMessageW(
        senderId,
        'Kindly enter your email to create your permanent acount number. \nEnter X to quit'
      );
      await WhatsappBotUsers.updateOne(
        { id: senderId },
        { $set: { nextAction: 'enterMailForAccount' } }
      );
      return;
    }

    await sendMessageW(senderId, 'You do not have a permanent account number yet.');
    sendMessageW(
      senderId,
      ' Kindly enter your NIN to create a permanent account number. \n\nYour NIN is required in compliance with CBN regulation. \n\nEnter X to quit.'
    );
    await WhatsappBotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterBvn' } });
    return;
  }

  await sendMessageW(senderId, 'Your dedicated virtual account details: ');
  await sendMessageW(senderId, `Bank Name: ${account.bankName}`);
  await sendMessageW(senderId, `Account Name: ${account.accountName}`);
  await sendMessageW(senderId, 'Acccount Number: ');
  // @ts-expect-error
  await sendMessageW(senderId, account.accountNumber);
  await sendMessageW(senderId, `Account Balance: ₦${account.balance}`);
  sendMessageW(
    senderId,
    'Fund your dedicated virtual account once and make mutltiple purchases seamlessly'
  );
} // end of showAccountDetailsW

// function to respod to emal entred, this function also calls create virtual acount function
async function enteredEmailForAccountW(messageObj: any) {
  const senderId = messageObj.from;
  const email = messageObj?.text?.body;

  try {
    if (email.toLowerCase() === 'x') {
      await sendMessageW(senderId, 'Creation of dedicatd virtiual account cancled.');
      await sendMessageW(senderId, defaultTextW);

      // updaet user colletion
      await WhatsappBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });

      return;
    }

    if (emailValidator.validate(email.toLowerCase())) {
      await WhatsappBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            email: email,
            nextAction: 'enterBvn',
          },
        },
        { upsert: true }
      );

      await sendMessageW(senderId, 'Please enter your NIN.');
      return sendMessageW(
        senderId,
        'In accordeance with CBN regulations, your NIN is required to create a virtual account. \nEnter Q to  cancel'
      );
    } else {
      sendMessageW(
        senderId,
        'The email you entred is invalid. \nPlease enter a valid email for the creation of dedicated virtual account. \n\nEner X to cancel'
      );
    }
  } catch (err) {
    console.error('An error occured in enteredEmailForAccountW', err);
    await sendMessageW(
      senderId,
      'An error occured. \nPlease enter response again. \n\nEnter X to cancel.'
    );
  }
} // end of sendEmailEntere

// fucntion to handle bvn entry
const handleBvnEntredW = async (messageObj: any) => {
  const senderId = messageObj.from;

  try {
    let bvn = messageObj?.text?.body;
    let parsedBvn;
    const user = await WhatsappBotUsers.findOne({ id: senderId }).select('purchasePayload email');

    // check if bvn was requested when user was carrying out a transaction
    if (bvn.toLowerCase() === 'x' && user?.purchasePayload?.price) {
      const user = await WhatsappBotUsers.findOneAndUpdate(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } }
      );

      await sendMessageW(senderId, 'Creation of permanent account number cancled.');
      await confirmDataPurchaseResponseW(senderId, user, null);
      return;
    }

    if (bvn.toLowerCase() === 'x') {
      await sendMessageW(senderId, 'Creation of dedicated virtiual account cancled.');
      await sendMessageW(senderId, defaultTextW);
      // updaet user colletion
      await WhatsappBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
      return;
    }

    parsedBvn = parseInt(bvn);
    bvn = parsedBvn.toString();

    // Check if the parsed number is an integer and has exactly 11 digits
    if (!isNaN(parsedBvn) && Number.isInteger(parsedBvn) && bvn.length === 11) {
      return createVAccountW(user?.email, senderId, bvn, 'whatsapp', 0);
    } else {
      await sendMessageW(
        senderId,
        'The NIN  you entred is invalid. \n\nPlease enter a valid NIN. \n\nEnter X to cancel.'
      );
    }
  } catch (err) {
    console.error('An error occured in bvnEntred', err);
    await sendMessageW(senderId, 'An error ocured please. \nplease enter resposne again');
  }
}; // end of bvnEntred

export { showAccountDetailsW, enteredEmailForAccountW, handleBvnEntredW };
