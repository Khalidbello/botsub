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
import { carryOutNonVAccount } from '../gateway';
const Flutterwave = require('flutterwave-node-v3');

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

  try {
    await ReportedIssues.updateOne({ id: issueId }, { status: false }); // set issue to false
    await BotUsers.updateOne({ id: senderId }, { $set: { botResponse: true } }); // activate bot auto response

    res.json({ ok: 'isseu successfully closed' });

    sendMessage(senderId, {
      text: `Your issue with with ID: ${issueId} \n\nIssue: ${issue.substring(
        0,
        15
      )}.... \n\n has been closed.  \nFor any complains please kindly report a new issue thank you. \nBotSub Cares. \n\n ${dateFormatter(
        date
      )}`,
    });
  } catch (err) {
    console.log('An error occured in closeIssue: ', err);
  }
}

// functio to fetch pending transactions
async function fetchPedndingTransactions(pagging: number, size: number, res: Response) {
  const pendingTransations = await Transactions.find({ status: 'failed' })
    .skip(pagging * size)
    .limit(size);

  console.log('in fetch pending transCTIONSSS...........', pendingTransations);
  res.json(pendingTransations);
}

// function to carry out transaction retry
async function retryTransaction(transactionId: string, txRef: string, res: Response) {
  const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

  try {
    const response = await flw.Transaction.verify({ id: transactionId }); // check again if transaction is succesful

    if (response.data.status.toLowerCase() !== 'successful') {
      console.log('transaction not successfully carried out: in wallet top up');
      return res.json({
        status: 'failed',
        message: 'Payment for transaction not successfully recieved',
      });
    }

    const result = await carryOutNonVAccount(response);
    res.json(result);
  } catch (err) {
    console.error('An error occured in retry retryTransaction: ');
  }
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
