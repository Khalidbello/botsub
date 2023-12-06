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
    lastTransact: Date,
    survey: {
        network: String,
        dataSize: String,
        dataFrequency: Number,
        gender: String,
    },
    failedMonthlyBonus: {
        number: Number,
        netwrok: Number
    }
});

module.exports = mongoose.model('users', schema)