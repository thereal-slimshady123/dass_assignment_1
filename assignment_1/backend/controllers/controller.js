const User = require('../models/User');
const Admin = require('../models/admin');
const Club = require('../models/Club');
const Organizer = require('../models/Organizer');
const Event = require('../models/events');
const PasswordChangeRequest = require('../models/PasswordChangeRequest');
const Attendance = require('../models/Attendance');
const MerchandiseOrder = require('../models/MerchandiseOrder');
const ForumMessage = require('../models/ForumMessage');
const QRCodeLib = require('qrcode');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendRegistrationEmail, sendOrganizerCredentialsEmail, sendPasswordResetEmail, sendEventRegistrationEmail, sendPasswordChangeEmail } = require('../config/email');
const { uploadDataUri } = require('../config/cloudinary');
const { emitForumUpdate } = require('../config/socket');

const token_generator = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const generateTemporaryPassword = () => {
  return crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
};

const createOrganizerResetRequestRecord = async ({ user, reason }) => {
  const existingRequest = await PasswordChangeRequest.findOne({
    userId: user._id,
    status: 'pending'
  });

  if (existingRequest) {
    return {
      alreadyPending: true,
      request: existingRequest
    };
  }

  const passwordChangeRequest = await PasswordChangeRequest.create({
    userId: user._id,
    userEmail: user.email,
    userName: `${user.firstName} ${user.lastName}`,
    userRole: user.role,
    clubName: user.organizerName || `${user.firstName} ${user.lastName}`,
    reason,
    status: 'pending',
    history: [
      {
        status: 'pending',
        comment: reason,
        actedBy: user.email,
        actedAt: new Date()
      }
    ]
  });

  return {
    alreadyPending: false,
    request: passwordChangeRequest
  };
};

