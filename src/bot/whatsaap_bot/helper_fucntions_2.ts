import axios from 'axios';
import { BotUserType } from '../grand_slam_offer/daily_participation_reminder';
import UsersWithdrawals from '../../models/users_withdrawal';

async function fetchBankCodes(
  countryCode = 'NG',
  flutterwaveSecretKey: string,
  bankNameStart: string
) {
  try {
    // Validate input
    if (!bankNameStart || bankNameStart.length !== 3) {
      throw new Error('Please provide exactly 3 starting letters of bank name');
    }

    const response = await axios.get(`https://api.flutterwave.com/v3/banks/${countryCode}`, {
      headers: {
        Authorization: `Bearer ${flutterwaveSecretKey}`,
      },
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to fetch banks');
    }

    // Filter banks by first 3 letters (case insensitive)
    const searchPrefix = bankNameStart.toLowerCase();
    const matchingBanks = response.data.data.filter((bank: any) =>
      bank.name.toLowerCase().startsWith(searchPrefix)
    );

    console.log(matchingBanks);
    return matchingBanks;
  } catch (error) {
    console.error('Error fetching bank codes:', error);
    throw new Error('Failed to retrieve bank list from Flutterwave');
  }
}

// Define interface for validation response
interface ValidationResponse {
  valid: boolean;
  message: string;
  data?: any;
}

// Function to validate bank account details
async function validateBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<ValidationResponse> {
  if (!bankCode) {
    return { valid: false, message: 'Bank code is required.' };
  }

  try {
    // Call Flutterwave API for validation
    const response = await axios.post(
      'https://api.flutterwave.com/v3/accounts/resolve',
      { account_number: accountNumber, account_bank: parseInt(bankCode) },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SCRT_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status === 'success') {
      return { valid: true, message: 'Valid account details.', data: response.data.data };
    } else {
      return { valid: false, message: 'Invalid account details.' };
    }
  } catch (error: any) {
    return {
      valid: false,
      message: 'Error validating account details.',
      data: error.response?.data,
    };
  }
}

/**
 * Initiates a bank transfer for a user using Flutterwave
 * @param user The user to initiate transfer for
 * @returns Promise containing transfer response
 */
const initiateUserAccountTransfer = async (
  user: BotUserType,
  platform: string
): Promise<boolean> => {
  try {
    const transferReference = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create transfer payload for Flutterwave
    const payload = {
      account_bank: user.withdrawalData.bankCode,
      account_number: user.withdrawalData.accountNumber,
      amount: user.withdrawalData.amount,
      narration: `Withdrawal for ${user.email} userId: ${user.id}, bank name: ${user.withdrawalData.bankName}`,
      currency: 'NGN',
      reference: transferReference,
      debit_currency: 'NGN',
      callback_url: 'https://webhook.site/5f9a659a-11a2-4925-89cf-8a59ea6a019a',
    };

    const options = {
      method: 'POST',
      url: 'https://api.flutterwave.com/v3/transfers',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.FLW_SCRT_KEY}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    };

    const response = await axios(options);
    console.log('data in transfer from user wallet: ', response.data);

    // save transaction to db
    const newWithdrawal = new UsersWithdrawals({
      id: transferReference,
      userId: user.id,
      accountName: user.withdrawalData.accountName,
      accounNumber: user.withdrawalData.accountNumber,
      bankName: user.withdrawalData.bankName,
      status: 'pending',
      amount: user.withdrawalData.amount,
      createdAt: new Date(),
      platform: platform,
    });

    if (response.data.status) await newWithdrawal.save();

    return response.data.status;
  } catch (error: any) {
    console.error('Transfer failed in initiateUserAccountTransfer: ', error);
    return false;
  }
};

export { fetchBankCodes, validateBankAccount, initiateUserAccountTransfer };
