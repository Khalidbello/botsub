const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    id: {
        type: Number,
        unique: true
    },
    firstPurchase: Boolean, // this particular property is use to check if its a user first time purchasing so as to credit the referrer
    email: String,
    nextAction: String,
    purchasePayload: {
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
    },
    firstTransactOfMonth: Date,
    referrer: Number,
    referrals: [{ id: Number }],
    claimedReferrals: [{ id: Number }]
});

module.exports = mongoose.model('botUsers', Schema);