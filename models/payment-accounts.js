const mongoose = require('mongoose'); 

const schema = new mongoose.Schema({
    refrence: String,
    bankName: String,
    balance: Number,
    accountName: String,
    accountNumber: String,
    botType: String,
    bvn: Number
});

module.exports = mongoose.model('PaymentAccounts', schema);