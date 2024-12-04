const Flutterwave = require('flutterwave-node-v3');

// fucnton to refund transacions
const refundTransaction = async (transactionId: number, amount: number, note: string) => {
  try {
    const flw = new Flutterwave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

    const response = await flw.Transaction.refund({
      id: transactionId,
      amount: amount,
      comment: note,
    });

    console.log('refund resposne', response);
    if ((response.status = true)) return true;

    return false;
  } catch (err) {
    console.error('Error occured in initating refund in refundTransaction', err);
    return false;
  }
};

export default refundTransaction;
