// module for things related to payment gate ways

const flutterwave = require('flutterwave-node-v3');

const sendMessage = require('./../bot_modules/send_message.js');

const { Router } = require('express');

const {
  checkIfPreviouslyDelivered,
  returnPreviouslyDelivered,
  checkRequirementMet,
  refundPayment,
  generateRandomString,
  fundWallet,
  sleep,
} = require('./../modules/helper_functions.js');

const deliverValue = require('./../modules/deliver-value.js');

//import nodemailer from "nodemailer";

const axios = require('axios');

const router = Router();



// route for confirming payment and calling payment deliver function

router.get('/confirm', async (req, res) => {
  //console.log(req.query.webhook);
  console.log('req body', req.query);
  if (!req.query.transaction_id || !req.query.tx_ref) {
    return res.json({ status: 'error', message: 'query parameters missing' });
  };
  
  const flw = new flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
  const response = await flw.Transaction.verify({ id: req.query.transaction_id }).catch((err) => {
    return res.json({ status: 'error', message: 'failed to check transaction', data: err });
  }); // end of check transaction call

  console.log('transaction details', response);
  if (response.status == 'error') {
    return res.json({ status: 'error', message: 'error fetching transaction' });
  };
  console.log('transaction details', response);

  // calling function to check if transaction has ever beign made before
  const previouslyDelivered = await checkIfPreviouslyDelivered(
    req.query.transaction_id,
    req.query.tx_ref
  );

  if (previouslyDelivered) {
    let details = returnPreviouslyDelivered(response);
    res.json({ status: 'settled', data: details });

    if (response.data.meta.bot) {
      console.log('bot feedback for already delivered transaction');
      await sendMessage(response.data.meta.senderId, {
        text: `Sorry thid transaction has already been deliverd \nProduct: ₦${response.data.meta.size} ${response.data.meta.network} data \nTransaction ID: ${response.data.id} \nDate:`,
      });
    };
    return
  };

  // calling function to ccheck if all transaction requirement were met
  let requirementMet = await checkRequirementMet(response, req, res);
  if (requirementMet.status) {
    return deliverValue(response, req, res, requirementMet);
    //return res.json({status:"success", message:"requirement met", data: requirementMet.type});
  };

  console.log('requirement status', requirementMet);
  // calling refund payment if proper conditions were not met
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

router.post('/webhook', (req, res) => {
  console.log('am in webhook');
  // If you specified a secret hash, check for the signature
  const mySecret = process.env.FLW_H;
  const signature = req.headers['verif-hash'];

  if (!signature || signature != mySecret) {
    // This request isn't from Flutterwave; discard
    console.log('in webhook');
    return res.status(401).end();
  };
  
  const payload = req.body;
  const host = req.hostname;

  console.log('btw hook body', payload);

  axios
    .get(
      `https://${host}/gateway/confirm?transaction_id=${payload.id || payload.data.id}&tx_ref=${payload.txRef || payload.data.tx_ref}&webhook=webhooyouu`
    )
    .then((response) => console.log('webhook response', response.data))
    .catch((error) => console.error('webhook error', error));
  console.log('end hook');
  
  res.status(200).end();
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

  request(options, function(error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });
  res.status(200);
});


module.exports = router;
