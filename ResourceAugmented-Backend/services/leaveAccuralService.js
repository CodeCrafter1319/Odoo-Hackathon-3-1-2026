const cron = require("node-cron");
const { pool } = require("../config/database");
const { ca } = require("date-fns/locale");

class LeaveAccuralService {
  static async addMonthlyAccruals() {
    try {
      console.log("Starting monthly leave accrual process...");

      const [leaveTypeRows] = await pool.execute(`
      SELECT Id FROM LeaveTypes WHERE Name = 'Annual Leave' AND IsActive = TRUE
    `);

      if (leaveTypeRows.length === 0) {
        return {
          success: false,
          message: "No active 'Annual Leave' type found.",
        };
      }

      const leaveTypeId = leaveTypeRows[0].Id;
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const [result] = await pool.execute(
        `
      UPDATE LeaveBalances lb
      JOIN Users u ON lb.UserId = u.Id
      SET
        lb.TotalAllocated = lb.TotalAllocated + 1.5,
        lb.AvailableDays = lb.AvailableDays + 1.5,
        lb.UpdatedAt = NOW()
      WHERE lb.LeaveTypeId = ?
        AND lb.Year = ?
        AND u.IsActive = TRUE
        AND u.Role IN ('RESOURCE', 'MANAGER', 'COMPANY')
    `,
        [leaveTypeId, currentYear]
      );

      console.log(`Leave accruals updated for ${result.affectedRows} users.`);

      // Fix: Add this logging call
      await this.logAccuralActivity(
        leaveTypeId,
        currentYear,
        currentMonth,
        result.affectedRows
      );

      return {
        success: true,
        message: `Leave accruals updated for ${result.affectedRows} users.`,
        affectedRows: result.affectedRows, // ✅ Add this
        year: currentYear, // ✅ Add this
        month: currentMonth, // ✅ Add this
      };
    } catch (error) {
      console.error("Error in monthly leave accrual process:", error);
      return {
        success: false,
        message: "Failed to process monthly accrual",
        error: error.message,
      };
    }
  }
  static async handleYearEndCarryForward() {
    try {
      console.log("Starting year-end leave carry forward process...");

      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const [leaveTypeRows] = await pool.execute(`
            SELECT Id FROM LeaveTypes WHERE Name = 'Annual Leave' AND IsActive = TRUE
        `);
      if (leaveTypeRows.length === 0) {
        console.log("No active 'Annual Leave' type found.");
        return {
          success: false,
          message: "No active 'Annual Leave' type found.",
        };
      }

      const leaveTypeId = leaveTypeRows[0].Id;

      const [result] = await pool.execute(
        `
           INSERT INTO LeaveBalances (UserId, LeaveTypeId, TotalAllocated, AvailableDays, UsedDays, CarriedForward, Year, UnpaidDaysTaken)
        SELECT 
          lb.UserId,
          lb.LeaveTypeId,
          0,                    -- Reset allocated for new year
          lb.AvailableDays,     -- Carry forward available days
          0,                    -- Reset used days
          lb.AvailableDays,     -- Set carry forward amount
          ?,                    -- Next year
          0                     -- Reset unpaid days
        FROM LeaveBalances lb
        JOIN Users u ON lb.UserId = u.Id
        WHERE lb.LeaveTypeId = ? 
          AND lb.Year = ?
          AND u.IsActive = TRUE
          AND u.Role IN ('RESOURCE', 'MANAGER', 'COMPANY')
        ON DUPLICATE KEY UPDATE
          AvailableDays = VALUES(AvailableDays),
          CarriedForward = VALUES(CarriedForward),
          UpdatedAt = NOW()
          `,
        [nextYear, leaveTypeId, currentYear]
      );

      console.log(`Leave balances updated for ${result.affectedRows} users.`);
      await this.logCarryForwardHistory(
        leaveTypeId,
        currentYear,
        nextYear,
        result
      );
      return {
        success: true,
        message: `Leave balances updated for ${result.affectedRows} users.`,
      };
    } catch (error) {
      console.error("Error in year-end carry forward process:", error);
      throw error;
    }
  }
  static async logAccuralActivity(leaveTypeId, year, month, affectedRows) {
    try {
      await pool.execute(
        `
            INSERT INTO LeaveAccrualLog (LeaveTypeId, Year, Month, AccrualAmount, EmployeesAffected, ProcessedAt)
        VALUES (?, ?, ?, 1.5, ?, NOW())
        ON DUPLICATE KEY UPDATE
          AccrualAmount = VALUES(AccrualAmount),
          EmployeesAffected = VALUES(EmployeesAffected),
          ProcessedAt = VALUES(ProcessedAt)
            `,
        [leaveTypeId, year, month, affectedRows]
      );
      console.log("Accrual activity logged successfully.");
    } catch (error) {
      console.error("Error logging accrual activity:", error);
      throw error;
    }
  }
  static initializeAccrualJobs() {
    cron.schedule(
      "0 0 1 * *",
      async () => {
        console.log("Monthly leave accrual cron job triggered");
        await this.addMonthlyLeaveAccrual();
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata",
      }
    );

    cron.schedule(
      "0 0 31 12 *",
      async () => {
        console.log("Year-end carry forward cron job triggered");
        await this.handleYearEndCarryForward();
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata",
      }
    );

    console.log("Leave accrual cron jobs scheduled:");
    console.log("Monthly accrual: 1st of every month at 12:00 AM IST");
    console.log("Year-end carry forward: December 31st at 12:00 AM IST");
  }
  static async triggerMonthlyAccrual() {
    console.log("Manually triggering monthly accrual...");
    return await this.addMonthlyAccruals();
  }

  static async triggerYearEndCarryForward() {
    console.log("Manually triggering year-end carry forward...");
    return await this.handleYearEndCarryForward();
  }

  // Get accrual statistics
  static async getAccrualStats() {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          Year,
          Month,
          AccrualAmount,
          EmployeesAffected,
          ProcessedAt
        FROM LeaveAccrualLog
        ORDER BY Year DESC, Month DESC
        LIMIT 12
      `);

      return { success: true, data: stats };
    } catch (error) {
      console.error("Error fetching accrual stats:", error);
      return { success: false, message: "Failed to fetch stats" };
    }
  }
}
module.exports = LeaveAccuralService;
