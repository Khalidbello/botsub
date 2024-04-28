const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    description: String,
    date: Date,
    reporterId: String,
    platformType: String,
    status: Boolean
})
module.exports = mongoose.model('ReportedIssues', schema);