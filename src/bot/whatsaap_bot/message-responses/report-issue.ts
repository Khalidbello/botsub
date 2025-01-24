import WhatsaapBotUsers from '../../../models/whatsaap_bot_users';
import ReportedIssues from '../../../models/reported-issues';
import { generateRandomString } from '../../../modules/helper_functions';
import sendMessageW from '../send_message_w';
import { cancelTransactionW } from './generic';

const handleReportIssueW = async (messaageObj: any) => {
  const senderId = messaageObj.from;

  try {
    sendMessageW(
      senderId,
      'Please enter a detailed description of your issue. \n\nEnter X to cancel.'
    );
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: 'enterIssue' },
      }
    );
  } catch (err) {
    console.error('An error occured in handleReportIssueW', err);
    sendMessageW(
      senderId,
      'An error occured. \nPlease enter response again. \n\nEnter X to cancel.'
    );
  }
};

// function to handle issue reporting
const handleReportIssueResponseW = async (messaageObj: any) => {
  const senderId = messaageObj.from;
  const message = messaageObj?.text?.body;
  const date = new Date();
  const id = generateRandomString(10);

  try {
    if (!message) return await sendMessageW(senderId, 'Sorry issue report can not be empty.');

    if (message.toLowerCase() === 'x') {
      await sendMessageW(senderId, 'Issue report has beeen cancled');
      return cancelTransactionW(senderId, false);
    }

    const issue = new ReportedIssues({
      id,
      description: message,
      date,
      reporterId: senderId,
      platform: 'whatsapp',
      status: true,
    });

    await issue.save();
    await sendMessageW(
      senderId,
      `Your issue has been directed to the BotSub support team. \n
      We apologize for any inconvenience caused. \n\n
      you will receive a response within the next 5 minutes.`
    );
    await WhatsaapBotUsers.updateOne(
      { id: senderId },
      {
        $set: { nextAction: null },
      }
    );
  } catch (err) {
    console.error('An error occured in report issue function', err);
    await sendMessageW(senderId, 'An error occured. \nPlease enter response again.');
  }
}; // end of report issue function

export { handleReportIssueW, handleReportIssueResponseW };
