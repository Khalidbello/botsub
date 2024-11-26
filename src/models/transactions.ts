import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
  },
  email: String,
  senderId: String,
  txRef: String,
  status: Boolean,
  product: String,
  beneficiary: String,
  info: String, // this will hold info as to the error encountered when the transaction failed or succes message
  date: Date,
});

const Transactions = mongoose.model('Transactions', schema);

export default Transactions;
