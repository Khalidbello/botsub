import Transactions from '../models/transactions';
import { sendMessage } from '../bot/modules/send_message';
import { updateNetworkStatus } from '../bot/modules/data-network-checker';
import { Mutex } from 'async-mutex';
import axios from 'axios';
import { updateTransactNum } from '../bot/modules/helper_function_2';
import { helpFailedDelivery, helpSuccesfulDelivery } from './deliver-value-helpers';
import { setAutoRetryTrue } from '../routes/admin';

const transactionMutex = new Mutex(); // mutex for delivering transactions

// function to initiate delvering of values
const deliverValue = async (response: any): Promise<{ status: boolean; message: string }> => {
  // Attempt to acquire the lock for the transaction
  const release = await transactionMutex.acquire();
  try {
    const transaction = await Transactions.findOne({ id: response.data.id });
    if (transaction?.status === 'delivered') {
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
      return { status: true, message: 'Transaction has already been settled' };
    }

    // Proceed with delivery process...
    if (response.data.meta.type === 'data') {
      return deliverData(response);
    } else if (response.data.meta.type === 'airtime') {
      return deliverAirtime(response);
    }

    return { status: false, message: 'Transaction type not specified.....' };
  } finally {
    // Release the lock after processing is done
    release();
  }
};

// function to make data purchase request
const deliverData = (response: any): Promise<{ status: boolean; message: string }> => {
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

  if (process.env.NODE_ENV === 'production') return makePurchaseRequest(response, options, 'data');
  if (process.env.NODE_ENV === 'staging') return makePurchaseRequest(response, options, 'data');

  // if not production or staging then it is testing.........
  return simulateMakePurchaseRequest(response, true, 'data');
}; // end of deliver value function

// function to make airtime purchase request
const deliverAirtime = (response: any): Promise<{ status: boolean; message: string }> => {
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
    return makePurchaseRequest(response, options, 'airtime');
  if (process.env.NODE_ENV === 'staging') return makePurchaseRequest(response, options, 'airtime');

  // if  not staging og production then run as development
  return simulateMakePurchaseRequest(response, true, 'airtime');
}; // end of deliverAirtime

// function to make product purchase request
const makePurchaseRequest = async (
  response: any,
  options: any,
  type: 'data' | 'airtime'
): Promise<{ status: boolean; message: string }> => {
  let resp;
  try {
    resp = await axios.post(options.url, options.payload, { headers: options.headers });
    console.log('response: ', resp.data);

    if (resp.data.Status === 'successful') {
      if (response.data.meta.type === 'data') {
        await updateTransactNum(response.data.meta.senderId);
        await updateNetworkStatus(response.data.meta.network, true); // updating network status to true
      }

      await helpSuccesfulDelivery(response, resp.data.balance_after, type);
      return { status: true, message: 'Value succesfully delivered' };
    } else {
      if (response.data.meta.type === 'data')
        updateNetworkStatus(response.data.meta.network, false); // updating network status to false
      console.log('Resp in makePurchaseRequest: ', resp);
      throw 'Could not deliver value';
    }
  } catch (error: any) {
    error?.response?.data
      ? console.error('Error specific error', error?.response?.data)
      : console.error('in make purchase request failed in cacth error block:', error);

    setAutoRetryTrue(); // set auto retry all transaction to true
    await helpFailedDelivery(response, error?.response?.data?.error[0] || resp?.data.info);
    return { status: false, message: error?.response?.data || error };
  }
}; // end of makePurchaseRequest

// function to make product purchase request simulation
const simulateMakePurchaseRequest = async (
  response: any,
  condition: boolean,
  type: 'data' | 'airtime'
): Promise<{ status: boolean; message: string }> => {
  try {
    if (condition) {
      updateTransactNum(response.data.meta.senderId);
      await updateNetworkStatus(response.data.meta.network, true);
      await helpSuccesfulDelivery(response, 6000, type);
      return { status: true, message: 'value succesfully delivered in simulate deliver value' };
    }
    updateNetworkStatus(response.data.meta.network, false);
    throw 'product purchas request not successful';
  } catch (error) {
    console.log('make purchase request simulation failed in cacth error block:', error);
    helpFailedDelivery(response, 'failed delivery simulated');
    return { status: false, message: 'error delivering value in simulate deliver value' };
  }
}; // end of makePurchaserequest simulain

export { deliverValue };
