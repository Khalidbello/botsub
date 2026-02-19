import fs from 'fs';
import axios from 'axios';

// Models
import Transactions from '../models/transactions';
import PaymentAccounts from '../models/payment-accounts';
import BotUsers from '../models/fb_bot_users';
import WhatsappBotUsers from '../models/whatsaap_bot_users';

// Messaging (Platform Dependent)
import { sendMessage as sendMessageFB } from '../bot/fb_bot/modules/send_message';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';

// Unified Bot Logic
import { updateNetworkStatus } from '../bot/unified/data-network-checker';
import { dateFormatter, generateRandomString } from './helper_functions';
import { TransactionEndGrandSlamOfferReminder } from '../bot/grand_slam_offer/unified/concluded_transaction_prompter';
import { cancelTransaction, updateTransactNum } from '../bot/unified/utility_2';
import { confirmProductPurchaseResponse } from '../bot/unified/utility_1';

/**
 * MAIN ENTRY POINT
 */
export async function makePurchase(user: any, bot: 'facebook' | 'whatsapp', senderId: string) {
  const type = user.purchasePayload.transactionType;
  if (type === 'data') return deliverData(user, bot, senderId);
  if (type === 'airtime') return deliverAirtime(user, bot, senderId);
}

/**
 * PRODUCT PROVIDER CONFIGURATION
 */
async function deliverData(user: any, bot: 'facebook' | 'whatsapp', senderId: string) {
  const { networkID, phoneNumber, planID } = user.purchasePayload;
  const useOpenSub = networkID === 4;

  const options = {
    url: useOpenSub ? 'https://opendatasub.com/api/data/' : 'https://asbdata.com/api/data/',
    headers: {
      Authorization: `Token ${useOpenSub ? process.env.OPENSUB_KEY : process.env.ASBDATA_KEY}`,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(networkID),
      mobile_number: phoneNumber,
      plan: Number(planID),
      Ported_number: true,
    },
  };

  return executeWorkflow(user, options, bot, 'data', senderId);
}

async function deliverAirtime(user: any, bot: 'facebook' | 'whatsapp', senderId: string) {
  const { networkID, price, phoneNumber } = user.purchasePayload;
  const options = {
    url: 'https://opendatasub.com/api/topup/',
    headers: {
      Authorization: `Token ${process.env.OPENSUB_KEY}`,
      'Content-Type': 'application/json',
    },
    payload: {
      network: Number(networkID),
      amount: Number(price),
      mobile_number: phoneNumber,
      Ported_number: true,
      airtime_type: 'VTU',
    },
  };

  return executeWorkflow(user, options, bot, 'airtime', senderId);
}

/**
 * ORCHESTRATOR
 */
async function executeWorkflow(
  user: any,
  options: any,
  bot: 'facebook' | 'whatsapp',
  type: 'data' | 'airtime',
  senderId: string
) {
  return process.env.NODE_ENV === 'production'
    ? makePurchaseRequest(user, options, bot, type, senderId)
    : simulateMakePurchaseRequest(user, bot, type, senderId);
}

/**
 * API REQUEST HANDLER
 */
async function makePurchaseRequest(
  user: any,
  options: any,
  bot: 'facebook' | 'whatsapp',
  type: string,
  senderId: string
) {
  try {
    const resp = await axios.post(options.url, options.payload, { headers: options.headers });

    if (resp.data.Status === 'successful') {
      if (type === 'data') {
        await updateTransactNum(user.id, bot === 'facebook' ? 'FB' : 'WA'); // Shared helper
        updateNetworkStatus(user.purchasePayload?.network, true, 'Working fine');
      }
      return helpSuccesfulDelivery(user, senderId, bot, parseInt(resp.data.plan_amount || 0));
    }
    throw new Error(resp.data.api_response || 'Provider error');
  } catch (error: any) {
    const errorMsg = error.message || 'Transaction failed';
    if (type === 'data') updateNetworkStatus(user.purchasePayload?.network, false, errorMsg);

    await broadcastMessage(bot, senderId, `Transaction failed. \n\nError: ${errorMsg}`);
    return resetFlow(bot, senderId);
  }
}

/**
 * SUCCESS HANDLER (Unified)
 */
