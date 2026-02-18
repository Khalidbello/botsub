import { BotUserType } from '../grand_slam_offer/daily_participation_reminder';
import { confirmProductPurchaseResponse, getPlatformConfig } from './utility_1';
import { cancelTransaction } from './utility_2';
import {
  changeMailBeforeTransact,
  changePhoneBeforeTransaction,
  generateOneTimeAccountNumber,
} from './utility_3';
import { handleMakePurchase, selectPaymentMethodPrompt } from './utility_4';

const handleConfirmProductPurchase = async (
  senderId: string,
  message: string,
  platform: 'FB' | 'WA',
  transactNum = 0
) => {
  const config = getPlatformConfig(platform);
  try {
    if (message === 'x') {
      await config.send(senderId, 'Transaction canceled.');
      return await cancelTransaction(senderId, platform, true);
    }

    if (message === 'a') return handleMakePurchase(senderId, platform);
    if (message === 'b') return changePhoneBeforeTransaction(senderId, platform);
    if (message === 'c') return changeMailBeforeTransact(senderId, platform);

    await config.send(senderId, 'Invalid response recieved.');
    await confirmProductPurchaseResponse(senderId, platform);
  } catch (err) {
    console.error('Error in handleConfirmProductPurchase');
    await config.send(senderId, 'Invalid response recieved.');
    await confirmProductPurchaseResponse(senderId, platform);
  }
};

const handleSelectPaymentMethod = async (
  senderId: string,
  text: string,
  platform: 'FB' | 'WA',
  user: BotUserType
) => {
  const config = getPlatformConfig(platform);
  const message = text.toLowerCase().trim();

  try {
    if (message === 'x') {
      await config.send(senderId, 'Payment account selection canceled.');
      return await confirmProductPurchaseResponse(senderId, platform);
    }

    if (message === 'a') {
      await config.send(senderId, 'Kindly enter you NIN/BVN to create a virtual account: ');
      return await config.model.updateOne({ id: senderId }, { $set: { nextAction: 'enterBvn' } });
    }
    if (message === 'b') {
      return await generateOneTimeAccountNumber(senderId, platform, user.transactNum);
    }

    await config.send(senderId, 'Invalid reponse recieved.');
    await config.send(senderId, selectPaymentMethodPrompt);
  } catch (err) {
    console.error('An error occured in handleSelectPaymentMethod >>>>>>', err);
    await confirmProductPurchaseResponse(senderId, platform);
  }
};

export { handleConfirmProductPurchase, handleSelectPaymentMethod };
