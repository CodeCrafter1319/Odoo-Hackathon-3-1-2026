const { pool } = require("../config/database");

class LeaveApplication {
  static async create(leaveData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        userId,
        leaveTypeId,
        fromDate,
        toDate,
        reason,
        leaveDays,
        calculatedDays,
        paymentDetails,
      } = leaveData;

      console.log("Creating leave application:", {
        userId,
        leaveTypeId,
        fromDate,
        toDate,
        reason,
        calculatedDays,
      });

      // Validate required fields
      if (!userId || !leaveTypeId || !fromDate || !toDate || !reason) {
        throw new Error("Missing required fields for leave application");
      }

      const totalDays = calculatedDays || 1;
      const paidDays = paymentDetails ? paymentDetails.paidDays : totalDays;
      const unpaidDays = paymentDetails ? paymentDetails.unpaidDays : 0;
      const isPartiallyUnpaid = paymentDetails
        ? paymentDetails.isPartiallyUnpaid
        : false;

      // Create main application with payment details
      const [result] = await connection.execute(
        `
      INSERT INTO LeaveApplications
      (UserId, LeaveTypeId, FromDate, ToDate, TotalDays, CalculatedDays, Reason, 
       Status, PaidDays, UnpaidDays, IsPartiallyUnpaid, AppliedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, NOW())
    `,
        [
          userId,
          leaveTypeId,
          fromDate,
          toDate,
          totalDays,
          totalDays,
          reason,
          paidDays,
          unpaidDays,
          isPartiallyUnpaid,
        ]
      );

      const applicationId = result.insertId;
      console.log("Created leave application with ID:", applicationId);

