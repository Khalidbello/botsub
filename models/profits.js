const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    amount: Number,
    transactionId: String,
    data: Date,
    transactionType: 'string',
});

module.exports = mongoose.model('Profits', schema);