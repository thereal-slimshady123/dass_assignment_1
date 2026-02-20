const nodemailer = require('nodemailer');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter on startup so SMTP auth errors are visible immediately
transporter.verify((error, success) => {
  if (error) {
    console.error('========================================');
    console.error('EMAIL SMTP VERIFICATION FAILED:', error.message);
    console.error('Emails will NOT be sent until this is fixed.');
    console.error('If using Gmail, you need a Google App Password:');
    console.error('  1. Enable 2FA on your Google Account');
    console.error('  2. Go to https://myaccount.google.com/apppasswords');
    console.error('  3. Generate an app password and set EMAIL_PASSWORD in .env');
    console.error('========================================');
  } else {
    console.log('✅ Email SMTP transporter verified and ready to send emails.');
  }
});

// Send registration confirmation email
const sendRegistrationEmail = async (email, firstName) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to DASS Event Management System',
      html: `
        <h1>Welcome, ${firstName}!</h1>
        <p>Your account has been successfully created on the DASS Event Management System.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse and register for events</li>
          <li>Manage your event registrations</li>
          <li>Join clubs and organizations</li>
        </ul>
        <p>If you have any questions, please contact support.</p>
        <br/>
        <p>Best regards,<br/>DASS Event Management Team</p>
      `
    });
    console.log(`Registration email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send registration email:', error.message);
  }
};

// Send organizer credentials email (when admin creates an organizer account)
const sendOrganizerCredentialsEmail = async (email, firstName, password) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Organizer Account - DASS Event Management System',
      html: `
        <h1>Welcome, ${firstName}!</h1>
        <p>An organizer account has been created for you on the DASS Event Management System.</p>
        <p><strong>Your login credentials:</strong></p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p style="color: #e74c3c;"><strong>⚠️ Please change your password after your first login for security.</strong></p>
        <p>You can now:</p>
        <ul>
          <li>Create and manage events</li>
          <li>View event registrations and participants</li>
          <li>Update your organizer profile</li>
        </ul>
        <p>Login at: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
        <br/>
        <p>Best regards,<br/>DASS Event Management Team</p>
      `
    });
    console.log(`Organizer credentials email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send organizer credentials email:', error.message);
  }
};

// Send password reset email with reset token
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - DASS Event Management System',
      html: `
        <h1>Password Reset Request</h1>
        <p>Hello ${firstName},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p>
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p>${resetLink}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you did not request this password reset, please ignore this email.</p>
        <br/>
        <p>Best regards,<br/>DASS Event Management Team</p>
      `
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
  }
};

// Send password change confirmation email
const sendPasswordChangeEmail = async (email, firstName) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Changed - DASS Event Management System',
      html: `
        <h1>Password Change Confirmation</h1>
        <p>Hello ${firstName},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <br/>
        <p>Best regards,<br/>DASS Event Management Team</p>
      `
    });
    console.log(`Password change email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password change email:', error.message);
  }
};

// Send event registration confirmation
const sendEventRegistrationEmail = async (email, firstName, eventName, eventDate) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Event Registration Confirmed - ${eventName}`,
      html: `
        <h1>Registration Confirmed!</h1>
        <p>Hello ${firstName},</p>
        <p>Your registration for <strong>${eventName}</strong> has been confirmed.</p>
        <p><strong>Event Details:</strong></p>
        <p>Date: ${eventDate}</p>
        <p>You will receive your event ticket in your DASS dashboard. Be sure to check-in on time!</p>
        <br/>
        <p>Best regards,<br/>DASS Event Management Team</p>
      `
    });
    console.log(`Event registration email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send event registration email:', error.message);
  }
};

module.exports = {
  transporter,
  sendRegistrationEmail,
  sendOrganizerCredentialsEmail,
  sendPasswordResetEmail,
  sendPasswordChangeEmail,
  sendEventRegistrationEmail
};
