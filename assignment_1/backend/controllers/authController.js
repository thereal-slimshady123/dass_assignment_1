const User=require('../models/User');
const Club=require('../models/Club');
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

const deleteOrganizer = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false, 
        message: "Please provide email"
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false, 
        message: "User not found"
      });
    }

    if (user.role !== 'organizer') {
      return res.status(400).json({
        success: false, 
        message: "User is not an organizer"
      });
    }

    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      success: true, 
      message: "Organizer deleted successfully"
    });
  } catch (error) {
    console.error('Delete organizer error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const addClub=async(req,res)=>
{
  try
  {
    const {clubName, description}=req.body;
    if(!clubName||!description)
    {
      return res.status(400).json({success: false, message: "Please provide all required fields"});
    }
    const existing=await Club.findOne({clubName});
    if(existing)
    {
      return res.status(400).json({success: false, message: "Club with this name already exists"});
    }
    const club=await Club.create({clubName, description});
    res.status(201).json({success: true, message: "Club created successfully", club});
  }
  catch(error)
  {
    if(error)
    {
      console.error('Add club error:', error);
      res.status(500).json({success: false, message: "Server error"});
    }
  }
};

const deleteClub=async(req,res)=>
{
  try
  {
    const {clubName}=req.body;
    if(!clubName)
    {
      return res.status(400).json({success: false, message: "Please provide club name"});
    }
    const club=await Club.findOne({clubName});
    if(!club)
    {
      return res.status(404).json({success: false, message: "Club not found"});
    }
    await Club.findByIdAndDelete(club._id);
    res.status(200).json({success: true, message: "Club deleted successfully"});
  }
  catch(error)
  {
    console.error('Delete club error:', error);
    res.status(500).json({success: false, message: "Server error"});
  }
};

module.exports = {
  register,
  login,
  createOrganizer,
  deleteOrganizer,
  getMe,
  addClub,
  deleteClub
};
