// module for things related to payment gate ways
import { Router } from 'express';
import express from 'express';
import webhook from '../controller/gateway/webhook';
import {
  handleTransferCompleted,
  handleTransferFailed,
  handleTransferReversed,
} from '../modules/user_withdrwals_call_back';
const paymentGateWayRouter = Router();

// route for flutterwave webhook
paymentGateWayRouter.post('/webhook', async (req, res) => webhook(req, res)); // end of flw webhook

// Webhook route
paymentGateWayRouter.post('/flutterwave/transfer-webhook', express.json(), async (req, res) => {
  try {
    // Verify the webhook signature
    const signature = req.headers['verif-hash'] as string;
    if (!signature || signature !== process.env.FLW_H) {
      return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    console.log('Received Flutterwave webhook:', event);

    // Handle different event types
    switch (event.event) {
      case 'transfer.completed':
        await handleTransferCompleted(event.data);
        break;
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
      case 'transfer.reversed':
        await handleTransferReversed(event.data);
        break;
      default:
        console.log('Unhandled event type:', event.event);
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Error processing webhook');
  }
});
export default paymentGateWayRouter;
