import mongoose from "mongoose";

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