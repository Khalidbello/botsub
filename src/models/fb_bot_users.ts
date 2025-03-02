import mongoose from 'mongoose';
const purchasePayload = new mongoose.Schema({
  product: String,
  network: String,
  price: Number,
  phoneNumber: String,
  transactionType: String,
  size: String,
  index: String,
  planID: Number,
  networkID: Number,
  refereeId: Number,
  outStanding: Boolean,
  platform: String,
});

const Schema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
  },
  botResponse: Boolean,
  transactNum: Number,
  lastTransact: Date,
  lastMessage: Date,
  firstPurchase: Boolean, // this particular property is use to check if its a user first time purchasing so as to credit the referrer
  email: String,
  nextAction: String,
  purchasePayload: purchasePayload,
  firstTransactOfMonth: Date,
  referrer: Number,
  referrals: [{ id: Number }],
  claimedReferrals: [{ id: Number }],
  createdAt: Date,
});

const BotUsers = mongoose.model('botUsers', Schema);

export default BotUsers;
