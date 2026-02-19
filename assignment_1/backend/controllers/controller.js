const User=require('../models/User');
const Admin=require('../models/admin');
const Club=require('../models/Club');
const Organizer=require('../models/Organizer');
const Event=require('../models/events');
const jwt=require('jsonwebtoken');
const crypto = require('crypto');
const { sendRegistrationEmail, sendPasswordResetEmail, sendEventRegistrationEmail, sendPasswordChangeEmail } = require('../config/email');

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
        
        // Send registration confirmation email
        sendRegistrationEmail(email, firstName);
        
        res.status(201).json
        ({
          success: true, 
          message: "User has been registered successfully. A confirmation email has been sent to your email address.", 
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
      event_tags,
      customForm,
      status
    } = req.body;

    console.log('Received event data:', req.body);

    if (!eventName || !description || !type || !eligibility || !reg_deadline || !event_start || !event_end || reg_limit === undefined || reg_fee === undefined || !event_tags) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    // Use authenticated user's ID from the token
    const organizerId = req.user.id || req.user._id;
    const organizer = await User.findById(organizerId);
    
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(403).json({ success: false, message: "Only organizers can create events" });
    }

    // Ensure event_tags is an array
    let tagsArray = event_tags;
    if (typeof event_tags === 'string') {
      tagsArray = event_tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (!Array.isArray(tagsArray) || tagsArray.length === 0) {
      return res.status(400).json({ success: false, message: "At least one event tag is required" });
    }

    const eventData = {
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
      event_tags: tagsArray,
      status: status || 'draft'
    };

    // Add custom form if provided
    if (customForm && Array.isArray(customForm) && customForm.length > 0) {
      eventData.customForm = customForm;
    }

    const event = await Event.create(eventData);

    console.log('Event created successfully:', event._id);

    res.status(201).json({ success: true, message: "Event created successfully", event });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
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

const incrementEventRegistration = async (req, res) => {
  try {
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ success: false, message: "Event ID is required" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Increment registration count
    event.reg_count = (event.reg_count || 0) + 1;
    await event.save();

    res.status(200).json({ 
      success: true, 
      message: "Registration count updated",
      reg_count: event.reg_count 
    });
  } catch (error) {
    console.error('Increment registration error:', error);
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
    _id: eventDoc._id,
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
    reg_count: eventDoc.reg_count || 0,
    registrations24h: eventDoc.registrations24h || 0,
    status: eventDoc.status || 'draft',
    stock: eventDoc.type === 'merchandise' ? eventDoc.reg_limit : undefined,
    customForm: eventDoc.customForm,
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

// Forgot password - send reset token
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link will be sent shortly' 
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send reset email
    await sendPasswordResetEmail(email, user.firstName, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email has been sent to your email address'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password - with validation email
const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send password change confirmation email
    await sendPasswordChangeEmail(user.email, user.firstName);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. A confirmation email has been sent.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Send event registration email
const sendEventRegistrationEmailHandler = async (req, res) => {
  try {
    const { email, firstName, eventName, eventDate } = req.body;

    if (!email || !firstName || !eventName || !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, firstName, eventName, and eventDate'
      });
    }

    await sendEventRegistrationEmail(email, firstName, eventName, eventDate);

    res.status(200).json({
      success: true,
      message: 'Event registration email sent'
    });
  } catch (error) {
    console.error('Send event registration email error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide token, new password, and confirm password' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Hash the token to find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired password reset token' 
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrganizerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizer = await User.findById(userId);
    
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(404).json({ success: false, message: "Organizer not found" });
    }

    const {
      organizerName,
      organizerCategory,
      organizerDescription,
      contactEmail,
      contactPhone,
      discordWebhookUrl,
      enableDiscordNotifications
    } = req.body;

    // Update profile fields
    if (organizerName) organizer.organizerName = organizerName;
    if (organizerCategory) organizer.organizerCategory = organizerCategory;
    if (organizerDescription) organizer.organizerDescription = organizerDescription;
    if (contactEmail) organizer.contactEmail = contactEmail;
    if (contactPhone) organizer.contactPhone = contactPhone;
    if (discordWebhookUrl !== undefined) organizer.discordWebhookUrl = discordWebhookUrl;
    if (enableDiscordNotifications !== undefined) organizer.enableDiscordNotifications = enableDiscordNotifications;

    await organizer.save();

    res.status(200).json({
      success: true,
      message: "Organizer profile updated successfully",
      organizer
    });
  } catch (error) {
    console.error('Update organizer profile error:', error);
    res.status(500).json({ success: false, message: "Server error" });
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
  getClubs,
  forgotPassword,
  resetPassword,
  changePassword,
  sendEventRegistrationEmailHandler,
  updateOrganizerProfile,
  incrementEventRegistration
};
