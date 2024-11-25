import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  id: String,
  user_id: Number,
  account_number: String,
  transactNum: Number,
  amount_to_be_paid: Number,
  currency: String,
  date: Date,
});

const GeneratedOAccounts = mongoose.model('GeneratedOAccounts', schema);

export default GeneratedOAccounts;
