const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const { requireResource } = require("../middleware/roleCheck");
const {
  validatePersonalDetails,
} = require("../middleware/validation");

// Resource profile management routes
router.get("/profile/personal", authMiddleware, requireResource, AuthController.getPersonalDetails);
router.get("/profile/education", authMiddleware, requireResource, AuthController.getEducationDetails);
router.get("/profile/employment", authMiddleware, requireResource, AuthController.getEmploymentDetails);

router.post("/profile/personal", authMiddleware, requireResource, validatePersonalDetails, AuthController.updatePersonalDetails);
router.post("/profile/education", authMiddleware, requireResource, AuthController.addEducation);
router.post("/profile/employment", authMiddleware, requireResource, AuthController.addEmployment);

module.exports = router;
