import { Request, Response } from 'express';
import fs from 'fs';
import Transactions from '../models/transactions';
import { sendMessage } from '../bot/modules/send_message';
import { dateFormatter } from './helper_functions';
import handleFirstMonthBonus from './monthly_bonuses';
import creditReferrer from './credit_referrer';
import { updateNetworkStatus } from '../bot/modules/data-network-checker';
import { Mutex } from 'async-mutex';
import Handlebars from 'handlebars';
import axios from 'axios';
import { updateTransactNum } from '../bot/modules/helper_function_2';
import { helpFailedDelivery, helpSuccesfulDelivery } from './deliver-value-helpers';

const transactionMutex = new Mutex(); // mutex for delivering transactions

// function to initiate delvering of values
async function deliverValue(response: any) {
  // Attempt to acquire the lock for the transaction
  const release = await transactionMutex.acquire();
  try {
    const transaction = await Transactions.findOne({ id: response.data.id });
    if (transaction) {
      if (transaction.status === true) {
        if (response.data.meta.bot) {
          try {
            await sendMessage(response.data.meta.senderId, {
              text: `Sorry this transaction has already been delivered \nProduct: ₦${response.data.meta.size} ${response.data.meta.network} data \nTransaction ID: ${response.data.id} \nDate:`,
            });
          } catch (err) {
            console.error(
              'an error occurd trying to send bot response for alredy deliered value in deliverValue',
              err
            );
          }
        }
        return { message: 'Transaction has already been settled' };
      }
    }

    // Proceed with delivery process...
    if (response.data.meta.type === 'data') {
      return deliverData(response);
    } else if (response.data.meta.type === 'airtime') {
      return deliverAirtime(response);
    }
  } finally {
    // Release the lock after processing is done
    release();
  }
}

// function to make data purchase request
async function deliverData(response: any) {
  let options = {
    url: 'https://opendatasub.com/api/data/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(response.data.meta.networkID),
      mobile_number: response.data.meta.phoneNumber,
      plan: Number(response.data.meta.planID),
      Ported_number: true,
    },
  };

  if (process.env.NODE_ENV === 'production')
    return await makePurchaseRequest(response, options, 'data');
  if (process.env.NODE_ENV === 'development')
    return await simulateMakePurchaseRequest(response, true, 'data');
  if (process.env.NODE_ENV === 'staging')
    return await makePurchaseRequest(response, options, 'data');
} // end of deliver value function

// function to make airtime purchase request
async function deliverAirtime(response: any) {
  let options = {
    url: 'https://opendatasub.com/api/topup/',
    headers: {
      Authorization: 'Token ' + process.env.OPENSUB_KEY,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(response.data.meta.networkID),
      amount: Number(response.data.meta.amount),
      mobile_number: response.data.meta.phoneNumber,
      Ported_number: true,
      airtime_type: 'VTU',
    },
  };

  if (process.env.NODE_ENV === 'production')
    return await makePurchaseRequest(response, options, 'airtime');
  if (process.env.NODE_ENV === 'development')
    return await simulateMakePurchaseRequest(response, true, 'airtime');
  if (process.env.NODE_ENV === 'staging')
    return await makePurchaseRequest(response, options, 'airtime');
} // end of deliverAirtime

// function to make product purchase request
async function makePurchaseRequest(response: any, options: any, type: 'data' | 'airtime') {
  try {
    const resp = await axios.post(options.url, options.payload, { headers: options.headers });
    // console.log('response: ', resp.data);

    if (resp.data.Status === 'successful') {
      if (response.data.meta.type === 'data') {
        updateTransactNum(response.data.meta.senderId);
        updateNetworkStatus(response.data.meta.network, true); // updating network status to true
      }
      await helpSuccesfulDelivery(response, resp.data.balance_after, type);
    } else {
      if (response.data.meta.type === 'data')
        updateNetworkStatus(response.data.meta.network, false); // updating network status to false
      throw 'could not deliver data';
    }
  } catch (error) {
    console.log('in make purchase request failed in cacth error block:', error);
    await helpFailedDelivery(response);
  }
} // end of makePurchaseRequest

// function to make product purchase request simulation
async function simulateMakePurchaseRequest(
  response: any,
  condition: boolean,
  type: 'data' | 'airtime'
) {
  try {
    if (condition) {
      updateTransactNum(response.data.meta.senderId);
      await updateNetworkStatus(response.data.meta.network, true);
      return await helpSuccesfulDelivery(response, 6000, type);
    }
    updateNetworkStatus(response.data.meta.network, false);
    throw 'product purchas request not successful';
  } catch (error) {
    console.log('make purchase request simulation failed in cacth error block:', error);
    helpFailedDelivery(response);
  }
} // end of makePurchaserequest simulain

export { deliverValue };
