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
  clubName: {
    type: String,
    default: ''
  },
  currentPassword: {
    type: String,
    default: ''
  },
  newPassword: {
    type: String,
    default: ''
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
  },
  generatedPasswordByAdmin: {
    type: String,
    default: ''
  },
  history: [
    {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        required: true
      },
      comment: {
        type: String,
        default: ''
      },
      actedBy: {
        type: String,
        default: 'system'
      },
      actedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('PasswordChangeRequest', passwordChangeRequestSchema);
