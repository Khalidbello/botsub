import fs from 'fs';
import Handlebars from 'handlebars';
import { sendMessage } from '../bot/fb_bot/modules/send_message';
import Transactions from '../models/transactions';
import { dateFormatter } from './helper_functions';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';
import { TransactionEndGrandSlamOfferReminder } from '../bot/grand_slam_offer/unified/concluded_transaction_prompter';
import FBBotUsers from '../models/fb_bot_users';
import WhatsappBotUsers from '../models/whatsaap_bot_users';
import { totalAcceptableWinners } from '../bot/grand_slam_offer/unified/number_of_winners_logic';

// --- Platform Config Resolver ---
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
});

/**
 * Interface for consistent messaging across platforms
 */
const broadcastMessage = async (meta: any, messages: string[]) => {
  for (const text of messages) {
    if (meta.platform === 'facebook') {
      await sendMessage(meta.senderId, { text });
    } else if (meta.platform === 'whatsapp') {
      await sendMessageW(meta.senderId, text);
    }
  }
};

/**
 * Centralized Product string generator
 */
const getProductString = (meta: any) => {
  return meta.type === 'airtime'
    ? `₦${meta.amount} ${meta.network} airtime`
    : `${meta.size} ${meta.network} data`;
};

/**
 * DATABASE: ADD TO DELIVERED
 */
const addToDelivered = async (response: any, type: string) => {
  let profit = 0;
  const { data } = response;

  // Try to update existing first (Atomic update)
  const existing = await Transactions.findOneAndUpdate(
    { id: data.id },
    { $set: { status: 'delivered', info: 'Value successfully delivered' } },
    { new: true }
  );

  if (existing) return existing;

  if (data.meta.transactionType === 'data') {
    const dataDetails = JSON.parse(await fs.promises.readFile('files/data-details.json', 'utf-8'));
    const plan = dataDetails[data.meta.networkID][data.meta.index];

    const charges = data.meta.price * 0.02; // 2% gateway
    const vat = charges * 0.07; // 7% VAT on charges
    profit = data.meta.price - (charges + vat + plan.aPrice);
  }

  await new Transactions({
    id: data.id,
    email: data.customer.email,
    status: 'delivered',
    userId: data.meta.senderId,
    date: new Date(),
    product: getProductString(data.meta),
    beneficiary: parseInt(data.meta.phoneNumber),
    accountType: 'virtual',
    info: 'Delivery successful via one time account',
    transactionType: data.meta.transactionType,
    platform: data.meta.platform,
    profit,
    price: data.meta.price,
  }).save();
};

/**
 * SUCCESS HELPER
 */
export const helpSuccesfulDelivery = async (
  response: any,
  balance: number,
  type: 'data' | 'airtime'
) => {
  const { data } = response;
  const { meta, id, amount } = data;
  const platform = meta.platform === 'facebook' ? 'FB' : 'WA';
  const config = getPlatformConfig(platform);

  await addToDelivered(response, type);

  if (meta.bot) {
    const date = new Date();
    const dateString = dateFormatter(date);
    const product = getProductString(meta);

    const successMessages = [
      `Transaction Successful \nProduct: ${product} \nRecipient: ${meta.phoneNumber}\nPrice: ₦${amount} \nTransaction ID: ${id} \nDate: ${dateString}`,
    ];

    try {
      await broadcastMessage(meta, successMessages);
      const user = await config.model.findOne({ id: meta.senderId });

      if (meta.transactionType === 'data' && meta.sizeN >= 1) {
        // @ts-ignore type error on bot user
        if (user) await TransactionEndGrandSlamOfferReminder(user, platform);
        return;
      } else {
        if (user?.numberOfTransactionForMonth && user.numberOfTransactionForMonth < 3) {
          config.send(
            meta.senderId,
            `Get free 3GB!!. \n\nWhen you fall among first ${totalAcceptableWinners} make 3 data purchases this month.`
          );
        }
      }
    } catch (err) {
      console.error(
        'Error sending success messages in help helpSuccesfulDelivery >>>>>>>>>>>>>>> ',
        err
      );
    }
  }
};

/**
 * FAILED/PENDING HELPER
 */
export const helpFailedDelivery = async (response: any, info: string) => {
  const { data } = response;
  const { meta, id } = data;

  await addFailed(response, info);

  if (meta.bot) {
    const dateString = dateFormatter(new Date());
    const product = getProductString(meta);

    const failMessages = [
      `Sorry your transaction is pending \nProduct: ${product} \nRecipient: ${meta.phoneNumber} \nTransaction ID: ${id} \nDate: ${dateString}`,
      `Auto retry has been initiated. If value is not delivered after 2 minutes, please kindly Contact custoemr support Or report an issue.`,
    ];

    try {
      await broadcastMessage(meta, failMessages);

      if (process.env.ISSUE_ALERT_NUMBER) {
        sendMessageW(
          process.env.ISSUE_ALERT_NUMBER as string,
          `Failed Transaction alert one time account \n\ndetails: ${JSON.stringify(meta)}`
        );
      }

      if (process.env.ISSUE_ALERT_NUMBER_2) {
        sendMessageW(
          process.env.ISSUE_ALERT_NUMBER_2 as string,
          `Failed Transaction alert one time account \n\ndetails: ${JSON.stringify(meta)}`
        );
      }
    } catch (err) {
      console.error('Error sending failure messages:', err);
    }
  }
};

/**
 * DATABASE: ADD FAILED/REFUNDED
 */
const addFailed = async (response: any, info: string) => {
  const { data } = response;
  const stringInfo = convertToString(info);
  let profit = 0;

  try {
    const existing = await Transactions.findOneAndUpdate(
      { id: data.id },
      { $set: { info: stringInfo } }
    );

    if (existing) return;

    if (data.meta.transactionType === 'data') {
      const dataDetails = JSON.parse(
        await fs.promises.readFile('files/data-details.json', 'utf-8')
      );
      const plan = dataDetails[data.meta.networkID][data.meta.index];

      const charges = data.meta.price * 0.02; // 2% gateway
      const vat = charges * 0.07; // 7% VAT on charges
      profit = data.meta.price - (charges + vat + plan.aPrice);
    }

    await new Transactions({
      id: data.id,
      email: data.customer.email,
      status: 'failed',
      userId: data.meta.senderId,
      date: new Date(),
      product: getProductString(data.meta),
      beneficiary: parseInt(data.meta.phoneNumber),
      accountType: 'virtual',
      info: stringInfo,
      transactionType: data.meta.transactionType,
      platform: data.meta.platform,
      profit,
      price: data.meta.price,
    }).save();
  } catch (err) {
    console.error('Error in addFailed DB operation:', err);
  }
};

// fucntion to convert inputs to string
const convertToString = (info: any): String => {
  let processedInfo = '';

  if (Array.isArray(info)) {
    // 1. If it's a list, join elements with a comma
    processedInfo = info.join(', ');
  } else if (typeof info === 'object' && info !== null) {
    // 2. If it's an object, extract the values (e.g., {error: 'Timeout'} becomes 'Timeout')
    // You can also use Object.entries(info).map(([k, v]) => `${k}: ${v}`).join(', ')
    // if you want the keys included.
    processedInfo = Object.values(info).join(' - ');
  } else {
    // 3. If it's already a string or number, just convert to String
    processedInfo = info ? String(info) : 'Network working fine';
  }

  return processedInfo;
};
