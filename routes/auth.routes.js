const express = require("express");
const { register, login, getCurrentUser } = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

const router = express.Router();

// Register route - protected, only admin or hr can register users
router.post("/register", authMiddleware, (req, res, next) => {
  // Check if user is admin or hr
  if (req.user.role !== "admin" && req.user.role !== "hr") {
    return res.status(403).json({ message: "Access denied. Only admin or HR can register users." });
  }
  next();
}, register);

router.post("/login", login);
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;
