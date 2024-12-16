import BotUsers from '../../models/fb_bot_users';
import { confirmDataPurchaseResponse } from '../modules/buy-data';
import { sendMessage } from '../modules/send_message';
import { cancelTransaction } from './generic';
import emailValidator from 'email-validator';

// function to handle first email for users  that havent provided their emails
async function handleEnterEmailToProcedWithPurchase(event: any) {
  const senderId = event.sender.id;
  const email = event.message.text.trim();

  try {
    if (email.toLowerCase() === 'X') return cancelTransaction(senderId, true);

    const user = await BotUsers.findOne({ id: senderId });

    if (emailValidator.validate(email)) {
      await sendMessage(senderId, {
        text: 'Email saved \nYou can change email when ever you want',
      });
      await BotUsers.updateOne(
        { id: senderId },
        {
          $set: {
            email: email,
            nextAction: 'confirmProductPurchase',
          },
        },
        { upsert: true }
      );

      if (user) user.email = email;
      await confirmDataPurchaseResponse(senderId, user, null);
      return;
    } else {
      const response = {
        text: 'The email format you entered is invalid \nPlease enter a valid email. \n\nEnter X to cancel.',
      };
      await sendMessage(senderId, response);
    }
  } catch (err) {
    console.error('An error occured in send handleEnterEmailToProcedWithPurchase', err);
    await sendMessage(senderId, { text: 'Something went wrong please enter respons again.' });
  }
} // end of sendEmailEnteredResponse

export { handleEnterEmailToProcedWithPurchase };
