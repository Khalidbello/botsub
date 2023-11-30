const mongoose = require('mongoose');
const validator = require('validator');

// defining users schema
const schema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        validate: (value) => {
            return validator.isEmail(value);
        }
    },
    lastTransct: Date,
    survey: {
        network: String,
        dataSize: String,
        dataFrequency: Number,
        gender: String,
    }
});

module.exports = mongoose.model('users', schema)