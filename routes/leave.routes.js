const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const router = express.Router();

router.post("/approve", auth, role("admin"), (req, res) => {
  res.json({ message: "Leave approved by admin" });
});

module.exports = router;
