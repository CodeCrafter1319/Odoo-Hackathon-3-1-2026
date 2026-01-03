const LeaveApplication = require("../models/LeaveApplication");
const LeaveBalance = require("../models/LeaveBalance");
const { pool } = require("../config/database");
const LeaveMailService = require("./leaveMailService");
class LeaveService {
  static async applyLeave(userId, leaveData) {
    const { leaveTypeId, fromDate, toDate, reason, leaveDays } = leaveData;

    // Calculate total days from leaveDays array
    const calculatedDays = this.calculateTotalDays(leaveDays);

    // Calculate paid/unpaid breakdown
    const paymentDetails = await this.calculateLeavePayment(
      userId,
      leaveTypeId,
      calculatedDays
    );

    console.log(`User ${userId} requesting ${calculatedDays} days:`);
    console.log(
      `Available: ${paymentDetails.availableBalance}, Paid: ${paymentDetails.paidDays}, Unpaid: ${paymentDetails.unpaidDays}`
    );

    // Check if user is eligible for this leave type
    await this.validateLeaveTypeEligibility(userId, leaveTypeId);

    // Create leave application with payment details
    const applicationId = await LeaveApplication.create({
      userId,
      leaveTypeId,
      fromDate,
      toDate,
      reason,
      leaveDays,
      calculatedDays,
      paymentDetails,
    });

    // Store payment calculation details
    await pool.execute(
      `
    INSERT INTO LeavePaymentDetails 
    (ApplicationId, UserId, LeaveTypeId, RequestedDays, PaidDays, UnpaidDays, AvailableBalanceAtTime)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
      [
        applicationId,
        userId,
        leaveTypeId,
        paymentDetails.requestedDays,
        paymentDetails.paidDays,
        paymentDetails.unpaidDays,
        paymentDetails.availableBalance,
      ]
    );

    // Start approval workflow
    await this.initiateApprovalWorkflow(applicationId, userId);

    //mail notification to manager
    try {
      const [leaveTypeRows] = await pool.execute(
        `
      SELECT Name FROM LeaveTypes WHERE Id = ?`,
        [leaveTypeId]
      );
      const leaveTypeName = leaveTypeRows[0]?.Name || "unknown Leave Type";
      const emailData = {
        leaveType: leaveTypeName,
        fromDate: fromDate,
        toDate: toDate,
        totalDays: calculatedDays,
        reason: reason,
        applicationId: applicationId,
      };
      await LeaveMailService.sendLeaveApplicationNotification(
        userId,
        emailData
      );
      console.log("Leave application email sent successfully");
    } catch (emailError) {
      console.error("Error sending leave application email:", emailError);
    }
    return {
      applicationId,
      message: paymentDetails.isPartiallyUnpaid
        ? `Leave application submitted. ${paymentDetails.paidDays} days will be paid, ${paymentDetails.unpaidDays} days will be unpaid.`
        : "Leave application submitted successfully - all days will be paid.",
      paymentDetails,
    };
  }
  static calculateTotalDays(leaveDays) {
    if (!leaveDays || !Array.isArray(leaveDays)) {
      return 0;
    }

    return leaveDays.reduce((total, day) => {
      return total + (day.isHalfDay ? 0.5 : 1);
    }, 0);
  }

  static async validateLeaveTypeEligibility(userId, leaveTypeId) {
    try {
      // Get user details
      const [userRows] = await pool.execute(
        `
        SELECT Gender FROM Users WHERE Id = ?
      `,
        [userId]
      );

      if (userRows.length === 0) {
        throw new Error("User not found");
      }

      const userGender = userRows[0].Gender;

      // Get leave type restrictions
      const [leaveTypeRows] = await pool.execute(
        `
        SELECT ApplicableGenders FROM LeaveTypes WHERE Id = ?
      `,
        [leaveTypeId]
      );

      if (leaveTypeRows.length === 0) {
        throw new Error("Leave type not found");
      }

      const applicableGenders = leaveTypeRows[0].ApplicableGenders;

      // Check if leave type has gender restrictions
      if (applicableGenders) {
        const allowedGenders = JSON.parse(applicableGenders);
        if (!allowedGenders.includes(userGender)) {
          throw new Error("You are not eligible for this type of leave");
        }
      }

      return true;
    } catch (error) {
      console.error("LeaveService.validateLeaveTypeEligibility error:", error);
      throw error;
    }
  }

  static async getLeaveTypesForUser(userId) {
    try {
      console.log("Getting leave types for user:", userId);
      // Get user gender with fallback
      const [userRows] = await pool.execute(
        `
      SELECT COALESCE(Gender, 'MALE') as Gender FROM Users WHERE Id = ?
    `,
        [userId]
      );

      if (userRows.length === 0) {
        throw new Error("User not found");
      }

      const userGender = userRows[0].Gender;
      console.log("User gender:", userGender);

      // Get leave types with safe JSON handling
      const [rows] = await pool.execute(`
      SELECT Id, Name, Code,
      COALESCE(MaxDaysPerYear, 30) as MaxDaysPerYear,
      COALESCE(MinDays, 0.5) as MinDays,
      COALESCE(MaxDays, 365) as MaxDays,
      ApplicableGenders
      FROM LeaveTypes
      WHERE IsActive = TRUE
      ORDER BY Name
    `);

      console.log("Raw leave types from DB:", rows);

      // Filter with safe type checking and JSON parsing
      const applicableLeaveTypes = rows.filter((leaveType) => {
        // If no gender restrictions, allow all
        if (!leaveType.ApplicableGenders) {
          return true;
        }

        try {
          let allowedGenders;

          // ✅ FIX: Check the data type first
          if (typeof leaveType.ApplicableGenders === "string") {
            // It's a JSON string, parse it
            if (!leaveType.ApplicableGenders.startsWith("[")) {
              console.warn(
                `Invalid JSON format for leave type ${leaveType.Id}:`,
                leaveType.ApplicableGenders
              );
              return true; // Allow if JSON is invalid
            }
            allowedGenders = JSON.parse(leaveType.ApplicableGenders);
          } else if (Array.isArray(leaveType.ApplicableGenders)) {
            // It's already an array, use directly
            allowedGenders = leaveType.ApplicableGenders;
          } else {
            console.warn(
              `Unexpected ApplicableGenders format for leave type ${leaveType.Id}:`,
              leaveType.ApplicableGenders,
              typeof leaveType.ApplicableGenders
            );
            return true; // Allow if format is unexpected
          }

          return (
            Array.isArray(allowedGenders) && allowedGenders.includes(userGender)
          );
        } catch (jsonError) {
          console.error(
            `JSON parse error for leave type ${leaveType.Id}:`,
            jsonError
          );
          return true; // If JSON parsing fails, allow all users
        }
      });

      console.log("Filtered leave types:", applicableLeaveTypes);
      return applicableLeaveTypes;
    } catch (error) {
      console.error("LeaveService.getLeaveTypesForUser error:", error);
      throw error;
    }
  }

  static async getLeaveBalance(userId, year = new Date().getFullYear()) {
    return await LeaveBalance.getByUserAndYear(userId, year);
  }

  static async getAvailableBalance(userId, leaveTypeId) {
    return await LeaveBalance.getAvailableBalance(userId, leaveTypeId);
  }

  static async initiateApprovalWorkflow(applicationId, userId) {
    try {
      console.log(
        `Initiating approval workflow for application ${applicationId}, user ${userId}`
      );

      const [managerRows] = await pool.execute(
        `
        SELECT ManagerId FROM UserReporting WHERE UserId = ?
      `,
        [userId]
      );

      console.log("Manager query result:", managerRows);

      if (managerRows.length > 0) {
        await pool.execute(
          `
          INSERT INTO LeaveApprovalWorkflow (ApplicationId, ApproverId, ApprovalLevel, Status)
          VALUES (?, ?, 1, 'PENDING')
        `,
          [applicationId, managerRows[0].ManagerId]
        );

        console.log(
          `Approval workflow created for application ${applicationId} with approver ${managerRows[0].ManagerId}`
        );
      } else {
        console.log(
          `No manager found for user ${userId}, auto-assigning to admin`
        );
        await pool.execute(
          `
          INSERT INTO LeaveApprovalWorkflow (ApplicationId, ApproverId, ApprovalLevel, Status)
          VALUES (?, ?, 1, 'PENDING')
        `,
          [applicationId, 1]
        );
      }
    } catch (error) {
      console.error("LeaveService.initiateApprovalWorkflow error:", error);
      throw error;
    }
  }

  static async processLeaveApproval(
    approverId,
    applicationId,
    action,
    comments
  ) {
    try {
      const application = await LeaveApplication.findById(applicationId);
      if (!application) {
        throw new Error("Leave application not found");
      }

      if (action === "APPROVED") {
        // Get payment details
        const [paymentRows] = await pool.execute(
          `
        SELECT * FROM LeavePaymentDetails WHERE ApplicationId = ?
      `,
          [applicationId]
        );

        if (paymentRows.length > 0) {
          const payment = paymentRows[0];

          // Deduct only the paid days from leave balance
          if (payment.PaidDays > 0) {
            await this.deductLeaveBalance(
              application.UserId,
              application.LeaveTypeId,
              payment.PaidDays
            );
          }

          // Update unpaid days taken in balance table
          if (payment.UnpaidDays > 0) {
            await pool.execute(
              `
            UPDATE LeaveBalances 
            SET UnpaidDaysTaken = UnpaidDaysTaken + ?
            WHERE UserId = ? AND LeaveTypeId = ? AND Year = ?
          `,
              [
                payment.UnpaidDays,
                application.UserId,
                application.LeaveTypeId,
                new Date().getFullYear(),
              ]
            );
          }
        }

        await this.sendNotification(
          application.UserId,
          "LEAVE_APPROVED",
          application
        );
      } else {
        await this.sendNotification(application.UserId, "LEAVE_REJECTED", {
          comments,
        });
      }

      await LeaveApplication.updateStatus(
        applicationId,
        action,
        approverId,
        comments || null
      );
      await pool.execute(
        `
      UPDATE LeaveApprovalWorkflow
      SET Status = ?, Comments = ?, ActionDate = NOW()
      WHERE ApplicationId = ? AND ApproverId = ?
    `,
        [action, comments || null, applicationId, approverId]
      );

      // email notification to employee about approval/rejection
      try {
        const emailData = {
          leaveType: application.LeaveTypeName,
          fromDate: application.FromDate,
          toDate: application.ToDate,
          totalDays: application.CalculatedDays || application.TotalDays,
          status: action,
          comments: comments || "",
          applicationId: applicationId,
        };
        console.log("🔍 DEBUG - Email data being sent:", emailData);
        await LeaveMailService.sendLeaveApprovalNotification(
          application.UserId,
          approverId,
          emailData
        );
        console.log("Leave application email sent successfully");
      } catch (emailError) {
        console.error("Error sending leave application email:", emailError);
      }

      console.log(
        `Leave application ${applicationId} ${action} by ${approverId}`
      );
    } catch (error) {
      console.error("LeaveService.processLeaveApproval error:", error);
      throw error;
    }
  }

  static async deductLeaveBalance(userId, leaveTypeId, days) {
    await LeaveBalance.deductBalance(userId, leaveTypeId, days);
  }

  static async sendNotification(userId, type, data) {
    console.log(`Sending notification to user ${userId}: ${type}`, data);
  }

  static async getLeaveTypes() {
    try {
      const [rows] = await pool.execute(`
        SELECT * FROM LeaveTypes WHERE IsActive = TRUE ORDER BY Name
      `);
      return rows;
    } catch (error) {
      console.error("LeaveService.getLeaveTypes error:", error);
      throw error;
    }
  }

  // Manager dashboard methods remain the same...
  static async getManagerDashboardStats(managerId) {
    try {
      const [teamCountRows] = await pool.execute(
        `
      SELECT COUNT(*) as count FROM UserReporting WHERE ManagerId = ?
    `,
        [managerId]
      );

      // Fixed query to avoid duplicates
      const [pendingRows] = await pool.execute(
        `
      SELECT COUNT(DISTINCT la.Id) as count 
      FROM LeaveApprovalWorkflow law
      JOIN LeaveApplications la ON law.ApplicationId = la.Id
      WHERE law.ApproverId = ? 
        AND law.Status = 'PENDING' 
        AND la.Status = 'PENDING'
    `,
        [managerId]
      );

      return {
        totalMembers: teamCountRows[0].count,
        activeProjects: 5,
        pendingApprovals: pendingRows[0].count,
        teamPerformance: 94,
      };
    } catch (error) {
      console.error("LeaveService.getManagerDashboardStats error:", error);
      throw error;
    }
  }

  static async getTeamMembers(managerId) {
    try {
      const [rows] = await pool.execute(
        `
        SELECT u.Id, u.FirstName, u.LastName, u.Email, u.Role, u.IsActive
        FROM UserReporting ur
        JOIN Users u ON ur.UserId = u.Id
        WHERE ur.ManagerId = ?
        ORDER BY u.FirstName, u.LastName
      `,
        [managerId]
      );

      return rows;
    } catch (error) {
      console.error("LeaveService.getTeamMembers error:", error);
      throw error;
    }
  }
  static async validateLeaveTypeEligibility(userId, leaveTypeId) {
    try {
      // Get user details
      const [userRows] = await pool.execute(
        `
      SELECT COALESCE(Gender, 'MALE') as Gender FROM Users WHERE Id = ?
    `,
        [userId]
      );

      if (userRows.length === 0) {
        throw new Error("User not found");
      }

      const userGender = userRows[0].Gender;

      // Get leave type restrictions
      const [leaveTypeRows] = await pool.execute(
        `
      SELECT ApplicableGenders FROM LeaveTypes WHERE Id = ?
    `,
        [leaveTypeId]
      );

      if (leaveTypeRows.length === 0) {
        throw new Error("Leave type not found");
      }

      const applicableGenders = leaveTypeRows[0].ApplicableGenders;

      // Check if leave type has gender restrictions
      if (applicableGenders) {
        try {
          console.log("Raw ApplicableGenders data:", applicableGenders);
          console.log("Type of ApplicableGenders:", typeof applicableGenders);

          // Handle different data types
          let allowedGenders;
          if (typeof applicableGenders === "string") {
            allowedGenders = JSON.parse(applicableGenders);
          } else if (Array.isArray(applicableGenders)) {
            allowedGenders = applicableGenders;
          } else {
            console.warn(
              "Unexpected ApplicableGenders format:",
              applicableGenders
            );
            return true; // Allow if format is unexpected
          }

          if (
            !Array.isArray(allowedGenders) ||
            !allowedGenders.includes(userGender)
          ) {
            throw new Error("You are not eligible for this type of leave");
          }
        } catch (jsonError) {
          console.error(
            `JSON parse error for leave type ${leaveTypeId}:`,
            jsonError
          );
          console.error(`Problematic data:`, applicableGenders);
          return true; // Allow if JSON parsing fails
        }
      }

      return true;
    } catch (error) {
      console.error("LeaveService.validateLeaveTypeEligibility error:", error);
      throw error;
    }
  }
  static async calculateLeavePayment(userId, leaveTypeId, requestedDays) {
    try {
      const availableBalance = await this.getAvailableBalance(
        userId,
        leaveTypeId
      );
      let paidDays = 0;
      let unpaidDays = 0;

      if (requestedDays <= availableBalance) {
        paidDays = requestedDays;
        unpaidDays = 0;
      } else {
        paidDays = availableBalance;
        unpaidDays = requestedDays - availableBalance;
      }
      return {
        requestedDays,
        paidDays,
        unpaidDays,
        availableBalance,
        isPartiallyUnpaid: unpaidDays > 0,
      };
    } catch (error) {
      console.error("LeaveService.calculateLeavePayment error:", error);
      throw error;
    }
  }
}

module.exports = LeaveService;
