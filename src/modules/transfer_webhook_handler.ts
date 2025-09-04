import express from 'express';
import mongoose from 'mongoose';
import UsersWithdrawals from '../models/users_withdrawal';
import PaymentAccounts from '../models/payment-accounts';
import sendMessageW from '../bot/whatsaap_bot/send_message_w';
import { sendMessage } from '../bot/modules/send_message';
import { dateFormatter } from './helper_functions';

// fucntin to handle trsnsfer webhook
async function handleTransferWebhook(data: any) {
  try {
    if (data.status === 'SUCCESSFUL') {
      handleTransferCompleted(data);
    } else if (data.status === 'FAILED') {
      handleTransferFailed(data);
    }
  } catch (err) {
    console.error('An error ccured in handleTransferWebhook: ', err);
  }
}
// Handle successful transfers
async function handleTransferCompleted(data: any) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the withdrawal in our database
    const withdrawal = await UsersWithdrawals.findOne({
      id: data.reference,
    }).session(session);

    if (!withdrawal) {
      throw new Error(`UsersWithdrawals not found for reference: ${data.reference}`);
    }

    // Update withdrawal status
    withdrawal.status = 'success';
    withdrawal.updatedAt = new Date();

    await withdrawal.save({ session });

    await session.commitTransaction();

    if (withdrawal.platform === 'whatsapp') {
      sendMessageW(
        withdrawal.userId as string,
        `Your withdrawal of  ${withdrawal.amount} to: \nAccount Name: ${
          withdrawal.accountName
        } \nAccount Number: ${withdrawal.accounNumber} \nBank Name: ${
          withdrawal.bankName
        } \nat ${dateFormatter(
          withdrawal.createdAt as Date
        )} was successful. \n\nYour account balance is ₦{withdrawal.balance}`
      );
    } else if (withdrawal.platform === 'facebook') {
      sendMessage(withdrawal.userId as string, {
        text: `Your withdrawal of  ${withdrawal.amount} to: \nAccount Name: ${
          withdrawal.accountName
        } \nAccount Number: ${withdrawal.accounNumber} \nBank Name: ${
          withdrawal.bankName
        } \nat ${dateFormatter(
          withdrawal.createdAt as Date
        )} was successful. \n\nYour account balance is ₦{withdrawal.balance}`,
      });
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Handle failed transfers
async function handleTransferFailed(data: any) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const withdrawal = await UsersWithdrawals.findOne({
      reference: data.reference,
    }).session(session);

    if (!withdrawal) {
      throw new Error(`UsersWithdrawals not found for reference: ${data.reference}`);
    }

    withdrawal.status = 'failed';
    withdrawal.updatedAt = new Date();

    await withdrawal.save({ session });

    // Optionally refund user or take other actions
    const accountDetails = await PaymentAccounts.findOneAndUpdate(
      { refrence: withdrawal.userId },
      { $inc: { balance: (withdrawal.amount ? withdrawal.amount : 0) + 50 } }, // Refund
      { session }
    );

    await session.commitTransaction();

    if (withdrawal.platform === 'whatsapp') {
      sendMessageW(
        withdrawal.userId as string,
        `Your withdrawal of  ${withdrawal.amount} to: \nAccount Name: ${
          withdrawal.accountName
        } \nAccount Number: ${withdrawal.accounNumber} \nBank Name: ${
          withdrawal.bankName
        } \nat ${dateFormatter(
          withdrawal.createdAt as Date
        )} Failed, your wallet have been refunded. \n\nYour account balance is ₦${
          accountDetails?.balance
        }`
      );
    } else if (withdrawal.platform === 'facebook') {
      sendMessage(withdrawal.userId as string, {
        text: `Your withdrawal of  ${withdrawal.amount} to: \nAccount Name: ${
          withdrawal.accountName
        } \nAccount Number: ${withdrawal.accounNumber} \nBank Name: ${
          withdrawal.bankName
        } \nat ${dateFormatter(
          withdrawal.createdAt as Date
        )} Failed, your  wallet have been  refunded. \n\nYour account balance is ₦${
          accountDetails?.balance
        }`,
      });
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export default handleTransferWebhook;
