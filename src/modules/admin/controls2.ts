import { Response } from 'express';

import { sendMessage } from '../../bot/modules/send_message';
import sendMessageW from '../../bot/whatsaap_bot/send_message_w';
import BotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';

// function to send messages to users
const sendWhatsappUsersMessage = async (message: string, res: Response) => {
  try {
    let totalSent = 0; // Counter for successful transactions
    let totalFailed = 0; // Counter for failed transactions
    let totalDateOut = 0;
    let batchSize = 100;
    let skip = 0;

    while (true) {
      // Fetch a batch of users
      let users = await WhatsappBotUsers.find().skip(skip).limit(batchSize); //.toArray();

      console.log('users length: ', users.length);
      console.log('skip: ', skip);
      console.log('batchSize: ', batchSize);
      console.log('users: ', users);

      // If no more users, break the loop
      if (users.length === 0) {
        break;
      }

      // Send messages to the fetched users asynchronously
      const results = await Promise.all(
        users.map(async (user) => {
          const canSend = canIsendWhatsappUserMessage(user.lastMessage);
          if (!canSend) return 'outOfDate';

          const isSent = await sendMessageW(user.id, message);
          if (isSent) return 'sent';

          return 'failedToSend';
        })
      );

      // Count successful and failed transactions
      const successfulTransactions = results.filter((isSent) => isSent === 'sent').length;
      const failedTransactions = results.filter((isSent) => isSent === 'failedToSend').length;
      const dateOut = results.filter((isSent) => isSent === 'outOfDate').length;

      totalSent += successfulTransactions;
      totalFailed += failedTransactions;
      totalDateOut += dateOut;

      // Increment the skip for the next batch
      skip += batchSize;
    }
    res.json({ totalSent, totalFailed, totalDateOut });
  } catch (err) {
    console.error('An error occured in send braodCast for whatsapp users: ', err);
    res.send('An error occured in send braodCast for whatsapp users');
  }
};

// function to send messages to users
const sendFacebookUsersMessage = async (message: string, res: Response) => {
  try {
    let totalSent = 0; // Counter for successful transactions
    let totalFailed = 0; // Counter for failed transactions
    let totalDateOut = 0;
    let batchSize = 100;
    let skip = 0;

    while (true) {
      // Fetch a batch of users
      const users = await BotUsers.find().skip(skip).limit(batchSize); //.toArray();

      // If no more users, break the loop
      if (users.length === 0) {
        break;
      }

      // Send messages to the fetched users asynchronously
      const results = await Promise.all(
        users.map(async (user) => {
          const canSend = canIsendWhatsappUserMessage(user.lastMessage);
          if (!canSend) return 'outOfDate';

          const isSent = await sendMessage(user.id, { text: message });
          if (isSent) return 'sent';

          return 'failedToSend';
        })
      );

      // Count successful and failed transactions
      const successfulTransactions = results.filter((isSent) => isSent === 'sent').length;
      const failedTransactions = results.filter((isSent) => isSent === 'failedToSend').length;
      const dateOut = results.filter((isSent) => isSent === 'outOfDate').length;

      totalSent += successfulTransactions;
      totalFailed += failedTransactions;
      totalDateOut += dateOut;

      // Increment the skip for the next batch
      skip += batchSize;
    }

    res.json({ totalSent, totalFailed, totalDateOut });
  } catch (err) {
    console.error('An error occured in send braodCast for facebook users: ', err);
    res.send('An error occured in send braodCast for facebook users');
  }
};

// helper function to check if user whatsapp user can recieve messge
const canIsendWhatsappUserMessage = (lastMessage: any) => {
  const lastMessageDate = new Date(lastMessage);
  const nowDate = new Date();

  const millisecondsIn24Hours = 24 * 60 * 60 * 1000;
  const difference = Math.abs(nowDate.getTime() - lastMessageDate.getTime());
  console.log('time difference in isConversationOpenW : ', difference);

  return difference < millisecondsIn24Hours;
};

export { sendFacebookUsersMessage, sendWhatsappUsersMessage };
