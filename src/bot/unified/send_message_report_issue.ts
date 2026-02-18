import FBBotUsers from '../../models/fb_bot_users';
import ReportedIssues from '../../models/reported-issues';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { generateRandomString } from '../../modules/helper_functions';
import { sendMessage } from '../fb_bot/modules/send_message';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { cancelTransaction } from './utility_2';

/**
 * Platform Configuration Resolver
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  label: platform === 'FB' ? 'facebook' : 'whatsapp',
});

/**
 * Initial command to start the issue reporting process
 *
 */
const handleReportIssue = async (senderId: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);

  try {
    await config.send(
      senderId,
      'Please enter a detailed description of your issue. \n\nEnter X to cancel.'
    );
    await config.model.updateOne({ id: senderId }, { $set: { nextAction: 'enterIssue' } });
  } catch (err) {
    console.error(`Error in handleReportIssue [${platform}]:`, err);
    await config.send(
      senderId,
      'An error occurred. \nPlease enter response again. \n\nEnter X to cancel.'
    );
  }
};

/**
 * Handles the user's text response (the actual issue description)
 */
const handleReportIssueResponse = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA'
) => {
  const config = getPlatformConfig(platform);
  const date = new Date();
  const issueId = generateRandomString(20);

  try {
    const issueDescription = message?.trim();

    if (!issueDescription) {
      return await config.send(senderId, 'Sorry, issue report cannot be empty.');
    }

    if (issueDescription.toLowerCase() === 'x') {
      await config.send(senderId, 'Issue report has been canceled.');
      return cancelTransaction(senderId, platform, true);
    }

    const issue = new ReportedIssues({
      id: issueId,
      description: issueDescription,
      date,
      reporterId: senderId,
      platform: config.label,
      status: true,
    });

    await issue.save();

    await config.send(
      senderId,
      `Your issue has been directed to the BotSub support team. \nWe apologize for any inconvenience caused. \n\nyou will receive a response within the next 5 minutes.`
    );

    await config.model.updateOne({ id: senderId }, { $set: { nextAction: null } });
  } catch (err) {
    console.error(`Error in handleReportIssueResponse [${platform}]:`, err);
    await config.send(senderId, 'An error occurred. \nPlease enter response again.');
  }
};

export { handleReportIssue, handleReportIssueResponse };
