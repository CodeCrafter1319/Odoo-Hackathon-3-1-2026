const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { checkIn } = require("../controllers/attendance.controller");

const router = express.Router();

router.post("/check-in", auth, checkIn);

module.exports = router;
