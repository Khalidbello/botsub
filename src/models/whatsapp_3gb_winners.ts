import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
  },
  winners: [{ id: Number, time: Date }],
  createdAt: Date,
});

const Whatsapp3GBWinners = mongoose.model('Whatsapp3GBWinners', Schema);

export default Whatsapp3GBWinners;
