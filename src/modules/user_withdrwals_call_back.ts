import express from 'express';
import mongoose from 'mongoose';
import UsersWithdrawals from '../models/users_withdrawal';
import PaymentAccounts from '../models/payment-accounts';

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

    // Update user balance or other business logic
    await PaymentAccounts.updateOne(
      { refrence: withdrawal.userId },
      { $inc: { balance: -(withdrawal.amount || 0) } },
      { session }
    );

    await session.commitTransaction();
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
    await PaymentAccounts.updateOne(
      { refrence: withdrawal.userId },
      { $inc: { balance: withdrawal.amount } }, // Refund
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Handle reversed transfers
async function handleTransferReversed(data: any) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const withdrawal = await UsersWithdrawals.findOne({
      reference: data.reference,
    }).session(session);

    if (!withdrawal) {
      throw new Error(`UsersWithdrawals not found for reference: ${data.reference}`);
    }

    withdrawal.status = 'reversed';
    withdrawal.updatedAt = new Date();

    await withdrawal.save({ session });

    // Refund the user
    await PaymentAccounts.updateOne(
      { refrence: withdrawal.userId },
      { $inc: { balance: withdrawal.amount } },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export { handleTransferCompleted, handleTransferFailed, handleTransferReversed };
