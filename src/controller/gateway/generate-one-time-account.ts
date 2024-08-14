import { Request, Response } from "express";
import { generateRandomString } from "../../modules/helper_functions";
const FlutterWave = require('flutterwave-node-v3');


const generateOneTimeAccount = async (req: Request, res: Response) => {
    const datas = req.body;
    console.log('transfer acc boddy', datas);
    try {
        let payload;
        if (datas.transactionType == 'data') {
            payload = {
                network: datas.network,
                planID: datas.planID,
                networkID: datas.networkID,
                phoneNumber: datas.phoneNumber,
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
                phoneNumber: datas.phoneNumber,
                bot: datas.bot,
                senderId: datas.senderId,
                firstPurchase: datas.firstPurchase,
            };
        };
        console.log('bot purchase payload', payload);

        const details = {
            tx_ref: generateRandomString(15),
            amount: datas.price,
            email: datas.email,
            fullname: datas.email,
            currency: 'NGN',
            meta: payload,
        };

        const flw = new FlutterWave(process.env.FLW_PB_KEY, process.env.FLW_SCRT_KEY);
        const response = await flw.Charge.bank_transfer(details);
        console.log('transfer account details', response);
        res.json(response);
    } catch (err) {
        console.log('transfer accoun err', err);
        res.json({ status: 'error' });
    };
};



export default generateOneTimeAccount;