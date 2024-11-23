import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user_id: Number,
  account_number: String,
  transactNum: Number,
  ref: Number,
  date: Date,
});

const GeneratedAccounts = mongoose.model('GeneratedAccounts', schema);

export default GeneratedAccounts;
