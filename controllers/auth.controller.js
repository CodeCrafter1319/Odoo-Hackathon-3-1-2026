const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/jwt");

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
      role
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password (THIS FIXES SAME PASSWORD ISSUE)
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      companyName,
      empName,
      email,
      password: hashedPassword,
      phoneNo,
      monthlyWage,
      role: role || "employee"
    });
    console.log(user);
    res.status(201).json({
      message: "User registered successfully",
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
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
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
