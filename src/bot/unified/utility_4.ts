import FBBotUsers from '../../models/fb_bot_users';
import GeneratedOAccounts from '../../models/generated-o-accounts';
import PaymentAccounts from '../../models/payment-accounts';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { makePurchase } from '../../modules/v-account-make-purcchase';
import { sendMessage } from '../fb_bot/modules/send_message';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { confirmProductPurchaseResponse, remindToFundWallet } from './utility_1';
/**
 * Platform Configuration Resolver
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
});

/**
 * UNIFIED: Initialize Purchase
 * Consolidates the logic for checking balance and starting the transaction
 */
async function initMakePurchase(platform: 'FB' | 'WA', senderId: string) {
  console.log('IN initMakePurchase >>>>>>>>>>>>>>>> ', platform, senderId);
  const config = getPlatformConfig(platform);

  try {
    // 1. Concurrent fetching of User and Payment Account
    const [user, account] = await Promise.all([
      config.model.findOne({ id: senderId }),
      PaymentAccounts.findOne({ refrence: senderId }),
    ]);

    if (!user || !account) {
      return await config.send(senderId, 'User or Account not found. Please try again.');
    }

    const purchasePayload: any = user.purchasePayload;

    //  2. Validate Transaction Payload
    if (!purchasePayload || !purchasePayload.transactionType) {
      await config.send(senderId, 'No transaction found');
      await config.send(senderId, '');
      return;
    }

    // @ts-ignore know what i am doing Attach email for processing
    purchasePayload.email = user.email;

    // 3. Balance Check
    const price = purchasePayload.price as number;
    const balance = account.balance as number;

    if (price > balance) {
      // Logic for insufficient funds
      return remindToFundWallet(senderId, platform, balance - price, balance, account);
    }

    // 4. Proceed to Delivery
    // Passing 'facebook' or 'whatsapp' string to match the existing makePurchase signature
    const platformLabel = platform === 'FB' ? 'facebook' : 'whatsapp';
    return makePurchase(user, platformLabel, senderId);
  } catch (err) {
    console.error(`An error occurred in initMakePurchase [${platform}]:`, err);
    await config.send(senderId, 'An internal error occurred. Please try again shortly.');
  }
}

// check if one  time account payment the aactual price was paid
const checkPaymentValidity = async (id: string, price: string, currency: string): Promise<any> => {
  try {
    const account = await GeneratedOAccounts.findOne({ id: id });

    if (account?.amount_to_be_paid === parseInt(price) && account?.currency === currency)
      return true;
    return false;
  } catch (err) {
    console.error('An erorr occured in checkPaymentValidity,,,, ', err);
    return false;
  }
};

const selectPaymentMethodPrompt =
  'Select Payment method. ' +
  '\n\nA. Create a permanent account number, will be used for all future transactions. (NIN/BVN required)' +
  '\n\nB. Create a one-time account number for this transaction only. \n\nEnter X to cancel.';

const handleMakePurchase = async (senderId: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);

  try {
    const hasVaccount = await PaymentAccounts.findOne({ refrence: senderId });

    if (hasVaccount) return initMakePurchase(platform, senderId);

    await config.send(senderId, selectPaymentMethodPrompt);
    await config.model.updateOne(
      { id: senderId },
      {
        $set: {
          nextAction: 'selectAccount',
        },
      }
    );
  } catch (err) {
    console.error('An error occured in selectPaymentMethod:  ', err);
    await confirmProductPurchaseResponse(senderId, platform);
  }
};

const isConversationOpen = async (senderId: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);

  // 1. Added await so 'user' isn't a pending promise
  const user = await config.model.findOne({ id: senderId }).select('lastMessage');

  if (!user || !user.lastMessage) return false;

  // 2. Define the 24-hour window in milliseconds
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const lastMessageTime = new Date(user.lastMessage).getTime();
  const currentTime = new Date().getTime();

  // 3. Return true if the difference is less than 24 hours
  return currentTime - lastMessageTime < TWENTY_FOUR_HOURS;
};

export {
  initMakePurchase,
  checkPaymentValidity,
  handleMakePurchase,
  selectPaymentMethodPrompt,
  isConversationOpen,
};
