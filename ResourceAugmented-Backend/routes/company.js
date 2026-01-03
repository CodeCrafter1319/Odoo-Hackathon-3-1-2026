const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const { requireAdmin, requireCompany } = require("../middleware/roleCheck");
const { validateUserCreation } = require("../middleware/validation");
const { pool } = require("../config/database");

// Admin/Company user management routes
router.post(
  "/create-user",
  authMiddleware,
  requireAdmin,
  validateUserCreation,
  AuthController.createUserByAdmin
);
router.get("/users", authMiddleware, requireAdmin, AuthController.getAllUsers);

// User activation (admin/company only)
router.patch(
  "/activate/:userId",
  authMiddleware,
  requireAdmin,
  AuthController.activateUser
);
router.get(
  "/users/:userId/details",
  authMiddleware,
  requireAdmin,
  AuthController.getUserDetails
);
// Resend verification for users (admin/company only)
router.post(
  "/resend-verification",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Find user by email
      const User = require("../models/User");
      const { pool } = require("../config/database");

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if already verified
      if (user.IsEmailVerified) {
        return res.status(200).json({
          success: true,
          message: "Email is already verified. User can set password.",
          data: {
            userId: user.Id,
            canSetPassword: true,
          },
        });
      }

      // Generate new verification token with 24 hour expiry
      const crypto = require("crypto");
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      await pool.execute(
        `
      UPDATE Users
      SET EmailVerificationToken = ?, EmailVerificationExpiry = ?, UpdatedAt = NOW()
      WHERE Id = ?
    `,
        [verificationToken, tokenExpiry, user.Id]
      );

      // Send new verification email
      const EmailService = require("../services/emailService");
      await EmailService.sendVerificationEmail(email, verificationToken, {
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        role: user.Role,
      });

      res.status(200).json({
        success: true,
        message: "New verification email sent successfully",
        data: {
          email: email,
          expiresIn: "24 hours",
          verificationLink: `/verify-email/${verificationToken}`, // Remove in production
        },
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to resend verification email",
      });
    }
  }
);

// Add this route to handle user deletion
router.delete("/users/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const currentUserId = req.user.Id;

    // Validate user ID
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Prevent admin from deleting their own account
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Check if user exists
    const [userRows] = await pool.execute(
      "SELECT Id, FirstName, LastName, Email FROM Users WHERE Id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userToDelete = userRows[0];

    // Delete dependent records sequentially (order matters due to foreign keys)
    await pool.execute(
      "DELETE FROM LeaveApplicationDays WHERE ApplicationId IN (SELECT Id FROM LeaveApplications WHERE UserId = ?)",
      [userId]
    );

    await pool.execute("DELETE FROM LeavePaymentDetails WHERE UserId = ?", [
      userId,
    ]);

    await pool.execute(
      "DELETE FROM LeaveApprovalWorkflow WHERE ApplicationId IN (SELECT Id FROM LeaveApplications WHERE UserId = ?)",
      [userId]
    );

    await pool.execute("DELETE FROM LeaveApplications WHERE UserId = ?", [
      userId,
    ]);
    await pool.execute("DELETE FROM LeaveBalances WHERE UserId = ?", [userId]);
    await pool.execute("DELETE FROM UserProfile WHERE UserId = ?", [userId]);
    await pool.execute("DELETE FROM EducationInfo WHERE UserId = ?", [userId]);
    await pool.execute("DELETE FROM EmploymentInfo WHERE UserId = ?", [userId]);
    await pool.execute(
      "DELETE FROM UserReporting WHERE UserId = ? OR ManagerId = ?",
      [userId, userId]
    );

    // Finally delete the user
    await pool.execute("DELETE FROM Users WHERE Id = ?", [userId]);

    console.log(
      `User ${userToDelete.FirstName} ${userToDelete.LastName} (ID: ${userId}) deleted by admin ${currentUserId}`
    );

    res.json({
      success: true,
      message: `User ${userToDelete.FirstName} ${userToDelete.LastName} deleted successfully`,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user. Please try again.",
    });
  }
});

module.exports = router;
