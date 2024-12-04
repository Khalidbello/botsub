// modules to hold control ralated request handler
import { Request, Response } from 'express';
import fs from 'fs';
import ReportedIssues from '../../models/reported-issues';
import Transactions from '../../models/transactions';
import { sendMessage } from '../../bot/modules/send_message';
import axios from 'axios';
import { updateNetworkStatus } from '../../bot/modules/data-network-checker';
import BotUsers from '../../models/fb_bot_users';
import { dateFormatter } from '../helper_functions';

async function getNetworkStatus(req: Request, res: Response) {
  // Read the file content
  const fileContent = await fs.promises.readFile('files/data-network-status.json', 'utf-8');
  let data = JSON.parse(fileContent);
  res.json(data);
}

async function setNetworkStatus(req: Request, res: Response) {
  const { network, status } = req.body;
  await updateNetworkStatus(network, status);
  res.json({ message: `${network} update to ${status}` });
}

async function sendIssueResponse(req: Request, res: Response) {
  const { id, platformType, response, reporterId } = req.body;
  console.log(reporterId, 'in send issue response..............');
  if (platformType === 'facebook') {
    await sendMessage(reporterId, { text: `issue id: ${id} \n${response}` });
  }

  res.json({ ok: 'ooook' });
}

async function fetchIssues(req: Request, res: Response) {
  const pagging = parseInt(req.params.pagging);
  const size = parseInt(req.params.size);

  const issues = await ReportedIssues.find({ status: true })
    .skip(size * pagging)
    .limit(size);

  console.log('issues........', issues);
  res.json(issues);
}

// function to close issue
async function closeIssue(req: Request, res: Response) {
  const issueId = req.params.issueId;
  const senderId = req.params.reporterId;
  const issue = req.body.issue;
  const date = new Date();

  await ReportedIssues.updateOne({ id: issueId }, { status: false });
  await BotUsers.updateOne({ id: senderId }, { $set: { botResponse: true } });

  res.json({ ok: 'isseu successfully closed' });

  try {
    sendMessage(senderId, {
      text: `Your issue with with ID: ${issueId} \n\nIssue: ${issue}.... \n\n has been closed. \n ${dateFormatter(
        date
      )}`,
    });
  } catch (err) {
    console.log('An error occured sending issue closed response to user...');
  }
}

// functio to fetch pending transactions
async function fetchPedndingTransactions(pagging: number, size: number, res: Response) {
  const pendingTransations = await Transactions.find({ status: false })
    .skip(pagging * size)
    .limit(size);

  console.log('in fetch pending transCTIONSSS...........', pendingTransations);
  res.json(pendingTransations);
}

// function to carry out transaction retry
async function retryTransaction(transactionId: string, txRef: string, res: Response) {
  const response = await axios.get(
    `https://${process.env.HOST}/gateway/confirm?retry=Retry&transaction_id=${transactionId}&tx_ref=${txRef}&retry=true`
  );
  const data = await response.data;

  if (data.status === 'successful') return res.json({ status: true });

  res.status(403).json({ error: 'something went wrong' });
} // end of retryFailedHelper

// function to ssettle transaction
async function settleTransaction(transactionId: string, senderId: string, res: Response) {
  await Transactions.updateOne({ id: transactionId }, { $set: { status: true } });

  try {
    sendMessage(senderId, {
      text: `Transaction with transactionId ${transactionId} successfully settled.`,
    });
  } catch (err) {
    console.error('error trying to send transaction setled message..', err);
  }

  res.json({ status: true });
}

export {
  getNetworkStatus,
  setNetworkStatus,
  sendIssueResponse,
  fetchIssues,
  closeIssue,
  fetchPedndingTransactions,
  retryTransaction,
  settleTransaction,
};
