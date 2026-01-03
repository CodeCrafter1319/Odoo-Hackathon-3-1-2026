const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const AuthController = require("../controllers/authController");
const LeaveController = require("../controllers/leaveController");

router.get(
  "/getAvailableManagers",
  authMiddleware,
  AuthController.getAvailableManagers
);

router.get(
  "/dashboard-stats",
  authMiddleware,
  LeaveController.getManagerDashboardStats
);

// Get team members
router.get(
  "/team-members",
  authMiddleware,
  LeaveController.getTeamMembers
);

module.exports = router;