      // Insert individual leave days with payment status
      if (leaveDays && Array.isArray(leaveDays) && leaveDays.length > 0) {
        let currentPaidDays = paidDays;

        for (const day of leaveDays) {
          if (!day.date) {
            console.warn("Skipping leave day with missing date:", day);
            continue;
          }

          // Determine if this day is paid or unpaid
          const dayValue = day.isHalfDay ? 0.5 : 1;
          let isPaid = true;
          let payStatus = "PAID";

          if (currentPaidDays >= dayValue) {
            currentPaidDays -= dayValue;
            isPaid = true;
            payStatus = "PAID";
          } else {
            isPaid = false;
            payStatus = "UNPAID";
          }

          await connection.execute(
            `
          INSERT INTO LeaveApplicationDays 
          (ApplicationId, LeaveDate, IsHalfDay, HalfDayType, IsPaid, PayStatus)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
            [
              applicationId,
              day.date,
              day.isHalfDay || false,
              day.halfDayType || null,
              isPaid,
              payStatus,
            ]
          );
        }
      }

      await connection.commit();
      return applicationId;
    } catch (error) {
      await connection.rollback();
      console.error("LeaveApplication.create Error:", error);
      throw new Error(`Failed to create leave application: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  static async findById(applicationId) {
    try {
      const [rows] = await pool.execute(
        `
      SELECT la.*, lt.Name as LeaveTypeName, u.FirstName, u.LastName, u.Email, u.Gender,
             lpd.PaidDays as PaymentPaidDays, lpd.UnpaidDays as PaymentUnpaidDays,
             lpd.AvailableBalanceAtTime
      FROM LeaveApplications la
      JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
      JOIN Users u ON la.UserId = u.Id
      LEFT JOIN LeavePaymentDetails lpd ON la.Id = lpd.ApplicationId
      WHERE la.Id = ?
    `,
        [applicationId]
      );

      if (rows.length > 0) {
        const application = rows[0];

        // Get leave days details with payment status
        const [dayRows] = await pool.execute(
          `
        SELECT LeaveDate, IsHalfDay, HalfDayType, IsPaid, PayStatus
        FROM LeaveApplicationDays
        WHERE ApplicationId = ?
        ORDER BY LeaveDate
      `,
          [applicationId]
        );

        application.leaveDays = dayRows;
        return application;
      }

      return null;
    } catch (error) {
      console.error("LeaveApplication.findById Error: ", error);
      throw new Error("Database error");
    }
  }

  static async getByUserId(userId) {
    try {
      const [rows] = await pool.execute(
        `
        SELECT la.*, lt.Name as LeaveTypeName
        FROM LeaveApplications la
        JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
        WHERE la.UserId = ?
        ORDER BY la.AppliedAt DESC
      `,
        [userId]
      );

      return rows;
    } catch (error) {
      console.error("LeaveApplication.getByUserId error:", error);
      throw error;
    }
  }

  static async getPendingForApprover(approverId) {
    try {
      const [rows] = await pool.execute(
        `
        SELECT la.*, lt.Name as LeaveTypeName, u.FirstName, u.LastName, u.Email,
               law.Comments as ApprovalComments, law.ApprovalLevel, la.CalculatedDays
        FROM LeaveApplications la
        JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
        JOIN Users u ON la.UserId = u.Id
        JOIN LeaveApprovalWorkflow law ON la.Id = law.ApplicationId
        WHERE law.ApproverId = ? AND law.Status = 'PENDING' AND la.Status = 'PENDING'
        ORDER BY la.AppliedAt ASC
      `,
        [approverId]
      );

      // Get leave days for each application
      for (let application of rows) {
        const [dayRows] = await pool.execute(
          `
          SELECT LeaveDate, IsHalfDay, HalfDayType
          FROM LeaveApplicationDays
          WHERE ApplicationId = ?
          ORDER BY LeaveDate
        `,
          [application.Id]
        );

        application.leaveDays = dayRows;
      }

      return rows;
    } catch (error) {
      console.error("LeaveApplication.getPendingForApprover error:", error);
      throw error;
    }
  }

  static async getAllForManager(managerId) {
    try {
      const [rows] = await pool.execute(
        `
        SELECT la.*, lt.Name as LeaveTypeName, u.FirstName, u.LastName, u.Email,
               law.Comments as ApprovalComments, law.Status as ApprovalStatus
        FROM LeaveApplications la
        JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
        JOIN Users u ON la.UserId = u.Id
        LEFT JOIN LeaveApprovalWorkflow law ON la.Id = law.ApplicationId
        WHERE law.ApproverId = ? OR u.Id IN (
          SELECT UserId FROM UserReporting WHERE ManagerId = ?
        )
        ORDER BY la.AppliedAt DESC
      `,
        [managerId, managerId]
      );

      return rows;
    } catch (error) {
      console.error("LeaveApplication.getAllForManager error:", error);
      throw error;
    }
  }

  static async updateStatus(
    applicationId,
    status,
    approverId,
    comments = null
  ) {
    try {
      const cleanedComments = comments === undefined ? null : comments;
      const cleanedApproverId = approverId === undefined ? null : approverId;

      await pool.execute(
        `
        UPDATE LeaveApplications
        SET Status = ?, ResponseAt = NOW(), ApprovedBy = ?, RejectionReason = ?
        WHERE Id = ?
      `,
        [status, cleanedApproverId, cleanedComments, applicationId]
      );
    } catch (error) {
      console.error("LeaveApplication.updateStatus error:", error);
      throw error;
    }
  }
static async getAllApplications() {
  try {
    const [rows] = await pool.execute(
      `
      SELECT 
        la.Id,
        la.UserId,
        la.LeaveTypeId,
        la.FromDate,
        la.ToDate,
        la.TotalDays,
        la.HalfDay,
        la.Reason,
        la.Status,
        la.AppliedAt,
        la.ResponseAt,
        la.ApprovedBy,
        la.RejectionReason,
        la.AttachmentUrl,
        la.CalculatedDays,
        la.PaidDays,
        la.UnpaidDays,
        la.IsPartiallyUnpaid,
        lt.Name AS LeaveTypeName,
        u.FirstName,
        u.LastName,
        u.Email
      FROM LeaveApplications la
      JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
      JOIN Users u ON la.UserId = u.Id
      ORDER BY la.AppliedAt DESC
      `
    );

    // Get leave days for each application
    for (let application of rows) {
      const [dayRows] = await pool.execute(
        `
        SELECT LeaveDate, IsHalfDay, HalfDayType, IsPaid, PayStatus
        FROM LeaveApplicationDays
        WHERE ApplicationId = ?
        ORDER BY LeaveDate
        `,
        [application.Id]
      );

      application.leaveDays = dayRows;
    }

    return rows;
  } catch (error) {
    console.error("LeaveApplication.getAllApplications error:", error);
    throw error;
  }
}


}

module.exports = LeaveApplication;
