const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['user', 'organizer', 'admin'],
    default: 'user',
    required: [true, 'Role is required']
  },
  userType: {
    type: String,
    enum: ['IIIT', 'nonIIIT'],
    required: function() { return this.role === 'user'; }
  },
  college_name: {
    type: String,
    required: function() { return this.role === 'user'; },
    trim: true
  },
  phone_number: {
    type: String,
    required: function() { return this.role === 'user'; },
    trim: true
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    default: null
  },
  // Organizer fields
  organizerName: {
    type: String,
    trim: true,
    required: function() { return this.role === 'organizer'; }
  },
  organizerCategory: {
    type: String,
    enum: ['club', 'organization', 'community', 'business', 'other'],
    default: 'club'
  },
  organizerDescription: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  discordWebhookUrl: {
    type: String,
    trim: true,
    default: null
  },
  enableDiscordNotifications: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'archived'],
    default: 'active'
  }
},
{
  timestamps: true
});

userSchema.pre('validate', function() {
  if (this.role === 'user' && this.userType === 'IIIT') {
    const validDomains = ['@research.iiit.ac.in', '@students.iiit.ac.in', '@iiit.ac.in'];
    const isValidDomain = validDomains.some(domain => this.email.endsWith(domain));

    if (!isValidDomain) {
      this.invalidate('email', 'IIIT userType requires email from @research.iiit.ac.in, @students.iiit.ac.in, or @iiit.ac.in');
    }
  }
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);