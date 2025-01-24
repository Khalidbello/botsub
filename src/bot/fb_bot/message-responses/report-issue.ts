import BotUsers from '../../../models/fb_bot_users';
import ReportedIssues from '../../../models/reported-issues';
import { generateRandomString } from '../../../modules/helper_functions';
import { sendMessage } from '../../modules/send_message';
import { cancelTransaction } from './generic';

const handleReportIssue = async (event: any) => {
  const senderId = event.sender.id;

  try {
    sendMessage(senderId, {
      text: 'Please enter a detailed description of your issue. \n\nEnter X to cancel.',
    });
    await BotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: 'enterIssue' },
      }
    );
  } catch (err) {
    console.error('An error occured in handleReportIssue', err);
    sendMessage(senderId, {
      text: 'An error occured. \nPlease enter response again. \n\nEnter X to cancel.',
    });
  }
};

// function to handle issue reporting
const handleReportIssueResponse = async (event: any) => {
  const senderId = event.sender.id;
  const message = event.message.text.trim();
  const date = new Date();
  const id = generateRandomString(10);

  try {
    if (!message)
      return await sendMessage(senderId, { text: 'Sorry issue report can not be empty.' });

    if (message.toLowerCase() === 'x') {
      await sendMessage(senderId, { text: 'Issue report has beeen cancled' });
      return cancelTransaction(senderId, false);
    }

    const issue = new ReportedIssues({
      id,
      description: message,
      date,
      reporterId: senderId,
      platform: 'facebook',
      status: true,
    });

    await issue.save();
    await sendMessage(senderId, {
      text: `Your issue has been directed to the BotSub support team. \n
      We apologize for any inconvenience caused. \n\n
      you will receive a response within the next 5 minutes.`,
    });
    await BotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
  } catch (err) {
    console.error('An error occured in report issue function', err);
    await sendMessage(senderId, { text: 'An error occured. \nPlease enter response again.' });
  }
}; // end of report issue function

export { handleReportIssue, handleReportIssueResponse };
