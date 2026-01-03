const express = require("express");
const router = express.Router();
const LeaveController = require("../controllers/leaveController");
const authMiddleware = require("../middleware/auth");
const { requireManager, requireAdmin } = require("../middleware/roleCheck");
const LeaveAccrualService = require("../services/leaveAccuralService");
const { pool } = require("../config/database");
// ===== EXISTING ROUTES =====
router.post("/apply", authMiddleware, LeaveController.applyLeave);
router.get(
  "/my-applications",
  authMiddleware,
  LeaveController.getMyLeaveApplications
);
router.get("/balance", authMiddleware, LeaveController.getLeaveBalance);
router.get("/types", authMiddleware, LeaveController.getLeaveTypes);
router.get(
  "/pending-approvals",
  authMiddleware,
  LeaveController.getPendingApprovals
);
router.get(
  "/pending-approvals/resource",
  authMiddleware,
  LeaveController.getPendingForResource
);
router.get(
  "/all-applications",
  authMiddleware,
  LeaveController.getAllLeaveApplications
);
router.post(
  "/process-action",
  authMiddleware,
  LeaveController.processLeaveAction
);

// ===== NEW TESTING ENDPOINTS =====

// 1. Manual trigger for monthly accrual (ADMIN ONLY)
router.post(
  "/admin/trigger-monthly-accrual",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      console.log("🔧 Manual trigger: Monthly accrual requested by admin");
      const result = await LeaveAccrualService.triggerMonthlyAccrual();

      res.json({
        success: result.success,
        message: result.message,
        data: {
          affectedRows: result.affectedRows,
          year: result.year,
          month: result.month,
        },
      });
    } catch (error) {
      console.error("❌ Manual trigger error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to trigger monthly accrual",
        error: error.message,
      });
    }
  }
);

// 2. Get all leave balances for verification (ADMIN/MANAGER)
router.get("/admin/all-balances", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        u.Id as EmployeeId,
        CONCAT(u.FirstName, ' ', u.LastName) as EmployeeName,
        u.Email,
        u.Role,
        lb.TotalAllocated,
        lb.AvailableDays,
        lb.UsedDays,
        lb.CarriedForward,
        lb.UnpaidDaysTaken,
        lb.UpdatedAt
      FROM Users u
      LEFT JOIN LeaveBalances lb ON u.Id = lb.UserId AND lb.Year = YEAR(CURDATE())
      LEFT JOIN LeaveTypes lt ON lb.LeaveTypeId = lt.Id AND lt.Name = 'Annual Leave'
      WHERE u.Role IN ('RESOURCE', 'MANAGER', 'COMPANY')
        AND u.IsActive = TRUE
      ORDER BY u.FirstName, u.LastName
    `);

    res.json({
      success: true,
      message: "Leave balances retrieved successfully",
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch leave balances",
      error: error.message,
    });
  }
});

// 3. Get accrual history/statistics (ADMIN ONLY)
router.get(
  "/admin/accrual-stats",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await LeaveAccrualService.getAccrualStats();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch accrual stats",
        error: error.message,
      });
    }
  }
);

// 4. Manual trigger for year-end carry forward (ADMIN ONLY)
router.post(
  "/admin/trigger-year-end-carryforward",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      console.log("🔧 Manual trigger: Year-end carry forward requested");
      const result = await LeaveAccrualService.triggerYearEndCarryForward();

      res.json({
        success: result.success,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("❌ Manual trigger error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to trigger year-end carry forward",
        error: error.message,
      });
    }
  }
);

// 5. Reset employee leave balance (ADMIN ONLY - for testing)
router.post(
  "/admin/reset-balance/:userId",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { balance } = req.body; // Optional: set specific balance

      await pool.execute(
        `
      UPDATE LeaveBalances lb
      JOIN LeaveTypes lt ON lb.LeaveTypeId = lt.Id
      SET 
        lb.TotalAllocated = ?,
        lb.AvailableDays = ?,
        lb.UsedDays = 0,
        lb.UpdatedAt = NOW()
      WHERE lb.UserId = ? 
        AND lt.Name = 'Annual Leave' 
        AND lb.Year = YEAR(CURDATE())
    `,
        [balance || 0, balance || 0, userId]
      );

      res.json({
        success: true,
        message: `Leave balance reset for user ${userId}`,
        newBalance: balance || 0,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to reset balance",
        error: error.message,
      });
    }
  }
);

// 6. Get system leave configuration (ADMIN/MANAGER)
router.get("/admin/system-config", authMiddleware, async (req, res) => {
  try {
    // Get leave types
    const [leaveTypes] = await pool.execute(`
      SELECT * FROM LeaveTypes WHERE IsActive = TRUE
    `);

    // Get total employees with balances
    const [employeeCount] = await pool.execute(`
      SELECT COUNT(DISTINCT u.Id) as totalEmployees
      FROM Users u
      JOIN LeaveBalances lb ON u.Id = lb.UserId
      WHERE u.Role IN ('RESOURCE', 'MANAGER', 'COMPANY')
        AND u.IsActive = TRUE
        AND lb.Year = YEAR(CURDATE())
    `);

    // Get total leave days in system
    const [totalDays] = await pool.execute(`
      SELECT SUM(lb.AvailableDays) as totalAvailableDays
      FROM LeaveBalances lb
      JOIN LeaveTypes lt ON lb.LeaveTypeId = lt.Id
      WHERE lt.Name = 'Annual Leave' 
        AND lb.Year = YEAR(CURDATE())
    `);

    res.json({
      success: true,
      data: {
        leaveTypes: leaveTypes,
        totalEmployees: employeeCount[0].totalEmployees,
        totalAvailableDays: totalDays[0].totalAvailableDays,
        monthlyAccrualRate: 1.5,
        currentYear: new Date().getFullYear(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch system config",
      error: error.message,
    });
  }
});

module.exports = router;
