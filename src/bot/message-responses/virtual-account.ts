import BotUsers from '../../models/fb_bot_users';
import { sendMessage } from '../modules/send_message';
import emailValidator from 'email-validator';
import { defaaultMessage } from './message_responses';
import PaymentAccounts from '../../models/payment-accounts';
import { createVAccount } from '../../modules/gateway';
import { defaultText } from './generic';

// function to show user account details
async function showAccountDetails(event: any) {
  const senderId = event.sender.id;
  let account = await PaymentAccounts.findOne({ refrence: senderId });

  if (!account) {
    const user = await BotUsers.findOne({ id: senderId }).select('email');
    if (!user?.email) {
      await sendMessage(senderId, { text: 'You do not have a dedicated virtual account yet.' });
      await sendMessage(senderId, {
        text: 'Kindly enter your email to create your virtual accont. \nEnter X to quit',
      });
      await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterMailForAccount' } });
      return;
    }

    await sendMessage(senderId, { text: 'You do not a dedicated virtual account yet.' });
    sendMessage(senderId, {
      text: ' Kindly enter your BVN to create a virtul accunt. \n\nYour BVN is required in compliance with CBN regualation. \n\nEnter X to quit.',
    });
    await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterBvn' } });
    return;
  }

  await sendMessage(senderId, { text: 'Your dedicated virtual account details: ' });
  await sendMessage(senderId, { text: `Bank Name: ${account.bankName}` });
  await sendMessage(senderId, { text: `Account Name: ${account.accountName}` });
  await sendMessage(senderId, { text: 'Acccount Number: ' });
  // @ts-expect-error
  await sendMessage(senderId, { text: account.accountNumber });
  await sendMessage(senderId, { text: `Account Balance: ₦${account.balance}` });
  sendMessage(senderId, {
    text: 'Fund your dedicated virtual account once and make mutltiple purchases seamlessly',
  });
} // end of showAccountDetails

// function to respod to emal entred, this function also calls create virtual acount function
async function enteredEmailForAccount(event: any) {
  const senderId = event.sender.id;
  const email = event.message.text.trim();

  try {
    if (email.toLowerCase() === 'x') {
      await sendMessage(senderId, { text: 'Creation of dedicatd virtiual account cancled.' });
      await sendMessage(senderId, { text: defaultText });

      // updaet user colletion
      await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });

      return;
    }

    if (emailValidator.validate(email.toLowerCase())) {
      await BotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            email: email,
            nextAction: 'enterBvn',
          },
        },
        { upsert: true }
      );

      await sendMessage(senderId, { text: 'Please enter your BVN.' });
      return sendMessage(senderId, {
        text: 'In accordeance with CBN regulations, your BVN is required to create a virtual account. \nEnter Q to  cancel',
      });
    } else {
      sendMessage(senderId, {
        text: 'The email you entred is invalid. \nPlease enter a valid email for the creation of dedicated virtual account. \n\nEner X to cancel',
      });
    }
  } catch (err) {
    console.error('An error occured in enteredEmailForAccount', err);
    await sendMessage(senderId, {
      text: 'An error occured. \nPlease enter response again. \n\nEnter X to cancel.',
    });
  }
} // end of sendEmailEntere

// fucntion to handle bvn entry
const handleBvnEntred = async (event: any) => {
  const senderId = event.sender.id;

  try {
    let bvn = event.message.text.trim();
    let parsedBvn;

    if (bvn.toLowerCase() === 'x') {
      await sendMessage(senderId, { text: 'Creation of dedicated virtiual account cancled.' });
      await sendMessage(senderId, { text: defaultText });
      // updaet user colletion
      await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
      return;
    }

    parsedBvn = parseInt(bvn);
    bvn = parsedBvn.toString();

    // Check if the parsed number is an integer and has exactly 11 digits
    if (!isNaN(parsedBvn) && Number.isInteger(parsedBvn) && bvn.length === 11) {
      const user = await BotUsers.findOne({ id: senderId }).select('email');
      await createVAccount(user?.email, senderId, bvn, 'facebook', 0);

      // upate user database
      await BotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
    } else {
      await sendMessage(senderId, {
        text: 'The BVN  you entred is invalid. \n\nPlease enter a valid BVN. \n\nEnter X to cancle.',
      });
    }
  } catch (err) {
    console.error('An error occured in bvnEntred', err);
    await sendMessage(senderId, { text: 'An error ocured please. \nplease enter resposne again' });
  }
}; // end of bvnEntred

export { showAccountDetails, enteredEmailForAccount, handleBvnEntred };
