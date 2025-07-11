import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
  },
  email: String,
  senderId: String,
  platform: String,
  txRef: String,
  status: String, // 'delivered', 'refunded'
  product: String,
  amount: Number,
  beneficiary: String,
  accountType: String,
  transactionType: String,
  profit: Number,
  price: Number,
  info: String, // this will hold info as to the error encountered when the transaction failed or succes message
  date: Date,
});

const Transactions = mongoose.model('Transactions', schema);

export default Transactions;
