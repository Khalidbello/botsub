// module for things related to payment gate ways
import { Router } from 'express';
import express from 'express';
import webhook from '../controller/gateway/webhook';

const paymentGateWayRouter = Router();

// route for flutterwave webhook
paymentGateWayRouter.post('/webhook', async (req, res) => webhook(req, res)); // end of flw webhook

export default paymentGateWayRouter;