async function helpSuccesfulDelivery(
  user: any,
  senderId: string,
  bot: 'facebook' | 'whatsapp',
  planAmount: number
) {
  const transactionId = await generateUniqueId();
  const dateStr = dateFormatter(new Date());
  const productStr = formProduct(user.purchasePayload);
  const price = Number(user.purchasePayload.price);

  const account = await PaymentAccounts.findOneAndUpdate(
    { refrence: senderId },
    { $inc: { balance: -price } },
    { new: true }
  );

  await addToDelivered(transactionId, user, senderId, bot, planAmount);

  const receipt = `Transaction Successful \nProduct: ${productStr} \nRecipient: ${
    user.purchasePayload.phoneNumber
  } \nPrice: ₦${price} \nID: ${transactionId} \nDate: ${dateStr}\n\nNew Balance: ₦${account?.balance?.toFixed(
    2
  )}\n\n〜BotSub`;

  await broadcastMessage(bot, senderId, receipt);

  if (
    user.purchasePayload.transactionType !== 'airtime' &&
    user.numberOfTransactionForMonth < 3 &&
    user.purchasePayload.sizeN < 1
  ) {
    await broadcastMessage(bot, senderId, 'Make 3 data purchases of 1GB+ to get Free 3GB!');
  } else if (user.purchasePayload.sizeN >= 1) {
    await TransactionEndGrandSlamOfferReminder(user, bot === 'facebook' ? 'FB' : 'WA');
  }
}

/**
 * DB LOGGING (Unified)
 */
async function addToDelivered(
  id: string,
  user: any,
  senderId: string,
  bot: string,
  planAmount: number
) {
  try {
    const { purchasePayload } = user;
    let profit = 0;

    await cancelTransaction(senderId, bot === 'facebook' ? 'FB' : 'WA', false); // Shared logic

    if (purchasePayload.transactionType === 'data') {
      const dataDetails = JSON.parse(
        await fs.promises.readFile('files/data-details.json', 'utf-8')
      );
      const plan = dataDetails[purchasePayload.networkID][purchasePayload.index];

      console.log('ddata in ad to dn: ', dataDetails, purchasePayload, plan);
      const charges = purchasePayload.price * 0.02;
      const vat = charges * 0.07;
      profit = purchasePayload.price - (charges + vat + (planAmount || plan.aPrice));
    }

    await new Transactions({
      id,
      email: user.email,
      status: 'delivered',
      userId: user.id,
      date: new Date(),
      product: formProduct(purchasePayload),
      beneficiary: parseInt(purchasePayload.phoneNumber),
      accountType: 'virtual',
      info: 'Delivery successful via virtual account',
      transactionType: purchasePayload.transactionType,
      platform: bot,
      profit,
      price: purchasePayload.price,
    }).save();
  } catch (err) {
    console.error('DB Logging Error:', err);
  }
}

/**
 * PLATFORM DEPENDENT FUNCTION (The Exception)
 */
async function broadcastMessage(bot: string, senderId: string, text: string) {
  return bot === 'facebook' ? sendMessageFB(senderId, { text }) : sendMessageW(senderId, text);
}

/**
 * SHARED UTILITIES
 */
async function resetFlow(bot: 'facebook' | 'whatsapp', senderId: string) {
  const model = bot === 'facebook' ? BotUsers : WhatsappBotUsers;
  const user = await model.findOne({ id: senderId });
  // @ts-expect-error user type error
  return confirmProductPurchaseResponse(senderId, user, null);
}

async function generateUniqueId() {
  let id;
  while (true) {
    id = generateRandomString(15);
    if (!(await Transactions.exists({ id }))) break;
  }
  return id;
}

function formProduct(payload: any) {
  return payload.transactionType === 'airtime'
    ? `₦${payload.price} ${payload.network} airtime`
    : `${payload.size} ${payload.network} data`;
}

async function simulateMakePurchaseRequest(
  user: any,
  bot: 'facebook' | 'whatsapp',
  type: string,
  senderId: string
) {
  try {
    await updateTransactNum(user.id, bot === 'facebook' ? 'FB' : 'WA');
    return helpSuccesfulDelivery(user, senderId, bot, 0);
  } catch (error) {
    await broadcastMessage(bot, senderId, 'Simulation failed.');
    return resetFlow(bot, senderId);
  }
}
