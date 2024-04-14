// modules to hold control ralated request handler
const fsP = require('fs').promises;


async function getNetworkStatus(req, res) {
    // Read the file content
    const fileContent = await fsP.readFile('files/data-network-status.json', 'utf-8');
    let data = JSON.parse(fileContent);
    res.json(data);
};

async function setNetworkStatus(req, res) {
    const { updateNetworkStatus } = require('./../../bot_modules/data-network-checker.js');

    const {network, status} = req.body;
    await updateNetworkStatus(network, status);
    res.json({ message: `${network} update to ${status}` });
};


module.exports = {
    getNetworkStatus,
    setNetworkStatus,
};