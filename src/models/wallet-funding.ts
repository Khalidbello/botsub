import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  transactionId: Number,
  amount: Number,
  email: String,
  userId: String,
  whatsaapId: String,
  date: Date,
});

const WalletFundings = mongoose.model('TopUps', schema);

export default WalletFundings;
