// function to simulate buy data
async function simulateBuyData(response, res, req, condition) {
  try {
    if (condition) {
        addToDelivered(req);
        // calling function to send mail and json response object
        sendSuccessfulResponse(response, res);

        if (response.data.meta.bot) {
          const date = new Date() //new Date(response.data.customer.created_at);
          const nigeriaTimeString = dateFormatter(date);

          await sendMessage(response.data.meta.senderId, {
            text: `Transaction Succesful \nProduct: ₦${response.data.meta.size} ${response.data.meta.network} data\nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`,
          });
        };

        if (parseInt(body.balance_after) <= 5000)
          fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
        return;
    } else {
        console.log('Actual buy data failed');
        helpFailedDelivery(req, response);
    };
  } catch(error) {
    console.log('Actual buy data failed in cacth error block:', error);
    helpFailedDelivery(req, response);
  };
}; // end of simulateBuyData



// function to buy airtime
async function actualBuyAirtime(response, res, req, options) {
  request(options, async (error, _, body) => {
    if (error) {
      console.log(error);
      return res.send(error);
    };
    console.log('bodyof request ', body);

    // to do dependent transaction status
    if (body.Status === 'successful') {
      helpSuccesfulDelivery(req, res, response);

      return;
    } else {
      addToFailedToDeliver(req);
      sendFailedToDeliverResponse(response, res);
      if (response.data.meta.bot) {
        const date = new Date() //new Date(response.data.customer.created_at);
        const nigeriaTimeString = dateFormatter(date);

        await sendMessage(response.data.meta.senderId, {
          text: `Sorry your transaction is pending \nProduct: ₦${response.data.meta.amount} ${response.data.meta.network} airtime\nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`,
        });
        await sendTemplate(
          response.data.meta.senderId,
          retryFailedTemplate(req.query.transaction_id, req.query.tx_ref)
        );
      };
    };
  });
}; // end of actualBuyAirtime




// function to simulate buy airtime
async function simulateBuyAirtime(response, res, req, success) {
  if (success) {
    addToDelivered(req);
    // calling function to send mail and json response object
    sendSuccessfulResponse(response, res);

    if (response.data.meta.bot) {
      const date = new Date(response.data.customer.created_at);
      const nigeriaTimeString = dateFormatter(date);

      await sendMessage(response.data.meta.senderId, {
        text: `Transaction Succesful \nProduct: ₦${response.data.meta.amount} ${response.data.meta.network} airtime\nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`,
      });
    };

    if (parseInt(body.balance_after) <= 5000)
      fundWallet('035', process.env.WALLET_ACC_NUMBER, parseInt(process.env.WALLET_TOPUP_AMOUNT));
    return;
  } else {
    addToFailedToDeliver(req);
    sendFailedToDeliverResponse(response, res);
    if (response.data.meta.bot) {
      const date = new Date(response.data.customer.created_at);
      const nigeriaTimeString = dateFormatter(date);

      await sendMessage(response.data.meta.senderId, {
        text: `Sorry your transaction is pending \nProduct: ₦${response.data.meta.amount} ${response.data.meta.network} airtime\nTransaction ID: ${response.data.id} \nDate: ${nigeriaTimeString}`,
      });
      await sendTemplate(
        response.data.meta.senderId,
        retryFailedTemplate(req.query.transaction_id, req.query.tx_ref)
      );
    };
  };
}; // end of buy airtime
