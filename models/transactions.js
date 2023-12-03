const mongoose = require('mongoose'); 
const { ObjectId } = require('mongodb');

const schema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        required: true
    },
    email: String,
    txRef: String,
    status: Boolean,
    product: String,
    beneficiary: String,
    date: Date
});

module.exports = mongoose.model('Transactions', schema);