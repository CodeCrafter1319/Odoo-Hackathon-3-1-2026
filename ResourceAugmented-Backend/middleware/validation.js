// Validation for admin creating users (simplified)
const validateUserCreation = (req, res, next) => {
  const { firstName, lastName, email, role } = req.body;

  // Check required fields
  if (!firstName || !lastName || !email || !role) {
    return res.status(400).json({
      success: false,
      message: "First name, last name, email, and role are required",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  // Validate role for new structure
  const validRoles = ["COMPANY", "RESOURCE", "MANAGER"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role. Must be COMPANY, RESOURCE, or MANAGER",
    });
  }

  // Validate name lengths
  if (firstName.trim().length < 2 || lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "First name and last name must be at least 2 characters long",
    });
  }

  next();
};

// DEPRECATED - Registration validation (kept for compatibility)
const validateRegistration = (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: "Direct registration is not allowed. Users must be created by administrators.",
  });
};

// Login validation (updated for new flow)
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  next();
};

// Password setting validation
const validatePasswordSetting = (req, res, next) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({
      success: false,
      message: "User ID and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  // Additional password strength validation
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    });
  }

  next();
};

// Personal details validation
const validatePersonalDetails = (req, res, next) => {
  const { phone, email } = req.body;

  // Phone validation (optional but if provided, must be valid)
  if (phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }
  }

  // Email validation (if provided in update)
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }
  }

  next();
};

// Education validation
const validateEducation = (req, res, next) => {
  const { degree, fieldOfStudy, institution, startDate } = req.body;

  if (!degree || !fieldOfStudy || !institution || !startDate) {
    return res.status(400).json({
      success: false,
      message: "Degree, field of study, institution, and start date are required",
    });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate)) {
    return res.status(400).json({
      success: false,
      message: "Start date must be in YYYY-MM-DD format",
    });
  }

  next();
};

// Employment validation
const validateEmployment = (req, res, next) => {
  const { jobTitle, companyName, startDate } = req.body;

  if (!jobTitle || !companyName || !startDate) {
    return res.status(400).json({
      success: false,
      message: "Job title, company name, and start date are required",
    });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate)) {
    return res.status(400).json({
      success: false,
      message: "Start date must be in YYYY-MM-DD format",
    });
  }

  next();
};

// Email resend validation
const validateEmailResend = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateUserCreation,
  validatePasswordSetting,
  validatePersonalDetails,
  validateEducation,
  validateEmployment,
  validateEmailResend,
};
