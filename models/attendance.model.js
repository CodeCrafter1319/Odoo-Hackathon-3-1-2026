const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    date: {
      type: Date,
      default: () => new Date().setHours(0, 0, 0, 0)
    },

    checkInTime: {
      type: Date
    },

    checkOutTime: {
      type: Date
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Half-day", "Leave"],
      default: "Present"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
