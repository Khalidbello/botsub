import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user_id: Number,
  account_number: String,
  transactNum: Number,
  ref: Number,
  amount_to_be_paid: Number,
  date: Date,
});

const GeneratedOAccounts = mongoose.model('GeneratedOAccounts', schema);

export default GeneratedOAccounts;
