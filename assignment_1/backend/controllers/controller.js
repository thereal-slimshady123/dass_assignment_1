const User=require('../models/User');
const Admin=require('../models/admin');
const Club=require('../models/Club');
const Organizer=require('../models/Organizer');
const Event=require('../models/events');
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
        console.log('Registration request body:', req.body);
          const {firstName,lastName,email,password, userType, college_name, phone_number}=req.body;
        
        console.log('Extracted fields:', {
          firstName, lastName, email, password: '***', userType, college_name, phone_number
        });
        
          if(!firstName||!lastName||!email||!password||!userType||!college_name||!phone_number)
        {
            console.log('Validation failed - missing fields:', {
                firstName: !!firstName, 
                lastName: !!lastName, 
                email: !!email, 
                password: !!password, 
               userType: !!userType, 
                college_name: !!college_name, 
                phone_number: !!phone_number
            });
            return res.status(400).json({success:false, message:"Please provide all required fields"});
        }
        
          if(!['IIIT', 'nonIIIT'].includes(userType))
        {
            console.log('Invalid userType:', userType);
            return res.status(400).json({success:false, message:"Invalid userType. Must be 'IIIT' or 'nonIIIT'"});
        }
        
          if(userType === 'IIIT') {
            const validDomains = ['@research.iiit.ac.in', '@students.iiit.ac.in', '@iiit.ac.in'];
            const isValidDomain = validDomains.some(domain => email.endsWith(domain));
            
            if(!isValidDomain) {
                console.log('Invalid IIIT email:', email);
                return res.status(400).json({
                    success:false, 
                 message:"IIIT userType requires email from @research.iiit.ac.in, @students.iiit.ac.in, or @iiit.ac.in"
                });
            }
        }
        
        const existingUser=await User.findOne({email});
        if(existingUser)
        {
            console.log('User already exists:', email);
             return res.status(400).json({success: false, message: "Account with this email already exists"});
        }
        
        console.log('Creating user...');
           const user=await User.create({firstName, lastName, email, password, role: 'user', userType, college_name, phone_number});
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
            role: user.role,
            userType: user.userType
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
        const {email, password}=req.body;
        if(!email||!password)
        {
            return res.status(400).json({success: false, message: "Please provide email and password"});
        }
        // Admin login path
        const admin=await Admin.findOne({email});
        if(admin)
        {
            const isAdminPasswordCorrect = await admin.comparePassword(password);
            if(!isAdminPasswordCorrect)
            {
                return res.status(401).json({success: false, message: "Invalid credentials"});
            }
            const token=token_generator(admin._id);
            return res.status(200).json({
              success: true,
              message: "Login successful",
              token,
              user:
              {
                id: admin._id,
                adminName: admin.adminName,
                email: admin.email,
                role: 'admin'
              }
            });
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
            role: validateUser.role,
            userType: validateUser.userType
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

const addEvent = async (req, res) => {
  try {
    const {
      eventName,
      description,
      type,
      eligibility,
      reg_deadline,
      event_start,
      event_end,
      reg_limit,
      reg_fee,
      organizerEmail,
      event_tags
    } = req.body;

    if (!eventName || !description || !type || !eligibility || !reg_deadline || !event_start || !event_end || reg_limit === undefined || reg_fee === undefined || !organizerEmail || !event_tags || !Array.isArray(event_tags) || event_tags.length === 0) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const organizer = await User.findOne({ email: organizerEmail, role: 'organizer' });
    if (!organizer) {
      return res.status(400).json({ success: false, message: "Organizer not found or not an organizer" });
    }

    const event = await Event.create({
      eventName,
      description,
      type,
      eligibility,
      reg_deadline,
      event_start,
      event_end,
      reg_limit,
      reg_fee,
      organizer_id: organizer._id,
      event_tags
    });

    res.status(201).json({ success: true, message: "Event created successfully", event });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { eventName } = req.body;
    if (!eventName) {
      return res.status(400).json({ success: false, message: "Please provide event name" });
    }

    const event = await Event.findOne({ eventName });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    await Event.findByIdAndDelete(event._id);
    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const formatEvent = (eventDoc) => {
  const organizer = eventDoc.organizer_id
    ? {
        id: eventDoc.organizer_id._id,
        name: `${eventDoc.organizer_id.firstName || ""} ${eventDoc.organizer_id.lastName || ""}`.trim(),
        email: eventDoc.organizer_id.email
      }
    : null;

  return {
    id: eventDoc._id,
    eventName: eventDoc.eventName,
    description: eventDoc.description,
    type: eventDoc.type,
    eligibility: eventDoc.eligibility,
    reg_deadline: eventDoc.reg_deadline,
    event_start: eventDoc.event_start,
    event_end: eventDoc.event_end,
    reg_limit: eventDoc.reg_limit,
    reg_fee: eventDoc.reg_fee,
    reg_count: 0,
    registrations24h: 0,
    stock: eventDoc.type === 'merchandise' ? eventDoc.reg_limit : undefined,
    organizer,
    event_tags: eventDoc.event_tags || []
  };
};

const getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer_id', 'firstName lastName email')
      .lean();

    res.status(200).json({
      success: true,
      events: events.map(formatEvent)
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer_id', 'firstName lastName email')
      .lean();

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getClubs = async (req, res) => {
  try {
    const clubs = await Club.find().lean();
    res.status(200).json({ success: true, clubs });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  createOrganizer,
  deleteOrganizer,
  getMe,
  addClub,
  deleteClub,
  addEvent,
  deleteEvent,
  getEvents,
  getEventById,
  getClubs
};
