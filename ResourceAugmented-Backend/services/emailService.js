const { Resend } = require('resend');

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email using Resend API
 * @param {Object} mailOptions - Email options
 * @param {string} mailOptions.to - Recipient email
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.html - HTML content
 * @param {string} mailOptions.text - Plain text content (optional)
 * @returns {Promise<Object>} Result object with success status
 */
async function sendEmail(mailOptions) {
  try {
    console.log('📧 Sending email via Resend...');
    console.log('   To:', mailOptions.to);
    console.log('   Subject:', mailOptions.subject);

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text || ''
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', data.id);

    return {
      success: true,
      messageId: data.id,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error('❌ Resend email error:', error.message);
    
    // Log detailed error for debugging
    if (error.response) {
      console.error('   Error details:', JSON.stringify(error.response));
    }

    // Return error but don't throw - allow app to continue
    return {
      success: false,
      error: error.message,
      message: 'Email failed but operation completed'
    };
  }
}

/**
 * Send verification email to new users
 * @param {Object} userInfo - User information
 * @param {string} userInfo.email - User email
 * @param {string} userInfo.firstName - User first name
 * @param {string} userInfo.lastName - User last name
 * @param {string} userInfo.userType - User role/type
 * @param {string} verificationToken - Email verification token
 * @returns {Promise<Object>} Result object
 */
async function sendVerificationEmail(userInfo, verificationToken) {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    to: userInfo.email,
    subject: 'Verify Your Email - Resource Augmentation Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 30px;
            background-color: #ffffff;
          }
          .content h2 {
            color: #333;
            font-size: 24px;
            margin-top: 0;
          }
          .content p {
            margin: 15px 0;
            color: #555;
          }
          .account-details {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .account-details p {
            margin: 8px 0;
            color: #333;
          }
          .account-details strong {
            color: #667eea;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .alert {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .alert strong {
            color: #856404;
          }
          .link-box {
            background-color: #f8f9fa;
            padding: 12px;
            margin: 15px 0;
            border-radius: 4px;
            word-break: break-all;
            font-size: 13px;
            color: #667eea;
            border: 1px dashed #667eea;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            font-size: 12px;
            color: #777;
            border-top: 1px solid #e9ecef;
          }
          .steps {
            margin: 20px 0;
          }
          .steps li {
            margin: 10px 0;
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Resource Augmentation!</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userInfo.firstName} ${userInfo.lastName}!</h2>
            
            <p>Your account has been created by our administrator. To get started, please verify your email address and set up your password.</p>
            
            <div class="account-details">
              <p><strong>Email:</strong> ${userInfo.email}</p>
              <p><strong>Account Type:</strong> ${userInfo.userType}</p>
              <p><strong>Name:</strong> ${userInfo.firstName} ${userInfo.lastName}</p>
            </div>
            
            <div class="button-container">
              <a href="${verificationLink}" class="button">Verify Email & Set Password</a>
            </div>
            
            <div class="alert">
              <strong>⚠️ Important:</strong> This verification link will expire in 24 hours.
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            
            <div class="link-box">
              ${verificationLink}
            </div>
            
            <h3 style="color: #667eea; margin-top: 30px;">📋 What's Next?</h3>
            <ol class="steps">
              <li>Click the verification link above</li>
              <li>Set a secure password for your account</li>
              <li>Complete your profile information</li>
              <li>Start using the platform!</li>
            </ol>
            
            <p style="margin-top: 30px; color: #777; font-size: 14px;">
              If you didn't expect this email or have any questions, please contact your administrator.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Resource Augmentation Platform</strong></p>
            <p>© ${new Date().getFullYear()} All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 11px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${userInfo.firstName} ${userInfo.lastName}!

Your account has been created by our administrator. To get started, please verify your email address and set up your password.

Account Details:
- Email: ${userInfo.email}
- Account Type: ${userInfo.userType}
- Name: ${userInfo.firstName} ${userInfo.lastName}

Verification Link:
${verificationLink}

Important: This verification link will expire in 24 hours.

What's Next?
1. Click the verification link above
2. Set a secure password for your account
3. Complete your profile information
4. Start using the platform!

If you didn't expect this email, please contact your administrator.

Resource Augmentation Platform
© ${new Date().getFullYear()} All rights reserved.
    `
  };

  return await sendEmail(mailOptions);
}

/**
 * Send password reset email
 * @param {Object} userInfo - User information
 * @param {string} resetToken - Password reset token
 * @returns {Promise<Object>} Result object
 */
async function sendPasswordResetEmail(userInfo, resetToken) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    to: userInfo.email,
    subject: 'Password Reset Request - Resource Augmentation Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .alert { background-color: #fff3cd; padding: 12px; border-left: 4px solid #ffc107; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${userInfo.firstName}!</h2>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <div class="alert">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour.
            </div>
            <p>If you didn't request this, please ignore this email or contact support.</p>
            <p>Link: ${resetLink}</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await sendEmail(mailOptions);
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};
