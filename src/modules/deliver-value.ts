import Transactions from '../models/transactions';
import { sendMessage } from '../bot/modules/send_message';
import { updateNetworkStatus } from '../bot/modules/data-network-checker';
import { Mutex } from 'async-mutex';
import axios from 'axios';
import { updateTransactNum } from '../bot/modules/helper_function_2';
import { helpFailedDelivery, helpSuccesfulDelivery } from './deliver-value-helpers';
import { setAutoRetryTrue } from '../routes/admin';
import { dateFormatter } from './helper_functions';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';
import { updateTransactNumW } from '../bot/whatsaap_bot/helper_functions';

const transactionMutex = new Mutex(); // mutex for delivering transactions

// function to initiate delvering of values
const deliverValue = async (
  response: any,
  custom: boolean
): Promise<{ status: boolean; message: string }> => {
  // Attempt to acquire the lock for the transaction
  const release = await transactionMutex.acquire();
  try {
    const transaction = await Transactions.findOne({ id: response.data.id });
    console.log('trnasactiosn fethced: ', transaction);
    if (transaction?.status === 'delivered') {
      if (response.data.meta.bot) {
        if (!custom) {
          try {
            if (response.data.meta.platform === 'facebook') {
              await sendMessage(response.data.meta.senderId, {
                text: `Sorry this transaction has already been delivered \nProduct: ₦${
                  response.data.meta.size
                } ${response.data.meta.network} data \nTransaction ID: ${
                  response.data.id
                } \nDate: ${dateFormatter(response.data.created_at)}`,
              });
            } else if (response.data.meta.platform === 'whatsapp') {
              await sendMessageW(
                response.data.meta.senderId,
                `Sorry this transaction has already been delivered \nProduct: ₦${
                  response.data.meta.size
                } ${response.data.meta.network} data \nTransaction ID: ${
                  response.data.id
                } \nDate: ${dateFormatter(response.data.created_at)}`
              );
            }
          } catch (err) {
            console.error(
              'an error occurd trying to send bot response for alredy deliered value in deliverValue',
              err
            );
          }
        }
      }
      return { status: true, message: 'Transaction has already been delivered.' };
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
    console.log('response: ', resp?.data);

    if (resp.data.Status === 'successful') {
      if (response.data.meta.type === 'data') {
        if (response.data.meta.platform === 'facebook')
          updateTransactNum(response.data.meta.senderId);
        if (response.data.meta.platform === 'whatsapp')
          updateTransactNumW(response.data.meta.senderId);
        updateNetworkStatus(response.data.meta.network, true, 'Network working fine'); // updating network status to true
      }

      //console.log('Response in makePurchaseRequest: ', resp);
      await helpSuccesfulDelivery(response, resp.data.balance_after, type);
      return { status: true, message: 'Value succesfully delivered' };
    }

    throw resp.data.api_response || 'Transaction failed could not get why';
  } catch (error: any) {
    if (response.data.meta.type === 'data')
      await updateNetworkStatus(
        response.data.meta.network,
        false,
        error?.response?.data ||
          resp?.data?.api_response ||
          'Data Trnasaction failed error not captured'
      ); // updating network status to false

    error?.response?.data
      ? console.error('Error specific error', error?.response?.data)
      : console.error('in make purchase request failed in catch error block:', error);

    setAutoRetryTrue(); // set auto retry all transaction to true
    await helpFailedDelivery(response, resp?.data?.api_response || error?.response?.data?.error[0]);
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
      await updateTransactNum(response.data.meta.senderId);
      await updateNetworkStatus(
        response.data.meta.network,
        true,
        'In simulation data network working fine.'
      );
      await helpSuccesfulDelivery(response, 6000, type);
      return { status: true, message: 'value succesfully delivered in simulate deliver value' };
    }
    updateNetworkStatus(
      response.data.meta.network,
      false,
      'In simulation, data delivery for network not going through'
    );
    throw 'product purchas request not successful';
  } catch (error) {
    console.log('make purchase request simulation failed in cacth error block:', error);
    helpFailedDelivery(response, 'failed delivery simulated');
    return { status: false, message: 'error delivering value in simulate deliver value' };
  }
}; // end of makePurchaserequest simulain

export { deliverValue };
