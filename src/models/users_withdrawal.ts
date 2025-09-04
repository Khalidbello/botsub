import mongoose from 'mongoose';
import { balances } from '../modules/admin/statistics';

const Schema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
  },
  userId: String,
  accountName: String,
  accounNumber: String,
  bankName: String,
  status: String,
  amount: Number,
  createdAt: Date,
  updatedAt: Date,
  platform: String,
  balance: Number,
});

const UsersWithdrawals = mongoose.model('usersWithdrawals', Schema);

export default UsersWithdrawals;
