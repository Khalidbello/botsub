import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
  },
  winners: [{ id: String, time: Date, claimed: Boolean }],
  createdAt: Date,
});

const Whatsapp3GBWinners = mongoose.model('Whatsapp3GBWinners', Schema);

export default Whatsapp3GBWinners;
