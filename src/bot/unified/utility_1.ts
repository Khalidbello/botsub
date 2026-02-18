import * as fs from 'fs';
import emailValidator from 'email-validator';
import FBBotUsers from '../../models/fb_bot_users';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { sendMessage } from '../fb_bot/modules/send_message';
import { DEFAULT_MESSAGE } from './send_message_generic';

// --- Platform Config Resolver ---
const getPlatformConfig = (platform: 'FB' | 'WA') => ({
  model: platform === 'FB' ? FBBotUsers : WhatsappBotUsers,
  send: (id: string, text: string) =>
    platform === 'FB' ? sendMessage(id, { text }) : sendMessageW(id, text),
  label: platform === 'FB' ? 'facebook' : 'whatsapp',
});

// --- Validation Utilities ---

/**
 * Validates Nigerian phone numbers and returns the cleaned number or false
 */
const validateNumber = (phoneNumber: string) => {
  const prefixes = {
    MTN: [
      '0803',
      '0916',
      '0913',
      '0806',
      '0703',
      '0706',
      '0813',
      '0816',
      '0810',
      '0814',
      '0903',
      '0906',
      '0704',
      '0912',
      '0904',
      '0914',
    ],
    Airtel: ['0901', '0701', '0911', '0802', '0808', '0708', '0812', '0902', '0907'],
    Glo: ['0805', '0811', '0915', '0705', '0905', '0807', '0815'],
    '9mobile': ['0809', '0817', '0818', '0909', '0908'],
  };
  const cleanedNumber = phoneNumber.replace(/\s/g, '').replace('+234', '0');

  if (cleanedNumber.length !== 11 || !/^\d+$/.test(cleanedNumber)) return false;

  const prefix = cleanedNumber.slice(0, 4);
  for (const [network, networkPrefixes] of Object.entries(prefixes)) {
    if (networkPrefixes.includes(prefix)) return cleanedNumber;
  }
  return false;
};

const validateAmount = async (amount: string) => {
  const parsedAmount = parseFloat(amount.trim());
  if (isNaN(parsedAmount) || parsedAmount < 100) return false;
  const decimalCount = (parsedAmount.toString().split('.')[1] || '').length;
  return decimalCount <= 2;
};

// --- Transaction Response Handlers ---

const confirmProductPurchaseResponse = async (
  senderId: string,
  platform: 'FB' | 'WA',
  phoneNumberOverride?: string
) => {
  const config = getPlatformConfig(platform);
  const user = await config.model.findOne({ id: senderId });

  const message =
    `Product: ${user?.purchasePayload?.product}\n` +
    `Network: ${user?.purchasePayload?.network}\n` +
    `Price: ₦${user?.purchasePayload?.price}\n` +
    `Phone Number: ${phoneNumberOverride || user?.purchasePayload?.phoneNumber}\n` +
    `Email: ${user?.email}\n\n` +
    ` A. Make purchase. \n B. Change number. \n C. Change Email \n\n X. cancel transaction`;

  await config.send(senderId, message);
  await config.model.updateOne(
    { id: senderId },
    { $set: { nextAction: 'confirmProductPurchase' } }
  );
};

const noTransactFound = async (senderId: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);
  await config.send(senderId, DEFAULT_MESSAGE);
  await config.model.updateOne({ id: senderId }, { $set: { nextAction: null } });
};

const remindToFundWallet = async (
  senderId: string,
  platform: 'FB' | 'WA',
  amount: number,
  balance: number,
  accountDetails: any
) => {
  const config = getPlatformConfig(platform);
  const message = `Sorry your account balance is currently low. \n\nYour current account balance is: ₦${balance} \n\nKindly fund your permanent account with a minimum amount of ₦${Math.abs(
    amount
  )} \n\nBank Name: ${accountDetails.bankName} \nAccount Name: ${
    accountDetails.accountName
  } \nAccount Number:`;

  await config.send(senderId, message);
  await config.send(senderId, `${accountDetails.accountNumber}`);
  await config.send(
    senderId,
    'purchase would be automatically made once account is funded. \n\nEnter X to cancel auto delivering on wallet funding.'
  );

  const updatePayload: any = { 'purchasePayload.outStanding': true };
  if (platform === 'WA') updatePayload['purchasePayload.platform'] = 'whatsapp';

  await config.model.updateOne({ id: senderId }, { $set: updatePayload });
};

// --- Profile / Settings Update ---

const changeDetailBeforeTransact = async (
  senderId: string,
  type: 'email' | 'phone',
  platform: 'FB' | 'WA'
) => {
  const config = getPlatformConfig(platform);
  const user = await config.model.findOne({ id: senderId });

  // @ts-expect-error - Mongoose isEmpty check
  if (!user || user.purchasePayload?.$isEmpty?.()) {
    return noTransactFound(senderId, platform);
  }

  const label = type === 'email' ? 'email' : 'phone number';
  const action = type === 'email' ? 'changeEmailBeforeTransact' : 'changePhoneNumberBeforeTransact';

  await config.send(senderId, `Enter new ${label} \n\nEnter X to cancel`);
  await config.model.updateOne({ id: senderId }, { $set: { nextAction: action } });
};

// --- Time & Session Utilities ---

const isConversationOpen = async (senderId: string, platform: 'FB' | 'WA') => {
  const config = getPlatformConfig(platform);
  try {
    const result = await config.model.findOne({ id: senderId }).select('lastMessage');
    if (!result?.lastMessage) return false;

    const lastMessageDate = new Date(result.lastMessage);
    const nowDate = new Date();
    const difference = Math.abs(nowDate.getTime() - lastMessageDate.getTime());
    return difference < 24 * 60 * 60 * 1000; // 24 Hours
  } catch (err) {
    return false;
  }
};

const dateFormatter = (date: Date) => {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  }).format(new Date(date));
};

const txCode = () => {
  let code = '';
  const characters = '1234567890ABCDEFGHIJKLMNOPQRSTUV';
  for (let x = 0; x < 25; x++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code + Date.now();
};

// --- Logging & File System ---

const saveErrorToJson = (error: any) => {
  const errorData = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stackTrace: error.stack,
  };
  fs.appendFile('error.json', JSON.stringify(errorData, null, 2) + '\n', (err) => {
    if (err) console.error('Error writing to error.json', err);
  });
};

const writeMessageToJson = (message: any, filename: string) => {
  try {
    const data = { timestamp: new Date().toISOString(), message };
    const existingData = fs.existsSync(filename)
      ? JSON.parse(fs.readFileSync(filename, 'utf8'))
      : [];
    existingData.push(data);
    fs.writeFileSync(filename, JSON.stringify(existingData, null, 2));
  } catch (error) {
    saveErrorToJson(error);
  }
};

// --- Exports ---
export {
  validateNumber,
  validateAmount,
  confirmProductPurchaseResponse,
  noTransactFound,
  remindToFundWallet,
  changeDetailBeforeTransact,
  isConversationOpen,
  dateFormatter,
  txCode,
  saveErrorToJson,
  writeMessageToJson,
  getPlatformConfig,
};
