const express = require("express");
const {
  register,
  login,
  getCurrentUser
} = require("../controllers/auth.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

const router = express.Router();

// Admin / HR → Register users
router.post(
  "/register",
  authMiddleware,
  roleMiddleware("admin", "hr"),
  register
);

// Public login
router.post("/login", login);

// Get logged-in user
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;
