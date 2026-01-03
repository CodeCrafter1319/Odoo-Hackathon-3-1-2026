const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { getPayroll } = require("../controllers/payroll.controller");

const router = express.Router();

router.get("/my", auth, getPayroll);
router.get("/all", auth, role("admin"), getPayroll);

module.exports = router;
