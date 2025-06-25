import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
  },
  winners: [{ id: String, time: Date, claimed: Boolean }],
  createdAt: Date,
});

const FB3GBWinners = mongoose.model('FB3GBWinners', Schema);

export default FB3GBWinners;
