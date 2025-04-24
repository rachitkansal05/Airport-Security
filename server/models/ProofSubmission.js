const mongoose = require('mongoose');

const ProofSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  proofData: {
    type: String,
    required: true
  },
  publicData: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationNotes: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('ProofSubmission', ProofSubmissionSchema);