import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  amount: Number,
  transactionId: String,
  date: Date,
  transactionType: String,
  paymentAccountType: String,
});

const Profits = mongoose.model('Profits', schema);

export default Profits;
