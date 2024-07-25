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

const Survey = mongoose.model('Survey', schema);

export default Survey;