import Transactions from '../models/transactions';
import { sendMessage } from '../bot/fb_bot/modules/send_message';
import { updateNetworkStatus } from '../bot/unified/data-network-checker';
import { Mutex } from 'async-mutex';
import axios from 'axios';
import { helpFailedDelivery, helpSuccesfulDelivery } from './deliver-value-helpers';
import { setAutoRetryTrue } from '../routes/admin';
import { dateFormatter } from './helper_functions';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';
import { updateTransactNum } from '../bot/unified/utility_2';

const transactionMutex = new Mutex();

/**
 * Main entry point for delivery
 */
export const deliverValue = async (
  response: any,
  custom: boolean
): Promise<{ status: boolean; message: string }> => {
  //console.log('delivering value one time account >>>>>>>>>>>>>>>>>>>> ');
  const release = await transactionMutex.acquire();

  try {
    const { id, meta, created_at } = response.data;
    const transaction = await Transactions.findOne({ id });
    //console.log('transaction in deliver one time account >>>>>>>>>>>', transaction);

    if (transaction?.status === 'delivered') {
      if (meta.bot && !custom) {
        await notifyAlreadyDelivered(meta, id, created_at);
      }
      return { status: true, message: 'Transaction has already been delivered.' };
    }

    // Logic routing
    switch (meta.transactionType) {
      case 'data':
        return await deliverData(response);
      case 'airtime':
        return await deliverAirtime(response);
      default:
        return { status: false, message: 'Transaction type not specified.....' };
    }
  } finally {
    release();
  }
};

/**
 * Helper to handle duplicate delivery notifications
 */
const notifyAlreadyDelivered = async (meta: any, id: string, date: Date) => {
  const msg = `Sorry this transaction has already been delivered \nProduct: ₦${
    meta.size || meta.amount
  } ${meta.network} ${meta.type} \nTransaction ID: ${id} \nDate: ${dateFormatter(date)}`;

  try {
    if (meta.platform === 'facebook') await sendMessage(meta.senderId, { text: msg });
    if (meta.platform === 'whatsapp') await sendMessageW(meta.senderId, msg);
  } catch (err) {
    console.error('Error sending duplicate delivery notice:', err);
  }
};

/**
 * Data Delivery Logic
 */
const deliverData = (response: any) => {
  // Switch provider based on Network ID
  const useOpenSub = response.data.meta.networkID === '4';
  const options = {
    url: useOpenSub ? 'https://opendatasub.com/api/data/' : 'https://asbdata.com/api/data/',
    headers: {
      Authorization: `Token ${useOpenSub ? process.env.OPENSUB_KEY : process.env.ASBDATA_KEY}`,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(response.data.meta.networkID),
      mobile_number: response.data.meta.phoneNumber,
      plan: Number(response.data.meta.planID),
      Ported_number: true,
    },
  };

  console.log('Before excuting work flow:  ', options);
  return executeWorkflow(response, options, 'data');
};

/**
 * Airtime Delivery Logic
 */
const deliverAirtime = (response: any) => {
  const options = {
    url: 'https://opendatasub.com/api/topup/',
    headers: {
      Authorization: `Token ${process.env.OPENSUB_KEY}`,
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
  return executeWorkflow(response, options, 'airtime');
};

/**
 * Orchestrates whether to simulate or hit production
 */
const executeWorkflow = (response: any, options: any, type: 'data' | 'airtime') => {
  const isLive = ['production', 'staging'].includes(process.env.NODE_ENV || '');
  return isLive
    ? makePurchaseRequest(response, options, type)
    : simulateMakePurchaseRequest(response, true, type);
};

/**
 * The Real HTTP Request
 */
const makePurchaseRequest = async (response: any, options: any, type: 'data' | 'airtime') => {
  try {
    const resp = await axios.post(options.url, options.payload, { headers: options.headers });

    if (resp.data.Status === 'successful') {
      // Post-success updates
      const { senderId, platform, network } = response.data.meta;

      updateTransactNum(senderId, platform === 'facebook' ? 'FB' : 'WA');

      if (type === 'data') updateNetworkStatus(network, true, 'Network working fine');

      await helpSuccesfulDelivery(response, resp.data.balance_after, type);
      return { status: true, message: 'Value successfully delivered' };
    }
    throw new Error(resp.data.api_response || 'Transaction failed at provider');
  } catch (error: any) {
    const errorMsg = error?.response?.data || error.message || 'Unknown Error';

    if (type === 'data') {
      await updateNetworkStatus(response.data.meta.network, false, errorMsg);
    }

    console.error(`Purchase Request Failed [${type}]:`, errorMsg);
    setAutoRetryTrue();
    await helpFailedDelivery(response, errorMsg);

    return { status: false, message: errorMsg };
  }
};

/**
 * Simulation Logic
 */
const simulateMakePurchaseRequest = async (
  response: any,
  condition: boolean,
  type: 'data' | 'airtime'
) => {
  try {
    if (!condition) throw new Error('Simulated Failure');

    await updateTransactNum(
      response.data.meta.senderId,
      response.data.meta.platform === 'facebook' ? 'FB' : 'WA'
    );
    await updateNetworkStatus(response.data.meta.network, true, 'Simulation Success');
    await helpSuccesfulDelivery(response, 6000, type);

    return { status: true, message: 'Value successfully delivered (Simulated)' };
  } catch (error: any) {
    await updateNetworkStatus(response.data.meta.network, false, 'Simulation Failure');
    await helpFailedDelivery(response, error.message);
    return { status: false, message: error.message };
  }
};
