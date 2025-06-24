import FBBotUsers from '../../../models/fb_bot_users';
import { sendMessage } from '../../modules/send_message';
import emailValidator from 'email-validator';
import { defaaultMessage } from './message_responses';
import PaymentAccounts from '../../../models/payment-accounts';
import { createVAccount } from '../../../modules/gateway';
import { defaultText } from './generic';
import { confirmDataPurchaseResponse } from '../../modules/buy-data';
import { BotUserType } from '../../grand_slam_offer/daily_participation_reminder';

// hekper fucntion to check process wether user has a virtual acount already or not
const handleUserHasNoVirtualAcount = async (user: BotUserType) => {
  if (!user?.email) {
    await sendMessage(user.id, { text: 'You do not have a permanent account number yet.' });
    await sendMessage(user.id, {
      text: 'Kindly enter your email to create your permanent acount number. \nEnter X to quit',
    });
    await FBBotUsers.updateOne({ id: user.id }, { $set: { nextAction: 'enterMailForAccount' } });
    return;
  }

  await sendMessage(user.id, { text: 'You do not have a permanent account number yet.' });
  sendMessage(user.id, {
    text: ' Kindly enter your NIN to create a permanent account number. \n\nYour NIN is required in compliance with CBN regulation. \n\nEnter X to quit.',
  });
  await FBBotUsers.updateOne({ id: user.id }, { $set: { nextAction: 'enterBvn' } });
};

// function to show user account details
async function showAccountDetails(event: any, user: BotUserType) {
  const senderId = event.sender.id;
  let account = await PaymentAccounts.findOne({ refrence: senderId });

  if (!account) {
    const user = await FBBotUsers.findOne({ id: senderId }).select('email');
    if (!user?.email) {
      await sendMessage(senderId, { text: 'You do not have a permanent account number yet.' });
      await sendMessage(senderId, {
        text: 'Kindly enter your email to create your permanent acount number. \nEnter X to quit',
      });
      await FBBotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterMailForAccount' } });
      return;
    }

    await sendMessage(senderId, { text: 'You do not have a permanent account number yet.' });
    sendMessage(senderId, {
      text: ' Kindly enter your NIN to create a permanent account number. \n\nYour NIN is required in compliance with CBN regulation. \n\nEnter X to quit.',
    });
    await FBBotUsers.updateOne({ id: senderId }, { $set: { nextAction: 'enterBvn' } });
    return;
  }

  await sendMessage(senderId, {
    text: `Your dedicated virtual account details: \n\nBank Name: ${account.bankName} \nAccount Name: ${account.accountName} \nAccount Balance: ₦${account.balance}`,
  });
  await sendMessage(senderId, { text: 'Acccount Number: ' });
  await sendMessage(senderId, { text: account.accountNumber as string });
  await sendMessage(senderId, { text: `Account Balance: ₦${account.balance}` });
  sendMessage(senderId, {
    text: 'Fund your dedicated virtual account and enjoy smooth purchases.',
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
      await FBBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });

      return;
    }

    if (emailValidator.validate(email.toLowerCase())) {
      await FBBotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            email: email,
            nextAction: 'enterBvn',
          },
        },
        { upsert: true }
      );

      await sendMessage(senderId, { text: 'Please enter your NIN.' });
      return sendMessage(senderId, {
        text: 'In accordeance with CBN regulations, your NIN is required to create a virtual account. \n\nEnter X to  cancel',
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
    const user = await FBBotUsers.findOne({ id: senderId }).select('purchasePayload email');

    // check if bvn was requested when user was carrying out a transaction
    if (bvn.toLowerCase() === 'x' && user?.purchasePayload?.price) {
      const user = await FBBotUsers.findOneAndUpdate(
        { id: senderId },
        { $set: { nextAction: 'confirmProductPurchase' } }
      );

      await sendMessage(senderId, { text: 'Creation of permanent account number cancled.' });
      await confirmDataPurchaseResponse(senderId, user, null);
      return;
    }

    if (bvn.toLowerCase() === 'x') {
      await sendMessage(senderId, { text: 'Creation of dedicated virtiual account cancled.' });
      await sendMessage(senderId, { text: defaultText });
      // updaet user colletion
      await FBBotUsers.updateOne({ id: senderId }, { $set: { nextAction: null } });
      return;
    }

    parsedBvn = parseInt(bvn);
    bvn = parsedBvn.toString();

    // Check if the parsed number is an integer and has exactly 11 digits
    if (!isNaN(parsedBvn) && Number.isInteger(parsedBvn) && bvn.length === 11) {
      return createVAccount(user?.email, senderId, bvn, 'facebook', 0);
    } else {
      await sendMessage(senderId, {
        text: 'The NIN  you entred is invalid. \n\nPlease enter a valid NIN. \n\nEnter X to cancel.',
      });
    }
  } catch (err) {
    console.error('An error occured in bvnEntred', err);
    await sendMessage(senderId, { text: 'An error ocured please. \nplease enter resposne again' });
  }
}; // end of bvnEntred

export {
  handleUserHasNoVirtualAcount,
  showAccountDetails,
  enteredEmailForAccount,
  handleBvnEntred,
};
