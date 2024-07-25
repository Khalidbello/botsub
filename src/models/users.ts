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
    firstTransactOfMonth: Date,
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

const users = mongoose.model('users', schema);

export default users;