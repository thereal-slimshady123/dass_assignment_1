const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  clubName: {
    type: String,
    required: [true, 'Club name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Club', clubSchema);
