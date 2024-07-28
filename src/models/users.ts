import mongoose from 'mongoose';
const validator = require('validator');

// defining users schema
const schema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        validate: (value: string) => {
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

const Users = mongoose.model('users', schema);

export default Users;