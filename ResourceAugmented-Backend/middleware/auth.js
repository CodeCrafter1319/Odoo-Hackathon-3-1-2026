const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../config/auth");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided, authorization denied",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret);

    // Find user by ID using new database structure
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is not valid - user not found",
      });
    }

    // Check if user is active (updated for new DB structure)
    if (!user.IsActive) {
      return res.status(403).json({
        success: false,
        message: "Account is not activated",
      });
    }

    // Check if email is verified (except for admin)
    if (!user.IsEmailVerified && user.Role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Email verification required",
      });
    }

    // Check if password is set (required for new flow)
    if (!user.Password && user.Role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Account setup incomplete - password required",
      });
    }

    // Set user in request object for use in controllers
    req.user = {
      id: user.Id,
      userId: user.Id,
      email: user.Email,
      firstName: user.FirstName,
      lastName: user.LastName,
      role: user.Role,
      isEmailVerified: user.IsEmailVerified,
      isActive: user.IsActive,

      // Uppercase versions (for backward compatibility)
      Id: user.Id,
      Email: user.Email,
      FirstName: user.FirstName,
      LastName: user.LastName,
      Role: user.Role,
      IsEmailVerified: user.IsEmailVerified,
      IsActive: user.IsActive,
    };

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

module.exports = authMiddleware;
