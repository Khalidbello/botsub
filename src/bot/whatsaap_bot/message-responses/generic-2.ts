import WhatsappBotUsers from '../../../models/whatsaap_bot_users';
import { confirmDataPurchaseResponseW } from '../helper_functions';
import sendMessageW from '../send_message_w';
import { cancelTransactionW } from './generic';
import emailValidator from 'email-validator';

// function to handle first email for users  that havent provided their emails
async function handleEnterEmailToProcedWithPurchase(messageObj: any) {
  const senderId = messageObj.from;
  const email = messageObj?.text?.body;

  try {
    if (email.toLowerCase() === 'X') return cancelTransactionW(senderId, false);

    const user = await WhatsappBotUsers.findOne({ id: senderId });

    if (emailValidator.validate(email)) {
      await sendMessageW(senderId, 'Email saved \nYou can change email when ever you want');
      await WhatsappBotUsers.updateOne(
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
      await confirmDataPurchaseResponseW(senderId, user, null);
      return;
    } else {
      await sendMessageW(
        senderId,
        'The email format you entered is invalid \nPlease enter a valid email. \n\nEnter X to cancel.'
      );
    }
  } catch (err) {
    console.error('An error occured in send handleEnterEmailToProcedWithPurchase', err);
    await sendMessageW(senderId, 'Something went wrong please enter respons again.');
  }
} // end of sendEmailEnteredResponse

export { handleEnterEmailToProcedWithPurchase };