const register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    const { firstName, lastName, email, password, userType, college_name, phone_number } = req.body;

    console.log('Extracted fields:', {
      firstName, lastName, email, password: '***', userType, college_name, phone_number
    });

    if (!firstName || !lastName || !email || !password || !userType || !college_name || !phone_number) {
      console.log('Validation failed - missing fields:', {
        firstName: !!firstName,
        lastName: !!lastName,
        email: !!email,
        password: !!password,
        userType: !!userType,
        college_name: !!college_name,
        phone_number: !!phone_number
      });
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    if (!['IIIT', 'nonIIIT'].includes(userType)) {
      console.log('Invalid userType:', userType);
      return res.status(400).json({ success: false, message: "Invalid userType. Must be 'IIIT' or 'nonIIIT'" });
    }

    if (userType === 'IIIT') {
      const validDomains = ['@research.iiit.ac.in', '@students.iiit.ac.in', '@iiit.ac.in'];
      const isValidDomain = validDomains.some(domain => email.endsWith(domain));

      if (!isValidDomain) {
        console.log('Invalid IIIT email:', email);
        return res.status(400).json({
          success: false,
          message: "IIIT userType requires email from @research.iiit.ac.in, @students.iiit.ac.in, or @iiit.ac.in"
        });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ success: false, message: "Account with this email already exists" });
    }

    console.log('Creating user...');
    const user = await User.create({ firstName, lastName, email, password, role: 'user', userType, college_name, phone_number });
    const token = token_generator(user._id);

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
  catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }
    // Admin login path
    const admin = await Admin.findOne({ email });
    if (admin) {
      const isAdminPasswordCorrect = await admin.comparePassword(password);
      if (!isAdminPasswordCorrect) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
      const token = token_generator(admin._id);
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

    const validateUser = await User.findOne({ email });
    if (!validateUser) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check if user is disabled or archived
    if (validateUser.status && validateUser.status !== 'active') {
      return res.status(403).json({ success: false, message: "Account is disabled or archived. Please contact admin." });
    }

    const isPasswordCorrect = await validateUser.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = token_generator(validateUser._id);
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
  catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createOrganizer = async (req, res) => {
  try {
    const { firstName, lastName, email, password, autoGenerate, organizerCategory } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Auto-generate password if requested
    let finalPassword = password;
    let generatedPassword = null;

    if (autoGenerate || !password) {
      generatedPassword = crypto.randomBytes(8).toString('hex');
      finalPassword = generatedPassword;
    }

    if (!finalPassword) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
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
        password: finalPassword,
        role: 'organizer',
        organizerName: `${firstName} ${lastName}`,
        organizerCategory: organizerCategory || 'club',
        status: 'active'
      });

    // Send credentials email to the organizer
    const emailPassword = generatedPassword || password;
    sendOrganizerCredentialsEmail(email, firstName, emailPassword);

    res.status(201).json
      ({
        success: true,
        message: "Organizer account created successfully",
        organizer: {
          id: organizer._id,
          firstName: organizer.firstName,
          lastName: organizer.lastName,
          email: organizer.email,
          role: organizer.role,
          generatedPassword: generatedPassword // Send generated password to admin
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

const addClub = async (req, res) => {
  try {
    const { clubName, description } = req.body;
    if (!clubName || !description) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }
    const existing = await Club.findOne({ clubName });
    if (existing) {
      return res.status(400).json({ success: false, message: "Club with this name already exists" });
    }
    const club = await Club.create({ clubName, description });
    res.status(201).json({ success: true, message: "Club created successfully", club });
  }
  catch (error) {
    if (error) {
      console.error('Add club error:', error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
};

const deleteClub = async (req, res) => {
  try {
    const { clubName } = req.body;
    if (!clubName) {
      return res.status(400).json({ success: false, message: "Please provide club name" });
    }
    const club = await Club.findOne({ clubName });
    if (!club) {
      return res.status(404).json({ success: false, message: "Club not found" });
    }
    await Club.findByIdAndDelete(club._id);
    res.status(200).json({ success: true, message: "Club deleted successfully" });
  }
  catch (error) {
    console.error('Delete club error:', error);
    res.status(500).json({ success: false, message: "Server error" });
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
    stock: eventDoc.type === 'merchandise' ? Math.max(0, (eventDoc.reg_limit || 0) - (eventDoc.reg_count || 0)) : undefined,
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

const getMyEvents = async (req, res) => {
  try {
    const organizerId = req.user.id || req.user._id;
    const events = await Event.find({ organizer_id: organizerId })
      .populate('organizer_id', 'firstName lastName email')
      .lean();

    res.status(200).json({
      success: true,
      events: events.map(formatEvent)
    });
  } catch (error) {
    console.error('Get my events error:', error);
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
    const { userId, email, currentPassword, newPassword, confirmPassword, reason } = req.body;

    // Find user by userId or email
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Organizers must request admin-driven reset
    if (user.role === 'organizer') {
      const normalizedReason = (reason || '').trim();
      if (!normalizedReason) {
        return res.status(400).json({
          success: false,
          message: 'Please provide reason for password reset request'
        });
      }

      const requestResult = await createOrganizerResetRequestRecord({ user, reason: normalizedReason });

      if (requestResult.alreadyPending) {
        return res.status(409).json({
          success: false,
          message: 'You already have a pending password reset request. Please wait for admin action.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Password reset request submitted successfully. Please wait for admin approval.',
        requestId: requestResult.request._id
      });
    }

    if ((!userId && !email) || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // If confirmPassword is provided, validate it matches
    if (confirmPassword && newPassword !== confirmPassword) {
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

    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // For non-organizer users (regular users), change password directly
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

const requestOrganizerPasswordReset = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const organizer = await User.findById(userId);

    if (!organizer || organizer.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can submit this request'
      });
    }

    const reason = (req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }

    const requestResult = await createOrganizerResetRequestRecord({ user: organizer, reason });

    if (requestResult.alreadyPending) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending password reset request.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Password reset request submitted successfully',
      request: requestResult.request
    });
  } catch (error) {
    console.error('Request organizer password reset error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getOrganizerPasswordResetHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const requests = await PasswordChangeRequest.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Get organizer password reset history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Send event registration email
const sendEventRegistrationEmailHandler = async (req, res) => {
  try {
    const { email, firstName, eventName, eventDate, ticketId, qrDataUrl } = req.body;
    console.log('Send event email request received:', { email, firstName, eventName, eventDate, ticketId: !!ticketId, hasQR: !!qrDataUrl });

    if (!email || !firstName || !eventName || !eventDate) {
      console.log('Missing fields for event email:', { email: !!email, firstName: !!firstName, eventName: !!eventName, eventDate: !!eventDate });
      return res.status(400).json({
        success: false,
        message: 'Please provide email, firstName, eventName, and eventDate'
      });
    }

    await sendEventRegistrationEmail(email, firstName, eventName, eventDate, ticketId, qrDataUrl);

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

// Get all organizers
const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'organizer' }).select('-password');
    res.status(200).json({
      success: true,
      count: organizers.length,
      organizers
    });
  } catch (error) {
    console.error('Get all organizers error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get public organizer list (for user-facing pages)
const getPublicOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'organizer', status: 'active' })
      .select('firstName lastName organizerName organizerCategory organizerDescription contactEmail _id');
    res.status(200).json({
      success: true,
      organizers: organizers.map(org => ({
        id: org._id,
        name: org.organizerName || `${org.firstName} ${org.lastName}`,
        category: org.organizerCategory || 'club',
        description: org.organizerDescription || '',
        email: org.contactEmail || ''
      }))
    });
  } catch (error) {
    console.error('Get public organizers error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all clubs
const getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find({});
    res.status(200).json({
      success: true,
      count: clubs.length,
      clubs
    });
  } catch (error) {
    console.error('Get all clubs error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update organizer status
const updateOrganizerStatus = async (req, res) => {
  try {
    const { email, status } = req.body;

    if (!email || !status) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and status"
      });
    }

    if (!['active', 'disabled', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active', 'disabled', or 'archived'"
      });
    }

    const organizer = await User.findOne({ email, role: 'organizer' });

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found"
      });
    }

    organizer.status = status;
    await organizer.save();

    res.status(200).json({
      success: true,
      message: `Organizer status updated to ${status}`,
      organizer: {
        id: organizer._id,
        email: organizer.email,
        status: organizer.status
      }
    });
  } catch (error) {
    console.error('Update organizer status error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update club status
const updateClubStatus = async (req, res) => {
  try {
    const { clubName, status } = req.body;

    if (!clubName || !status) {
      return res.status(400).json({
        success: false,
        message: "Please provide club name and status"
      });
    }

    if (!['active', 'disabled', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active', 'disabled', or 'archived'"
      });
    }

    const club = await Club.findOne({ clubName });

    if (!club) {
      return res.status(404).json({
        success: false,
        message: "Club not found"
      });
    }

    club.status = status;
    await club.save();

    res.status(200).json({
      success: true,
      message: `Club status updated to ${status}`,
      club: {
        id: club._id,
        clubName: club.clubName,
        status: club.status
      }
    });
  } catch (error) {
    console.error('Update club status error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all password reset requests
const getPasswordResetRequests = async (req, res) => {
  try {
    const usersWithResetTokens = await User.find({
      resetPasswordToken: { $ne: null },
      resetPasswordExpire: { $gt: Date.now() }
    }).select('firstName lastName email role resetPasswordExpire createdAt');

    res.status(200).json({
      success: true,
      count: usersWithResetTokens.length,
      requests: usersWithResetTokens
    });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Clear password reset request
const clearPasswordResetRequest = async (req, res) => {
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

    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset request cleared"
    });
  } catch (error) {
    console.error('Clear password reset request error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all password change requests
const getPasswordChangeRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const requests = await PasswordChangeRequest.find(query)
      .sort({ createdAt: -1 });

    const counts = {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };

    res.status(200).json({
      success: true,
      count: requests.length,
      counts,
      requests
    });
  } catch (error) {
    console.error('Get password change requests error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Approve password change request
const approvePasswordChangeRequest = async (req, res) => {
  try {
    const { requestId, adminNotes } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Please provide request ID"
      });
    }

    const request = await PasswordChangeRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Request has already been processed"
      });
    }

    const user = await User.findById(request.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const generatedPassword = generateTemporaryPassword();

    user.password = generatedPassword;
    await user.save();

    request.status = 'approved';
    request.processedBy = req.user.email || 'admin';
    request.processedAt = new Date();
    request.adminNotes = adminNotes || '';
    request.generatedPasswordByAdmin = generatedPassword;
    request.history.push({
      status: 'approved',
      comment: adminNotes || 'Approved by admin',
      actedBy: req.user.email || 'admin',
      actedAt: new Date()
    });
    await request.save();

    res.status(200).json({
      success: true,
      message: "Password reset request approved and new password generated",
      generatedPassword,
      organizerEmail: user.email,
      organizerName: `${user.firstName} ${user.lastName}`
    });
  } catch (error) {
    console.error('Approve password change request error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Reject password change request
const rejectPasswordChangeRequest = async (req, res) => {
  try {
    const { requestId, adminNotes } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Please provide request ID"
      });
    }

    const request = await PasswordChangeRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Request has already been processed"
      });
    }

    if (!adminNotes || !adminNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection comment is required'
      });
    }

    request.status = 'rejected';
    request.processedBy = req.user.email || 'admin';
    request.processedAt = new Date();
    request.adminNotes = adminNotes.trim();
    request.history.push({
      status: 'rejected',
      comment: adminNotes.trim(),
      actedBy: req.user.email || 'admin',
      actedAt: new Date()
    });
    await request.save();

    res.status(200).json({
      success: true,
      message: "Password reset request rejected"
    });
  } catch (error) {
    console.error('Reject password change request error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============ ATTENDANCE TRACKING ============

// Scan attendance — validate ticket & reject duplicates
const scanAttendance = async (req, res) => {
  try {
    const { eventId, ticketId, participantName, participantEmail } = req.body;

    if (!eventId || !ticketId) {
      return res.status(400).json({ success: false, message: 'Event ID and Ticket ID are required' });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check for duplicate scan
    const existing = await Attendance.findOne({ eventId, ticketId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate scan — this ticket has already been scanned',
        duplicate: true,
        originalScan: {
          scannedAt: existing.scannedAt,
          participantName: existing.participantName,
          participantEmail: existing.participantEmail
        }
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      eventId,
      ticketId,
      participantName: participantName || '',
      participantEmail: participantEmail || '',
      scannedAt: new Date(),
      scannedBy: req.user.id || req.user._id,
      isManualOverride: false,
      auditLog: [{
        action: 'QR_SCAN',
        performedBy: req.user.id || req.user._id,
        timestamp: new Date(),
        details: `Ticket ${ticketId} scanned via QR code`
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      attendance: {
        id: attendance._id,
        ticketId: attendance.ticketId,
        participantName: attendance.participantName,
        participantEmail: attendance.participantEmail,
        scannedAt: attendance.scannedAt
      }
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate scan — this ticket has already been scanned',
        duplicate: true
      });
    }
    console.error('Scan attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get attendance dashboard for an event
const getAttendanceDashboard = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const scannedRecords = await Attendance.find({ eventId })
      .sort({ scannedAt: -1 })
      .lean();

    const totalRegistered = event.reg_count || 0;
    const totalScanned = scannedRecords.length;
    const notScanned = Math.max(0, totalRegistered - totalScanned);
    const attendanceRate = totalRegistered > 0
      ? Math.round((totalScanned / totalRegistered) * 100)
      : 0;

    res.status(200).json({
      success: true,
      dashboard: {
        totalRegistered,
        totalScanned,
        notScanned,
        attendanceRate,
        scannedList: scannedRecords.map(r => ({
          id: r._id,
          ticketId: r.ticketId,
          participantName: r.participantName,
          participantEmail: r.participantEmail,
          scannedAt: r.scannedAt,
          isManualOverride: r.isManualOverride,
          overrideReason: r.overrideReason
        }))
      }
    });
  } catch (error) {
    console.error('Get attendance dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Manual override — mark attendance manually with audit log
const manualOverride = async (req, res) => {
  try {
    const { eventId, ticketId, participantName, participantEmail, reason } = req.body;

    if (!eventId || !ticketId) {
      return res.status(400).json({ success: false, message: 'Event ID and Ticket ID are required' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Override reason is required for audit purposes' });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check for duplicate
    const existing = await Attendance.findOne({ eventId, ticketId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This ticket has already been marked as attended',
        duplicate: true,
        originalScan: {
          scannedAt: existing.scannedAt,
          participantName: existing.participantName,
          isManualOverride: existing.isManualOverride
        }
      });
    }

    const attendance = await Attendance.create({
      eventId,
      ticketId,
      participantName: participantName || '',
      participantEmail: participantEmail || '',
      scannedAt: new Date(),
      scannedBy: req.user.id || req.user._id,
      isManualOverride: true,
      overrideReason: reason.trim(),
      auditLog: [{
        action: 'MANUAL_OVERRIDE',
        performedBy: req.user.id || req.user._id,
        timestamp: new Date(),
        details: `Manual override by organizer. Reason: ${reason.trim()}`
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Manual attendance override recorded with audit log',
      attendance: {
        id: attendance._id,
        ticketId: attendance.ticketId,
        participantName: attendance.participantName,
        participantEmail: attendance.participantEmail,
        scannedAt: attendance.scannedAt,
        isManualOverride: true,
        overrideReason: attendance.overrideReason
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This ticket has already been marked as attended',
        duplicate: true
      });
    }
    console.error('Manual override error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Export attendance report as CSV
const exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const records = await Attendance.find({ eventId }).sort({ scannedAt: 1 }).lean();

    const headers = ['Ticket ID', 'Participant Name', 'Participant Email', 'Scanned At', 'Manual Override', 'Override Reason'];
    const rows = records.map(r => [
      r.ticketId,
      r.participantName || 'N/A',
      r.participantEmail || 'N/A',
      new Date(r.scannedAt).toISOString(),
      r.isManualOverride ? 'Yes' : 'No',
      r.overrideReason || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${event.eventName}-attendance.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export attendance CSV error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============ MERCHANDISE PAYMENT VERIFICATION ============

// Helper: generate ticket ID
const generateTicketId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${stamp}-${rand}`;
};

// User: create merchandise order with payment proof
const createMerchandiseOrder = async (req, res) => {
  try {
    const { eventId, paymentProofImage, paymentProofMimeType, customFormResponses } = req.body;

    if (!eventId || !paymentProofImage) {
      return res.status(400).json({ success: false, message: 'Event ID and payment proof are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.type !== 'merchandise') {
      return res.status(400).json({ success: false, message: 'This endpoint is only for merchandise events' });
    }

    const formFields = Array.isArray(event.customForm) ? event.customForm : [];
    const answers = customFormResponses && typeof customFormResponses === 'object' ? customFormResponses : {};
    const missingRequiredFields = formFields
      .filter(field => field?.required)
      .filter(field => {
        const fieldKey = String(field.id);
        const value = answers[fieldKey];

        if (field.type === 'checkbox') {
          return value !== true;
        }

        return value === undefined || value === null || String(value).trim() === '';
      })
      .map(field => field.label || `Field ${field.id}`);

    if (missingRequiredFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please fill all required registration fields: ${missingRequiredFields.join(', ')}`
      });
    }

    // Prevent duplicate pending/approved orders from same user
    const existing = await MerchandiseOrder.findOne({
      eventId,
      participantEmail: req.user.email,
      status: { $in: ['pending', 'approved'] }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.status === 'approved'
          ? 'You already have an approved order for this event'
          : 'You already have a pending order awaiting approval',
        status: existing.status,
        orderId: existing._id
      });
    }

    const uploadResult = await uploadDataUri(paymentProofImage, 'dass/payment-proofs');

    const order = await MerchandiseOrder.create({
      eventId,
      eventName: event.eventName,
      organizerId: event.organizer_id,
      userId: req.user.id || req.user._id,
      participantName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      participantEmail: req.user.email,
      paymentProofImage: uploadResult.secure_url,
      paymentProofPublicId: uploadResult.public_id || '',
      paymentProofMimeType: paymentProofMimeType || 'image/jpeg',
      customFormResponses: answers,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Order submitted. Awaiting organizer approval.',
      order: { id: order._id, status: order.status, eventName: order.eventName }
    });
  } catch (error) {
    console.error('Create merchandise order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Organizer: get all orders for an event
const getMerchandiseOrders = async (req, res) => {
  try {
    const { eventId } = req.params;
    const orders = await MerchandiseOrder.find({ eventId }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Get merchandise orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Organizer: approve an order → decrement stock, generate QR, send email
const approveMerchandiseOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID is required' });

    const order = await MerchandiseOrder.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });
    }

    // Decrement stock (stock = reg_limit - reg_count)
    const event = await Event.findById(order.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    const stockRemaining = (event.reg_limit ?? 0) - (event.reg_count ?? 0);
    if (stockRemaining <= 0) {
      return res.status(400).json({ success: false, message: 'No stock remaining for this event' });
    }
    await Event.findByIdAndUpdate(order.eventId, { $inc: { reg_count: 1 } });

    // Generate ticket + QR (with participant info embedded)
    const ticketId = generateTicketId();
    const qrPayload = JSON.stringify({
      ticketId,
      name: order.participantName,
      email: order.participantEmail
    });
    const qrDataUrl = await QRCodeLib.toDataURL(qrPayload, { width: 300, margin: 2 });

    // Update order
    order.status = 'approved';
    order.ticketId = ticketId;
    order.qrDataUrl = qrDataUrl;
    order.reviewedBy = req.user.id || req.user._id;
    order.reviewedAt = new Date();
    await order.save();

    // Send confirmation email with QR
    try {
      await sendEventRegistrationEmail(
        order.participantEmail,
        order.participantName || 'Participant',
        order.eventName,
        new Date(event.event_start).toLocaleString(),
        ticketId,
        qrDataUrl
      );
    } catch (emailErr) {
      console.error('Approval email failed (non-fatal):', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Order approved. Ticket generated and email sent.',
      order: { id: order._id, ticketId, status: 'approved' }
    });
  } catch (error) {
    console.error('Approve merchandise order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Organizer: reject an order
const rejectMerchandiseOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID is required' });

    const order = await MerchandiseOrder.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });
    }

    order.status = 'rejected';
    order.rejectionReason = reason?.trim() || 'Payment could not be verified';
    order.reviewedBy = req.user.id || req.user._id;
    order.reviewedAt = new Date();
    await order.save();

    res.status(200).json({ success: true, message: 'Order rejected.', order: { id: order._id, status: 'rejected' } });
  } catch (error) {
    console.error('Reject merchandise order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// User: get their own merchandise orders
const getUserMerchandiseOrders = async (req, res) => {
  try {
    const email = req.user.email;
    const orders = await MerchandiseOrder.find({ participantEmail: email })
      .sort({ createdAt: -1 })
      .lean()
      .select('-paymentProofImage'); // don't send large base64 back to user list
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Get user merchandise orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const organizerId = req.user.id || req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Ensure the requesting organizer owns this event
    if (event.organizer_id.toString() !== organizerId.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this event' });
    }

    const { status: currentStatus, reg_count } = event;

    // Status-based edit rules
    if (currentStatus === 'ongoing' || currentStatus === 'completed') {
      // Only allow status transitions: ongoing→completed, ongoing→closed, completed→closed
      const { status: newStatus } = req.body;
      const allowedTransitions = {
        ongoing: ['completed', 'closed'],
        completed: ['closed']
      };
      if (!newStatus || !allowedTransitions[currentStatus]?.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Event is ${currentStatus}. Only status changes to [${(allowedTransitions[currentStatus] || []).join(', ')}] are allowed.`
        });
      }
      event.status = newStatus;
      await event.save();
      return res.status(200).json({ success: true, message: 'Event status updated', event: formatEvent(event.toObject ? { ...event.toObject(), organizer_id: null } : event) });
    }

    if (currentStatus === 'published' || currentStatus === 'closed') {
      const { description, reg_deadline, reg_limit, status: newStatus } = req.body;

      if (newStatus !== undefined && newStatus !== 'published' && newStatus !== 'closed' && newStatus !== 'ongoing') {
        return res.status(400).json({
          success: false,
          message: 'Published events can only be set to: published, ongoing, or closed'
        });
      }

      if (description !== undefined) event.description = description;

      if (reg_deadline !== undefined) {
        const newDeadline = new Date(reg_deadline);
        if (newDeadline <= new Date(event.reg_deadline)) {
          return res.status(400).json({ success: false, message: 'New registration deadline must be later than the current deadline' });
        }
        event.reg_deadline = newDeadline;
      }

      if (reg_limit !== undefined) {
        if (Number(reg_limit) <= event.reg_limit) {
          return res.status(400).json({ success: false, message: 'New registration limit must be higher than the current limit' });
        }
        event.reg_limit = Number(reg_limit);
      }

      if (newStatus !== undefined) event.status = newStatus;

      await event.save();
      const populated = await Event.findById(event._id).populate('organizer_id', 'firstName lastName email').lean();
      return res.status(200).json({ success: true, message: 'Event updated', event: formatEvent(populated) });
    }

    if (currentStatus === 'draft') {
      const {
        eventName, description, type, eligibility,
        reg_deadline, event_start, event_end,
        reg_limit, reg_fee, event_tags, customForm, status: newStatus
      } = req.body;

      if (eventName !== undefined) event.eventName = eventName;
      if (description !== undefined) event.description = description;
      if (type !== undefined) event.type = type;
      if (eligibility !== undefined) event.eligibility = eligibility;
      if (reg_deadline !== undefined) event.reg_deadline = new Date(reg_deadline);
      if (event_start !== undefined) event.event_start = new Date(event_start);
      if (event_end !== undefined) event.event_end = new Date(event_end);
      if (reg_limit !== undefined) event.reg_limit = Number(reg_limit);
      if (reg_fee !== undefined) event.reg_fee = Number(reg_fee);
      if (event_tags !== undefined) {
        let tags = event_tags;
        if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim()).filter(Boolean);
        if (Array.isArray(tags) && tags.length > 0) event.event_tags = tags;
      }

      if (customForm !== undefined) {
        if ((reg_count || 0) > 0) {
          return res.status(400).json({ success: false, message: 'Registration form is locked after the first registration is received' });
        }
        if (Array.isArray(customForm) && customForm.length > 0) {
          event.customForm = customForm;
        }
      }

      if (newStatus !== undefined) {
        const validStatuses = ['draft', 'published'];
        if (!validStatuses.includes(newStatus)) {
          return res.status(400).json({ success: false, message: 'Draft events can only be set to draft or published' });
        }
        event.status = newStatus;
      }

      await event.save();
      const populated = await Event.findById(event._id).populate('organizer_id', 'firstName lastName email').lean();
      return res.status(200).json({ success: true, message: 'Event updated', event: formatEvent(populated) });
    }

    return res.status(400).json({ success: false, message: 'Unknown event status' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const mapForumMessage = (message) => ({
  id: message._id,
  eventId: String(message.eventId),
  parentId: message.parentId ? String(message.parentId) : null,
  text: message.text,
  isAnnouncement: message.isAnnouncement,
  isPinned: message.isPinned,
  isDeleted: message.isDeleted,
  deletedBy: message.deletedBy || '',
  author: message.author,
  reactions: Object.fromEntries((message.reactions || new Map()).entries ? message.reactions.entries() : Object.entries(message.reactions || {})),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
});

const getEventForumMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const messages = await ForumMessage.find({ eventId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      messages: messages.map(mapForumMessage)
    });
  } catch (error) {
    console.error('Get forum messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const canUserPostInForum = async ({ user, eventId }) => {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const event = await Event.findById(eventId).lean();
  if (!event) return false;

  if (user.role === 'organizer' && String(event.organizer_id) === String(user.id || user._id)) {
    return true;
  }

  const hasAttendanceRegistration = await Attendance.findOne({ eventId, participantEmail: user.email }).lean();
  if (hasAttendanceRegistration) return true;

  const hasMerchApproval = await MerchandiseOrder.findOne({
    eventId,
    participantEmail: user.email,
    status: 'approved'
  }).lean();
  if (hasMerchApproval) return true;

  return false;
};

const createForumPost = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text, parentId = null, isAnnouncement = false } = req.body;

    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const allowed = await canUserPostInForum({ user: req.user, eventId });
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Only registered participants can post in this forum' });
    }

    let announcementFlag = false;
    if (isAnnouncement) {
      const event = await Event.findById(eventId).lean();
      const isOwnerOrganizer = req.user.role === 'organizer' && String(event?.organizer_id || '') === String(req.user.id || req.user._id);
      if (req.user.role === 'admin' || isOwnerOrganizer) {
        announcementFlag = true;
      }
    }

    const displayName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ')
      || req.user.adminName
      || req.user.organizerName
      || req.user.email
      || 'Participant';

    const post = await ForumMessage.create({
      eventId,
      parentId: parentId || null,
      text: trimmed,
      isAnnouncement: parentId ? false : announcementFlag,
      author: {
        id: String(req.user.id || req.user._id),
        name: displayName,
        email: req.user.email || '',
        role: req.user.role || 'user'
      }
    });

    emitForumUpdate(eventId, { type: 'message-created', messageId: String(post._id) });

    res.status(201).json({
      success: true,
      message: mapForumMessage(post)
    });
  } catch (error) {
    console.error('Create forum post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const checkModerationPermission = async ({ user, eventId }) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'organizer') return false;
  const event = await Event.findById(eventId).lean();
  return String(event?.organizer_id || '') === String(user.id || user._id);
};

const deleteForumPost = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;
    const allowed = await checkModerationPermission({ user: req.user, eventId });
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete messages' });
    }

    const message = await ForumMessage.findOne({ _id: messageId, eventId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.text = '[Message removed by moderator]';
    message.isDeleted = true;
    message.deletedBy = req.user.email || req.user.adminName || 'Moderator';
    await message.save();

    emitForumUpdate(eventId, { type: 'message-deleted', messageId });
    res.status(200).json({ success: true, message: mapForumMessage(message) });
  } catch (error) {
    console.error('Delete forum post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const togglePinForumPost = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;
    const allowed = await checkModerationPermission({ user: req.user, eventId });
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized to pin messages' });
    }

    const message = await ForumMessage.findOne({ _id: messageId, eventId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    emitForumUpdate(eventId, { type: 'message-pinned', messageId });
    res.status(200).json({ success: true, message: mapForumMessage(message) });
  } catch (error) {
    console.error('Toggle forum pin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleForumReactionController = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await ForumMessage.findOne({ _id: messageId, eventId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const userId = String(req.user.id || req.user._id);
    const current = Array.isArray(message.reactions.get(emoji)) ? message.reactions.get(emoji) : [];
    const hasReacted = current.includes(userId);
    const next = hasReacted ? current.filter((id) => id !== userId) : [...current, userId];
    message.reactions.set(emoji, next);
    await message.save();

    emitForumUpdate(eventId, { type: 'message-reaction', messageId });
    res.status(200).json({ success: true, message: mapForumMessage(message) });
  } catch (error) {
    console.error('Toggle forum reaction error:', error);
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
  getClubs,
  forgotPassword,
  resetPassword,
  changePassword,
  requestOrganizerPasswordReset,
  getOrganizerPasswordResetHistory,
  sendEventRegistrationEmailHandler,
  updateOrganizerProfile,
  incrementEventRegistration,
  getAllOrganizers,
  getPublicOrganizers,
  getAllClubs,
  updateOrganizerStatus,
  updateClubStatus,
  getPasswordResetRequests,
  clearPasswordResetRequest,
  getPasswordChangeRequests,
  approvePasswordChangeRequest,
  rejectPasswordChangeRequest,
  scanAttendance,
  getAttendanceDashboard,
  manualOverride,
  exportAttendanceCSV,
  createMerchandiseOrder,
  getMerchandiseOrders,
  approveMerchandiseOrder,
  rejectMerchandiseOrder,
  getUserMerchandiseOrders,
  updateEvent,
  getMyEvents,
  getEventForumMessages,
  createForumPost,
  deleteForumPost,
  togglePinForumPost,
  toggleForumReactionController
};
