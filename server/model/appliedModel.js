const mongoose = require('mongoose')

const appliedSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: {
        type: String,
        enum: ['Applied', 'Interviewed', 'Selected', 'Rejected'],
        default: "Applied"
    }
});

const appliedModel = mongoose.model('Applied', appliedSchema);
module.exports = appliedModel;