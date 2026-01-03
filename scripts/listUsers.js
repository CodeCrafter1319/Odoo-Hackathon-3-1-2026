const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/user.model");

const listUsers = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI not found in .env file");
      console.log("Please run: .\\createEnv.ps1 or set up .env file");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find all users
    const users = await User.find({}).select("-password");
    
    if (users.length === 0) {
      console.log("ℹ️  No users found in database");
      console.log("Run 'npm run init-admin' to create an admin user");
      process.exit(0);
    }

    console.log(`📋 Found ${users.length} user(s) in database:\n`);
    console.log("=" .repeat(60));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User Details:`);
      console.log(`   Name: ${user.empName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Company: ${user.companyName}`);
      console.log(`   Phone: ${user.phoneNo}`);
      console.log(`   ID: ${user._id}`);
      
      if (user.role === "admin") {
        console.log(`   ⭐ ADMIN USER`);
      }
    });
    
    console.log("\n" + "=".repeat(60));
    
    // Find admin users specifically
    const adminUsers = users.filter(u => u.role === "admin");
    if (adminUsers.length > 0) {
      console.log("\n🔑 Admin User(s):");
      adminUsers.forEach(admin => {
        console.log(`   Email/Username: ${admin.email}`);
        console.log(`   Name: ${admin.empName}`);
        console.log(`   Note: Password is hashed in database.`);
        console.log(`   Default password (if not changed): admin123`);
        console.log(`   Or check ADMIN_PASSWORD in .env file`);
      });
    } else {
      console.log("\n⚠️  No admin user found!");
      console.log("Run 'npm run init-admin' to create an admin user");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error connecting to database:", error.message);
    if (error.message.includes("authentication failed")) {
      console.log("\n💡 Tip: Check your MongoDB connection string in .env file");
    } else if (error.message.includes("getaddrinfo")) {
      console.log("\n💡 Tip: Check your internet connection and MongoDB URI");
    }
    process.exit(1);
  }
};

listUsers();

