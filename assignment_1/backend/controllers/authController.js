const User=require('../models/User');
const jwt=require('jsonwebtoken');

const token_generator = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const register=async(req,res)=>
{
    try
    {
        const {firstName,lastName,email,password, role}=req.body;
        if(!firstName||!lastName||!email||!password||!role)
        {
            return res.status(400).json({success:false, message:"Please provide all required fields"});
        }
        const existingUser=await User.findOne({email});
        if(existingUser)
        {
            return res.status(400).json({success: false, message: "Account with this username already exists"});
        }
        const user=await User.create({firstName, lastName, email, password, role: 'user'});
        const token=token_generator(user._id);
        res.status(201).json
        ({
          success: true, 
          message: "User has been registered successfully", 
          token,
          user: 
          {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          }
        });
    }
    catch(error)
    {
        console.error('Register error:', error);
        res.status(500).json({success:false, message:"Server error"});
    }
}

    
const login=async(req,res)=>
{
    try
    {
        const {email, password, role}=req.body;
        if(!email||!password)
        {
            return res.status(400).json({success: false, message: "Please provide email and password"});
        }
        const validateUser=await User.findOne({email});
        if(!validateUser)
        {
            return res.status(401).json({success: false, message: "Invalid credentials"});
        }
        const isPasswordCorrect = await validateUser.comparePassword(password);
        if(!isPasswordCorrect)
        {
            return res.status(401).json({success: false, message: "Invalid credentials"});
        }
        const token=token_generator(validateUser._id);
        res.status(200).json({
          success: true, 
          message: "Login successful", 
          token,
          user: 
          {
            id: validateUser._id,
            firstName: validateUser.firstName,
            lastName: validateUser.lastName,
            email: validateUser.email,
            role: validateUser.role
          }
        });
    }
    catch(error)
    {
        console.error('Login error:', error);
        res.status(500).json({success:false, message:"Server error"});
    }
};

const createOrganizer = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false, 
        message: "Please provide all required fields"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false, 
        message: "Account with this email already exists"
      });
    }

    const organizer = await User.create
    ({
      firstName, 
      lastName, 
      email, 
      password, 
      role: 'organizer'
    });

    res.status(201).json
    ({
      success: true, 
      message: "Organizer account created successfully",
      organizer: {
        id: organizer._id,
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email,
        role: organizer.role
      }
    });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  createOrganizer,
  getMe
};
