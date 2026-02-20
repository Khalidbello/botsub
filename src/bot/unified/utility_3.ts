import GeneratedOAccounts from '../../models/generated-o-accounts';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import { networkDetailsType } from '../../types/bot/module-buy-data-types';
import { checkDataStatus, handleDataNetworkNotAvailable } from './data-network-checker';
import { sendMessage } from '../fb_bot/modules/send_message';
import { confirmProductPurchaseResponse, noTransactFound } from './utility_1';
import { cancelTransaction, generateOneTimeAccountHelper } from './utility_2';
import sendMessageW from '../whatsaap_bot/send_message_w';
import FBBotUsers from '../../models/fb_bot_users';

/**
 * Platform Configuration Resolver
 */
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  isFB: platform === 'FB',
});

/**
 * UNIFIED: Generate Account Number
 */
async function generateOneTimeAccountNumber(
  senderId: string,
  platform: 'FB' | 'WA',
  transactNum: number
) {
  const config = getPlatformConfig(platform);
  let botUser;

  try {
    // 1. Fetch User with specific fields
    botUser = await config.model
      .findOne({ id: senderId })
      .select('email purchasePayload referrer firstPurchase');

    if (!botUser?.purchasePayload?.transactionType) {
      return noTransactFound(senderId, platform);
    }

    // 2. Build Unified API Payload
    const rawPayload = {
      network: botUser.purchasePayload.network,
      networkID: botUser.purchasePayload.networkID,
      transactionType: botUser.purchasePayload.transactionType,
      index: botUser.purchasePayload?.index,
      planID: botUser.purchasePayload?.planID,
      price: botUser.purchasePayload.price,
      product: botUser.purchasePayload.product,
      size: botUser.purchasePayload?.size,
      sizeN: botUser.purchasePayload?.sizeN,
      phoneNumber: botUser.purchasePayload.phoneNumber,
      email: botUser.email,
      bot: true,
      firstPurchase: botUser.firstPurchase,
      senderId: senderId,
      platform: platform === 'FB' ? 'facebook' : 'whatsapp',
    };

    // Filter out null, undefined, or empty strings
    const payload = Object.fromEntries(
      Object.entries(rawPayload).filter(
        ([_, value]) => value !== null && value !== undefined && value !== ''
      )
    );

    console.log('in genrate one time account data>>>>>>>>>>>>>>>>>>>> ', payload, rawPayload);

    // 3. Shared Network Status Check
    //console.log('In <<<<<<<<<<<<<<<<<<<<<<<<  ', payload);
    if (payload.transactionType === 'data') {
      const isAvailable = await checkDataStatus(payload.network as string);

      if (!isAvailable) {
        await config.send(
          senderId,
          `Sorry ${payload.network} service is not available at the moment. \nPlease try again later.`
        );
        return;
      }
    }

    // 4. Instructional Messaging
    await config.send(
      senderId,
      'Make transfer to the account details below. \n\n' +
        'Please note that the account details below is valid only for this transaction and expires 1Hour from now. \n\n' +
        'Value would automatically be delivered by our system once payment is made'
    );

    // 5. External API Call (Gateway Independent)
    const response = await generateOneTimeAccountHelper(payload);

    console.log('generate one time account response: ', response);
    if (response.status === 'success') {
      const data = response.meta.authorization;

      // 6. Save to DB (Shared Helper)
      const isSaved = await saveOneTimeAccount(
        platform,
        senderId,
        transactNum,
        data.transfer_account,
        data.transfer_amount,
        response.id
      );

      if (!isSaved) throw new Error('An error occurred saving new transfer account');

      // 7. Display Account Details (Platform Dependent Send)
      await config.send(senderId, `Bank Name: ${data.transfer_bank}`);
      await config.send(senderId, 'Account Name: BotSub FLW');
      await config.send(senderId, 'Account Number: 👇');
      await config.send(senderId, data.transfer_account);
      await config.send(senderId, `Amount: ₦${data.transfer_amount}`);

      // 8. Cleanup State
      return cancelTransaction(senderId, platform, false);
    }

    throw response;
  } catch (err) {
    console.error(`Error in generateOneTimeAccountNumber [${platform}]:`, err);
    await config.send(senderId, 'An error occurred. Please try again.');
    await confirmProductPurchaseResponse(senderId, platform);
  }
}

const formDataOffers = async (networkInfo: networkDetailsType, transactNum: number) => {
  const lenght = Object.keys(networkInfo).length;
  let text = `Select ${networkInfo['1'].network} data offer \n`;
  const discount = 0; //computeDiscount(transactNum);
  const alphaMap = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'O', 'P', 'Q'];
  console.log('inb form data ofer trnsactNum, ', transactNum, discount);

  for (let i = 1; i < lenght + 1; i++) {
    text += `\n ${alphaMap[i - 1]}. ${networkInfo[i].size} ₦${networkInfo[i].price - discount} ${
      networkInfo[i].validity
    }`;
  }

  text += '\n\nEnter X to cancel';
  return text;
};

// function to create new transaction to for one time account users
const saveOneTimeAccount = async (
  platform: string,
  userId: string,
  transactNum: number,
  accountNumber: string,
  price: number,
  id: string
) => {
  try {
    const newAccount = new GeneratedOAccounts({
      user_id: userId,
      account_number: accountNumber,
      transactNum: transactNum,
      id: id,
      amount_to_be_paid: price,
      date: new Date(),
      currency: 'NGN',
    });
    await newAccount.save();
    return true;
  } catch (err) {
    console.error('AN error occured writting new ot account', err);
    return false;
  }
};

// function to change phone numbe before making purhase
async function changePhoneBeforeTransaction(senderId: string, platform: 'FB' | 'WA') {
  const config = getPlatformConfig(platform);
  try {
    const user = await config.model.findOne({ id: senderId });

    // @ts-expect-error
    if (user.purchasePayload.$isEmpty()) {
      noTransactFound(senderId, platform);
      await config.model.updateOne(
        { id: senderId },
        {
          $set: { nextAction: null },
        }
      );
      return;
    }

    await config.send(senderId, 'Enter new phone number \n\nEnter X to cancel');
    await config.model.updateOne(
      { id: senderId },
      { $set: { nextAction: 'changePhoneNumberBeforeTransact' } }
    );
  } catch (err) {
    console.error('An error occured in: changePhoneBeforeTransaction  ><<', err);
    await config.send(senderId, 'An error occured.');
    return await confirmProductPurchaseResponse(senderId, platform);
  }
} // end of  changeNumber

// function to chanege email b4 transaction
async function changeMailBeforeTransact(senderId: string, platform: 'FB' | 'WA') {
  const config = getPlatformConfig(platform);

  try {
    const user = await config.model.findOne({ id: senderId });
    // @ts-expect-error
    if (user?.purchasePayload.$isEmpty()) {
      noTransactFound(senderId, platform);
      // updating database
      await config.model.updateOne(
        { id: senderId },
        {
          $set: { nextAction: null },
        }
      );
      return;
    }

    await config.send(senderId, 'Enter new email \n\nEnter X to cancel');
    await config.model.updateOne(
      { id: senderId },
      {
        $set: { nextAction: 'changeEmailBeforeTransact' },
      }
    );
  } catch (err) {
    console.error('An error occurd in: changeMailBeforeTransact :    ', err);
    return await confirmProductPurchaseResponse(senderId, platform);
  }
} // end of changeMailBeforeTransact

export {
  generateOneTimeAccountNumber,
  formDataOffers,
  saveOneTimeAccount,
  changePhoneBeforeTransaction,
  changeMailBeforeTransact,
};
