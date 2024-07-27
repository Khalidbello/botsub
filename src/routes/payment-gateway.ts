// module for things related to payment gate ways
import { Router, Request, Response, NextFunction } from "express";
import confirmTransaction from "../controller/gateway/confrim-purchase";
import webhook from "../controller/gateway/webhook";
import generateOneTimeAccount from "../controller/gateway/generate-one-time-account";
const paymentGateWayRouter = Router();



// route for confirming payment and calling payment deliver function
paymentGateWayRouter.get('/confirm', async (req: Request, res: Response) => confirmTransaction(req, res)); //end of confirm payment routes

// route to generate one time account number for payment
paymentGateWayRouter.post('/transfer-account', async (req, res) => generateOneTimeAccount(req, res)); // end of transfer-account route

// route for flutterwave webhook
paymentGateWayRouter.post('/webhook', async (req, res) => webhook(req, res)); // end of flw webhook 


paymentGateWayRouter.get('/test', async (req: Request, res: Response) => {
  // Install with: npm i flutterwave-node-v3
  //await fundWallet();
  res.status(200);
});

export default paymentGateWayRouter;