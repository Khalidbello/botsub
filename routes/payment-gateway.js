// module for things related to payment gate ways

const flutterwave = require('flutterwave-node-v3');
const { Router } = require('express');
const {
  checkIfPreviouslyDelivered,
  returnPreviouslyDelivered,
  checkRequirementMet,
  refundPayment,
  generateRandomString,
  fundWallet
} = require('./../modules/helper_functions.js');
const deliverValue = require('./../modules/deliver-value.js');
const { respondToWebhook } = require('./../modules/gateway.js');
const sendMessage = require('./../bot_modules/send_message.js');
const router = Router();



// route for confirming payment and calling payment deliver function
router.get('/confirm', async (req, res) => {
  //console.log('node environment', process.env.NODE_ENV);
  console.log('req body', req.query);
  if (!req.query.transaction_id || !req.query.tx_ref) return res.json({ status: 'error', message: 'query parameters missing' }).status(404);

  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

  const response = await flw.Transaction.verify({ id: req.query.transaction_id })
    .catch((err) => {
      return res.json({ status: 'error', message: 'failed to check transaction', data: err });
    }); // end of check transaction call

  console.log('transaction details', response);

  if (response.status === 'error') return res.json({ status: 'error', message: 'error fetching transaction' });

  // calling function to check if transaction has ever beign made before
  const previouslyDelivered = await checkIfPreviouslyDelivered(req.query.transaction_id);
  if (previouslyDelivered) {
    let details = returnPreviouslyDelivered(response);
    res.json({ status: 'settled', data: details });

    if (response.data.meta.bot) {
      console.log('bot feedback for already delivered transaction');
      await sendMessage(response.data.meta.senderId, {
        text: `Sorry this transaction has already been deliverd \nProduct: ₦${response.data.meta.size} ${response.data.meta.network} data \nTransaction ID: ${response.data.id} \nDate:`,
      });
    };
    return
  };

  // calling function to ccheck if all transaction requirement were met
  let requirementMet = await checkRequirementMet(response, req);
  if (requirementMet.status) return deliverValue(response, req, res, requirementMet);

  console.log('requirement status', requirementMet);
  //calling refund payment if proper conditions were not met
  const finalResp = await refundPayment(response, requirementMet.price);
  console.log('refunding payment', finalResp);

  if (response.data.meta.bot) {
    await sendMessage(response.data.meta.senderId, {
      text: `Sorry your Transaction failed, Payment will be refunded. \nTransaction ID: ${response.data.id}`,
    });
  };
  return res.json(finalResp);
}); //end of confirm payment routes



// route for initialing account for payment to be made to
// Install with: npm i flutterwave-node-v3

router.post('/transfer-account', async (req, res) => {
  const datas = req.body;
  console.log('transfer acc boddy', datas);
  try {
    let payload;
    if (datas.transactionType == 'data') {
      payload = {
        network: datas.network,
        planID: datas.planID,
        networkID: datas.networkID,
        number: datas.phoneNumber,
        index: datas.index,
        type: datas.transactionType,
        size: datas.size,
        bot: datas.bot,
        senderId: datas.senderId,
        firstPurchase: datas.firstPurchase
      };
    } else if (datas.transactionType == 'airtime') {
      payload = {
        network: datas.network,
        networkID: datas.networkID,
        amount: datas.price,
        type: datas.transactionType,
        number: datas.phoneNumber,
        bot: datas.bot,
        senderId: datas.senderId,
        firstPurchase: datas.firstPurchase,
      };
    };
    console.log('bot purchase payload', payload);

    const details = {
      tx_ref: generateRandomString(),
      amount: datas.price,
      email: datas.email,
      fullname: datas.email,
      currency: 'NGN',
      meta: payload,
    };

    const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
    const response = await flw.Charge.bank_transfer(details);
    console.log('transfer account details', response);
    res.json(response);
  } catch (err) {
    console.log('transfer accoun err', err);
    res.json({ status: 'error' });
  };
}); // end of transfer-account route



// route for flutterwave webhook
router.post('/webhook', async (req, res) => {
  const payload = req.body;
  const host = req.hostname;
  let flag; // variable to determine how webhook would be handld i.e wallet funding or direct payme
  try {
    console.log('am in webhook');
    const signature = req.headers['verif-hash'];

    if (!signature || signature != process.env.FLW_H) {
      // This request isn't from Flutterwave; discard
      console.log('webhook rejectd not from a trusted source');
      return res.status(401).end();
    };

    console.log('btw hook body', payload);

    respondToWebhook(payload, res, req.hostname);
  } catch (err) {
    res.status(300).send('an error occured');
    consle.log('error in webhook::::::::::::::::::::::::::    value of flag:::::::::   ', flag);
    if (err.response) {
      console.log('Error response:', err.response.data);
    } else if (err.request) {
      console.log('No response received:', err.request);
    } else {
      console.log('Error:', err.message);
    };
  };
}); // end of flw webhook 


router.get('/test', async (req, res) => {
  // Install with: npm i flutterwave-node-v3
  await fundWallet();
  res.status(200);
});



router.get('/test-2', async () => {
  var request = require('request');
  var options = {
    'method': 'GET',
    'url': 'https://api.flutterwave.com/v3/banks/NG',
    'headers': {
      'Authorization': 'Bearer FLWSECK_TEST-SANDBOXDEMOKEY-X'
    }
  };

  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });
  res.status(200);
});


module.exports = router;