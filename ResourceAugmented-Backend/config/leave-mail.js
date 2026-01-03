const nodemailer = require('nodemailer');
require('dotenv').config();

const leaveMailConfig = {
  service: process.env.LEAVE_EMAIL_SERVICE || 'gmail',
  host: process.env.LEAVE_EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.LEAVE_EMAIL_PORT) || 587,
  secure: process.env.LEAVE_EMAIL_SECURE === 'true',
  auth: {
    user: process.env.LEAVE_EMAIL_USER || '',
    pass: process.env.LEAVE_EMAIL_PASS || '',
  },
};

console.log('Leave Mail Configuration:', {
  service: leaveMailConfig.service,
  host: leaveMailConfig.host,
  port: leaveMailConfig.port,
  user: leaveMailConfig.auth.user ? '***@' + leaveMailConfig.auth.user.split('@')[1] : 'Not Set',
});

const leaveTransporter = nodemailer.createTransport(leaveMailConfig);

// Verify connection configuration
leaveTransporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Leave mail server connection failed:', error);
  } else {
    console.log('✅ Leave mail server is ready to send messages');
  }
});

module.exports = leaveTransporter;
