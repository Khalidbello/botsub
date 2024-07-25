const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const schema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        required: true
    },
    email: String,
    senderId: String,
    txRef: String,
    status: Boolean,
    product: String,
    beneficiary: String,
    date: Date,
});

const Transactions = mongoose.model('Transactions', schema);

export default Transactions;