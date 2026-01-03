const { pool } = require("../config/database");

class LeaveBalance {
  static async getByUserAndYear(userId, year = new Date().getFullYear()) {
    try {
      // Ensure user has balances first
      await this.ensureUserHasBalances(userId);

      const [rows] = await pool.execute(
        `
      SELECT
        lb.LeaveTypeId as leaveTypeId,
        lb.TotalAllocated as totalAllocated,
        lb.UsedDays as usedDays,
        lb.AvailableDays as availableDays,
        lb.CarriedForward as carriedForward,
        lb.Year as year,
        lt.Name as leaveTypeName
      FROM LeaveBalances lb
      JOIN LeaveTypes lt ON lb.LeaveTypeId = lt.Id
      WHERE lb.UserId = ? AND lb.Year = ?
      ORDER BY lt.Name
    `,
        [userId, year]
      );

      console.log(`Retrieved ${rows.length} leave balances for user ${userId}`);
      return rows;
    } catch (error) {
      console.error("LeaveBalance.getByUserAndYear error:", error);
      throw error;
    }
  }

  static async getAvailableBalance(
    userId,
    leaveTypeId,
    year = new Date().getFullYear()
  ) {
    try {
      const [rows] = await pool.execute(
        `
        SELECT AvailableDays FROM LeaveBalances
        WHERE UserId = ? AND LeaveTypeId = ? AND Year = ?
      `,
        [userId, leaveTypeId, year]
      );

      return rows[0] ? rows[0].AvailableDays : 0;
    } catch (error) {
      console.error("LeaveBalance.getAvailableBalance error:", error);
      throw error;
    }
  }

  static async deductBalance(
    userId,
    leaveTypeId,
    days,
    year = new Date().getFullYear()
  ) {
    try {
      console.log(
        `Deducting ${days} days from user ${userId}, leave type ${leaveTypeId}`
      );

      // First check if user has sufficient balance
      const [balanceCheck] = await pool.execute(
        `
      SELECT AvailableDays FROM LeaveBalances
      WHERE UserId = ? AND LeaveTypeId = ? AND Year = ?
    `,
        [userId, leaveTypeId, year]
      );

      if (balanceCheck.length === 0) {
        throw new Error(
          `No leave balance found for user ${userId}, leave type ${leaveTypeId}`
        );
      }

      if (balanceCheck[0].AvailableDays < days) {
        console.warn(
          `Insufficient balance for user ${userId}. Available: ${balanceCheck[0].AvailableDays}, Requested: ${days}`
        );
      }

      // Perform the deduction
      const [result] = await pool.execute(
        `
      UPDATE LeaveBalances
      SET UsedDays = UsedDays + ?,
          AvailableDays = AvailableDays - ?,
          UpdatedAt = NOW()
      WHERE UserId = ? AND LeaveTypeId = ? AND Year = ?
    `,
        [days, days, userId, leaveTypeId, year]
      );

      if (result.affectedRows === 0) {
        throw new Error(`Failed to update balance for user ${userId}`);
      }

      console.log(`Successfully deducted ${days} days from user ${userId}`);
    } catch (error) {
      console.error("LeaveBalance.deductBalance error:", error);
      throw error;
    }
  }
  static async ensureUserHasBalances(userId) {
    try {
      console.log(`Ensuring user ${userId} has leave balances`);

      // Get Annual Leave type ID
      const [leaveTypeRows] = await pool.execute(`
      SELECT Id FROM LeaveTypes WHERE Name = 'Annual Leave' AND IsActive = TRUE
    `);

      if (leaveTypeRows.length === 0) {
        console.error("No Annual Leave type found");
        return;
      }

      const leaveTypeId = leaveTypeRows[0].Id;
      const currentYear = new Date().getFullYear();

      // Check if user has balance for current year
      const [existingBalances] = await pool.execute(
        `
      SELECT COUNT(*) as count 
      FROM LeaveBalances 
      WHERE UserId = ? AND LeaveTypeId = ? AND Year = ?
    `,
        [userId, leaveTypeId, currentYear]
      );

      if (existingBalances[0].count === 0) {
        // Create balance record for this user
        await pool.execute(
          `
        INSERT INTO LeaveBalances (UserId, LeaveTypeId, TotalAllocated, AvailableDays, UsedDays, CarriedForward, Year, UnpaidDaysTaken)
        VALUES (?, ?, 0, 0, 0, 0, ?, 0)
      `,
          [userId, leaveTypeId, currentYear]
        );

        console.log(`✅ Created leave balance for user ${userId}`);
      }
    } catch (error) {
      console.error(`Error ensuring balances for user ${userId}:`, error);
      throw error;
    }
  }
}
module.exports = LeaveBalance;
