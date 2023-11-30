const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const schema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    network: String,
    dataSize: String,
    dataFrequency: Number,
    gender: String,
});

module.exports = mongoose.model('Survey', schema);