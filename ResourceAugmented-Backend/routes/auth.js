const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roleCheck");
const {
  validateRegistration,
  validateLogin,
  validatePasswordSetting,
} = require("../middleware/validation");

// Public routes - Authentication core
router.post("/login", validateLogin, AuthController.login);
router.post("/register", validateRegistration, AuthController.register); // Deprecated

// Email verification routes (public)
router.get("/verify-email/:token", AuthController.verifyEmail);
router.get("/check-token/:token", AuthController.checkVerificationToken);
router.post("/resend-verification", AuthController.resendVerificationEmail);

// Password setup after email verification (public access)
router.post(
  "/set-password",
  validatePasswordSetting,
  AuthController.setPassword
);

// Basic profile routes (shared by all user types)
router.get("/profile", authMiddleware, AuthController.getProfile);
router.get("/profile/status", authMiddleware, AuthController.getProfileStatus);
router.post(
  "/profile/complete",
  authMiddleware,
  AuthController.saveProfileComplete
);
// Get current user's complete profile
router.get(
  "/profile/complete",
  authMiddleware,
  AuthController.getCurrentUserProfile
);
router.get("/profile/download", authMiddleware, AuthController.downloadProfile);

// Languages routes
router.post('/profile/languages', authMiddleware, AuthController.saveLanguages);
router.get('/profile/languages', authMiddleware, AuthController.getAllLanguages);
router.delete('/profile/languages/:id', authMiddleware, AuthController.deleteLanguage);

// Certifications routes
router.post('/profile/certifications', authMiddleware, AuthController.saveCertifications);
router.get('/profile/certifications', authMiddleware, AuthController.getAllCertifications);
router.delete('/profile/certifications/:id', authMiddleware, AuthController.deleteCertification);

// Projects routes
router.post('/profile/projects', authMiddleware, AuthController.saveProjects);
router.get('/profile/projects', authMiddleware, AuthController.getAllProjects);
router.delete('/profile/projects/:id', authMiddleware, AuthController.deleteProject);


// Logout (shared)
router.post("/logout", authMiddleware, AuthController.logout);

// Test routes
router.get("/test-db", AuthController.testDB);
router.get("/test-email", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const EmailService = require("../services/emailService");
    const isValid = await EmailService.testEmailConfiguration();
    res.json({
      success: isValid,
      message: isValid ? "Email config valid" : "Email config invalid",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Multiple education/employment routes
router.post(
  "/profile/educations",
  authMiddleware,
  AuthController.saveEducations
);
router.post(
  "/profile/employments",
  authMiddleware,
  AuthController.saveEmployments
);
router.get(
  "/profile/educations",
  authMiddleware,
  AuthController.getAllEducations
);
router.get(
  "/profile/employments",
  authMiddleware,
  AuthController.getAllEmployments
);
router.delete(
  "/profile/educations/:id",
  authMiddleware,
  AuthController.deleteEducation
);
router.delete(
  "/profile/employments/:id",
  authMiddleware,
  AuthController.deleteEmployment
);

module.exports = router;
