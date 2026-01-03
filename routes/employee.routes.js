const express = require("express");
const auth = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/profile", auth, (req, res) => {
  res.json({
    message: "Employee profile",
    user: req.user
  });
});

module.exports = router;
