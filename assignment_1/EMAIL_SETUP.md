# Email Setup Guide

This guide explains how to set up email functionality for registration confirmations and password reset in the DASS Event Management System.

## Features Implemented

1. **Registration Confirmation Email** - Sent automatically when users register
2. **Password Reset Email** - Sent when users request a password reset with a secure reset link
3. **Event Registration Confirmation** - Ready for sending event registration confirmations

## Setup Instructions

### 1. Install Dependencies

The backend already has `nodemailer` installed. Verify it's in your `package.json`:

```bash
cd backend
npm install nodemailer
```

### 2. Gmail Configuration

We use Gmail's SMTP server for sending emails. You'll need:

#### Option A: Google App Password (Recommended)
1. Enable 2-Factor Authentication on your Google Account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Windows Computer" (or your device)
4. Generate an app password
5. Copy the 16-character password

#### Option B: Less Secure Apps (Not Recommended)
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable "Less secure app access"
3. Use your regular Gmail password

### 3. Environment Variables

Copy the `.env.example` file and create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Fill in your values:

```env
# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_or_password

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Registration
- **Endpoint**: `POST /api/auth/register`
- **Behavior**: Sends confirmation email to the registered user
- **Response includes**: User data, JWT token, and success message

### Forgot Password
- **Endpoint**: `POST /api/auth/forgot-password`
- **Body**: `{ "email": "user@example.com" }`
- **Response**: Success message with confirmation
- **Security**: Returns same message whether email exists or not (prevents email enumeration)

### Reset Password
- **Endpoint**: `POST /api/auth/reset-password`
- **Body**: `{ "token": "reset_token", "newPassword": "password123", "confirmPassword": "password123" }`
- **Response**: Success message if reset successful, error if token expired or invalid
- **Token Validity**: 1 hour from when it was generated

## Frontend Components

### Login Page Changes
- Added "Forgot your password?" link on login page
- Links to `/forgot-password` route

### New Pages

#### Forgot Password (`/forgot-password`)
- Email input field
- Sends password reset request
- Shows confirmation message
- Redirects to login after 2 seconds

#### Reset Password (`/reset-password?token=xyz`)
- Password and confirm password fields
- Validates passwords match
- Validates token is valid and not expired
- Redirects to login on success

## Testing

### Test Registration Email
1. Go to login page and click "New user? Register here"
2. Fill in registration form
3. Submit registration
4. Check email for confirmation message

### Test Password Reset
1. Go to login page
2. Click "Forgot your password?"
3. Enter your email address
4. Check email for reset link
5. Click the reset link (in email or copy token to URL)
6. Enter new password and confirm
7. Login with new password

## Database Schema

### User Model Updates
Two new fields added to store password reset data:

```javascript
resetPasswordToken: String    // Hashed reset token
resetPasswordExpire: Date     // Expiration time (1 hour from creation)
```

## Email Templates

### Registration Confirmation
- Welcomes user
- Lists available features
- Contact information

### Password Reset
- Request confirmation
- Reset link with button
- Plain text backup link
- 1-hour expiration warning
- Notice that user can ignore if they didn't request

## Troubleshooting

### Emails Not Sending
1. **Check credentials**: Verify EMAIL_USER and EMAIL_PASSWORD in .env
2. **Gmail settings**: Ensure 2FA is enabled if using app password
3. **Less secure apps**: May need to enable this if using regular password
4. **SMTP test**: Check backend logs for SMTP connection errors
5. **Firewall**: Ensure port 587 (Gmail SMTP) is not blocked

### Password Reset Link Not Working
1. Verify FRONTEND_URL is correct in .env
2. Check token parameter in URL matches email
3. Ensure 1-hour window hasn't expired
4. Check browser console for API errors

### Backend Errors
1. Check `.env` file has all required variables
2. Verify backend is running on specified PORT
3. Check MongoDB connection
4. Look at console logs for detailed error messages

## Security Features

1. **Token Hashing**: Reset tokens are hashed before storing in database
2. **Token Expiration**: Tokens expire after 1 hour
3. **Email Enumeration Prevention**: Same message for existing/non-existing emails
4. **Password Validation**: Minimum 6 characters, must match confirmation
5. **Secure SMTP**: Uses TLS/SSL encryption for email transmission

## Future Enhancements

1. Add email verification on registration
2. Implement email templates with more styling
3. Add email unsubscribe functionality
4. Send event reminder emails
5. Add SMS notifications as fallback
