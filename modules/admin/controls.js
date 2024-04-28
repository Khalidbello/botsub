// modules to hold control ralated request handler
const fsP = require('fs').promises;
const ReportedIssues = require('./../../models/reported-issues.js');
const Transactons = require('./../../models/transactions.js');
const sendMessage = require('./../../bot_modules/send_message.js');
const axios = require('axios');


async function getNetworkStatus(req, res) {
    // Read the file content
    const fileContent = await fsP.readFile('files/data-network-status.json', 'utf-8');
    let data = JSON.parse(fileContent);
    res.json(data);
};

async function setNetworkStatus(req, res) {
    const { updateNetworkStatus } = require('./../../bot_modules/data-network-checker.js');

    const { network, status } = req.body;
    await updateNetworkStatus(network, status);
    res.json({ message: `${network} update to ${status}` });
};


async function sendIssueResponse(req, res) {
    const { id, platformType, response, reporterId } = req.body;
    console.log(reporterId, 'in send issue response..............');
    if (platformType === 'facebook') {
        await sendMessage(reporterId, { text: `issue id: ${id} \n${response}` });
    };

    res.json({ ok: 'ooook' });
}


async function fetchIssues(req, res) {
    const pagging = parseInt(req.params.pagging);
    const size = parseInt(req.params.size);

    const issues = await ReportedIssues.find({ status: true }).skip(size * pagging).limit(size);

    console.log('issues........', issues);
    res.json(issues);
};



// function to close issue
async function closeIssue(req, res) {
    const issueId = req.params.issueId;
    await ReportedIssues.findOneAndUpdate(
        { id: issueId },
        { status: false }
    );
    res.json({ ok: 'isseu successfully closed' })
};


// functio to fetch pending transactions
async function fetchPedndingTransactions(pagging, size, res) {
    const pendingTransations = await Transactons.find({ status: false }).skip(pagging * size).limit(size);

    console.log('in fetch pending transCTIONSSS...........', pendingTransations);
    res.json(pendingTransations)
};


// function to carry out transaction retry
async function retryTransaction(transactionId, txRef, res) {
    const response = await axios.get(
        `https://${process.env.HOST}/gateway/confirm?retry=Retry&transaction_id=${transactionId}&tx_ref=${txRef}&retry=true`
    );
    const data = await response.data;

    if (data.status === 'successful') return res.json({ status: true });

    res.status(403).json({ error: 'something went wrong' });
}; // end of retryFailedHelper



// function to ssettle transaction
async function settleTransaction(transactionId, senderId, res) {
    await Transactons.updateOne(
        { id: transactionId },
        { $set: { status: true } }
    );

    try {
        sendMessage(senderId, { text: `Transaction with transactionId ${transactionId} successfully settled.` })
    } catch (err) { console.log('error trying to send transaction setled message..', err) }

    res.json({ status: true });
}


module.exports = {
    getNetworkStatus,
    setNetworkStatus,
    sendIssueResponse,
    fetchIssues,
    closeIssue,
    fetchPedndingTransactions,
    retryTransaction,
    settleTransaction
};