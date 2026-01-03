const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/jwt");
const jwt = require("jsonwebtoken");

// REGISTER USER
exports.register = async (req, res) => {
  try {
    const {
      companyName,
      empName,
      email,
      password,
      phoneNo,
      monthlyWage,
      role,
      username  // Support simplified frontend request
    } = req.body;

    // Support simplified registration from frontend (username only)
    const finalEmpName = empName || username || "New User";
    const finalEmail = email || `${username || "user"}@hrms.com`;
    const finalPassword = password || "password123"; // Default password, should be changed
    const finalCompanyName = companyName || "HR Management";
    const finalPhoneNo = phoneNo || "0000000000";
    const finalMonthlyWage = monthlyWage || 0;
    const finalRole = role || "employee";

    // Check if user already exists (by email or username)
    const existingUser = await User.findOne({ 
      $or: [
        { email: finalEmail },
        { empName: finalEmpName }
      ]
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const user = await User.create({
      companyName: finalCompanyName,
      empName: finalEmpName,
      email: finalEmail,
      password: hashedPassword,
      phoneNo: finalPhoneNo,
      monthlyWage: finalMonthlyWage,
      role: finalRole
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
      user: {
        username: user.empName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Support both email and username for login
    const loginField = email || username;
    if (!loginField) {
      return res.status(400).json({ message: "Email or username is required" });
    }

    // Try to find user by email or username (if username field exists, otherwise use email)
    const user = await User.findOne({ 
      $or: [
        { email: loginField },
        { empName: loginField }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        username: user.empName,
        email: user.email,
        role: user.role,
        id: user._id
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET CURRENT USER
exports.getCurrentUser = async (req, res) => {
  try {
    // Token is verified by middleware, user ID is in req.user
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        username: user.empName,
        email: user.email,
        role: user.role,
        id: user._id
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
