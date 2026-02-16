const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

module.exports = mongoose.model('User', userSchema);
