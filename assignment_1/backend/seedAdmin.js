const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding');
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) 
    {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    const admin = await User.create
    ({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@research.iiit.ac.in',
      password: 'admin123', 
      role: 'admin'
    });

    console.log('Admin user created successfully:', admin.email);
    process.exit(0);
  }
  catch (error) 
  {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
