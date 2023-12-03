const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    id: {
        type: Number,
        unique: true
    },
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
       networkID: Number
    }
});

module.exports = mongoose.model('botUsers', Schema);