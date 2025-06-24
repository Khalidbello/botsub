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
  free3GBNetwork: String,
  free3GBPhoneNumber: String,
  free3GBNetworkId: Number,
  free3GBPlanId: Number,
});

const withdrawalData = new mongoose.Schema({
  accountNumber: String,
  accountName: String,
  bank: { id: Number, code: String, name: String },
  bankCode: String,
  amount: Number,
  bankListing: [{ id: Number, code: String, name: String }],
});

const Schema = new mongoose.Schema({
  id: {
    type: String,
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
  withdrawalData: withdrawalData,
  firstTransactOfMonth: Date,
  // grand slam offer related info
  lastOfferReminder: Date,
  lastLostOfferReminder: Date,
  win: Date,
  claimed: Date,
  monthOfTransaction: Date, // holda the current month the user is transacting for
  numberOfTransactionForMonth: Number, // holds the number of transaction the user has carried out for that month;
  referrer: Number,
  referrals: [{ id: Number }],
  claimedReferrals: [{ id: Number }],
  createdAt: Date,
});

const WhatsappBotUsers = mongoose.model('WhatsaapBotUsers', Schema);

export default WhatsappBotUsers;
