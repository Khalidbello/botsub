const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    issue: String,
    date: Date,
    reporterId: String,
    platformType: String
})
module.exports = mongoose.model('ReportedIssues', schema);