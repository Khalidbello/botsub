import { Request, Response } from 'express';
import { respondToWebhook } from '../../modules/gateway';
import handleTransferWebhook from '../../modules/transfer_webhook_handler';

const webhook = async (req: Request, res: Response) => {
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
    }

    console.log('btw hook body', payload);

    // check webhook type to detrermine how to process it.
    if (payload.event === 'transfer.completed') {
      // run functionality to complete  user transfer
      handleTransferWebhook(payload.data);
    } else {
      respondToWebhook(payload?.data?.id || payload.id, res, false);
    }
  } catch (err: any) {
    res.status(300).send('an error occured');
    console.error('error in webhook::::::::::::::::::::::::::    value of flag:::::::::   ', flag);
    if (err.response) {
      console.error('Error response:', err.response.data);
    } else if (err.request) {
      console.error('No response received:', err.request);
    } else {
      console.error('Error:', err.message);
    }
  }
};

export default webhook;
