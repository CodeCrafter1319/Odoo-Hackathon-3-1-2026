const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true
    },

    empName: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    phoneNo: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee"
    },

    isCheckedIn: {
      type: Boolean,
      default: false
    },

    monthlyWage: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
