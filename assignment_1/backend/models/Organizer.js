const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  organizerName: {
    type: String,
    required: [true, 'Organizer name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    default: 'organizer'
  } 
},
{
  timestamps: true
});

module.exports = mongoose.model('Organizer', userSchema);
