const mongoose = require('mongoose');

const passwordChangeRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  currentPassword: {
    type: String,
    required: true
  },
  newPassword: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  processedBy: {
    type: String,
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PasswordChangeRequest', passwordChangeRequestSchema);
