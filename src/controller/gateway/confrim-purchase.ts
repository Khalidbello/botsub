import { Request, Response } from 'express';
import { checkcheckRequirement, refundPayment } from '../../modules/helper_functions';
import { deliverValue } from '../../modules/deliver-value';
import { sendMessage } from '../../bot/modules/send_message';
const FlutterWave = require('flutterwave-node-v3');

const confirmTransaction = async (req: Request, res: Response) => {
  //console.log('node environment', process.env.NODE_ENV);
  console.log('req body', req.query);
  if (!req.query.transaction_id || !req.query.tx_ref)
    return res.json({ status: 'error', message: 'query parameters missing' }).status(404);

  const flw = new FlutterWave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);

  const response = await flw.Transaction.verify({ id: req.query.transaction_id }).catch(
    (err: Error) => {
      return res.json({ status: 'error', message: 'failed to check transaction', data: err });
    }
  ); // end of check transaction call

  console.log('transaction details', response);

  if (response.status === 'error')
    return res.json({ status: 'error', message: 'error fetching transaction' });

  // calling function to check if all transaction requirement were met
  let checkRequirement = await checkcheckRequirement(response, req);
  if (checkRequirement.status) return deliverValue(response, false);

  // @ts-expect-error calling refund payment if proper conditions were not met
  const finalResp = await refundPayment(response, checkRequirement.price);

  if (response.data.meta.bot) {
    await sendMessage(response.data.meta.senderId, {
      text: `Sorry your Transaction failed, Payment will be refunded. \nTransaction ID: ${response.data.id}`,
    });
  }

  return res.json(finalResp);
};

export default confirmTransaction;
