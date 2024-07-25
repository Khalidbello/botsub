const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    amount: Number,
    transactionId: String,
    date: Date, // Changed from 'data' to 'date'
    transactionType: String, // Changed from 'string' to String
});

const Profits = mongoose.model('Profits', schema);

export default Profits;
