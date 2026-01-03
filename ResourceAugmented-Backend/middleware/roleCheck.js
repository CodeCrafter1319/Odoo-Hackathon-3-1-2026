const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    // Use Role from new database structure
    const userRole = req.user.Role;

    console.log(
      `Role check: User ${
        req.user.Id
      } (${userRole}) attempting to access route requiring: [${allowedRoles.join(
        ", "
      )}]`
    );

    if (allowedRoles.includes(userRole)) {
      console.log(`Role check passed for user ${req.user.Id}`);
      return next();
    } else {
      console.log(`Role check failed for user ${req.user.Id}`);
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        required: allowedRoles,
        current: userType,
      });
    }
  };
};

// Admin-only access (only ADMIN users)
const requireAdmin = (req, res, next) => {
  if (req.user.Role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};
// Company access (only COMPANY users)
const requireCompany = roleCheck(["COMPANY"]);

// Resource access (only RESOURCE users)
const requireResource = roleCheck(["RESOURCE"]);

// Manager access (only MANAGER users)
const requireManager = roleCheck(["MANAGER"]);

// Admin or Company access
const requireAdminOrCompany = roleCheck(["ADMIN", "COMPANY"]);

// Admin or Manager access
const requireAdminOrManager = roleCheck(["ADMIN", "MANAGER"]);

// Any authenticated user (for profile completion, etc.)
const requireAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  next();
};

// Special middleware for profile completion steps
const requireVerifiedUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!req.user.IsEmailVerified) {
    return res.status(403).json({
      success: false,
      message: "Email verification required",
    });
  }

  next();
};

module.exports = {
  requireAdmin,
  requireCompany,
  requireResource,
  requireManager,
  requireAdminOrCompany,
  requireAdminOrManager,
  requireAuthenticated,
  requireVerifiedUser,
  roleCheck,
};
