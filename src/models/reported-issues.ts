import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  date: Date,
  reporterId: String,
  platform: String,
  status: Boolean,
});

const ReportedIssues = mongoose.model('ReportedIssues', schema);

export default ReportedIssues;
