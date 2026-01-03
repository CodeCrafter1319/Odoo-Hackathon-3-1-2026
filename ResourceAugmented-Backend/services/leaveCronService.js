// services/leaveCronService.js
const cron = require("node-cron");
const { pool } = require("../config/database");
const LeaveMailService = require("./leaveMailService");

class LeaveCronService {
  static async getLeavesStartingTomorrow() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split("T")[0];

      const [rows] = await pool.execute(
        `
        SELECT 
          la.Id as applicationId,
          la.FromDate,
          la.ToDate,
          la.TotalDays,
          la.Reason,
          lt.Name as LeaveTypeName,
          emp.FirstName as EmployeeFirstName,
          emp.LastName as EmployeeLastName,
          emp.Email as EmployeeEmail,
          mgr.FirstName as ManagerFirstName,
          mgr.LastName as ManagerLastName,
          mgr.Email as ManagerEmail
        FROM LeaveApplications la
        JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
        JOIN Users emp ON la.UserId = emp.Id
        JOIN UserReporting ur ON emp.Id = ur.UserId
        JOIN Users mgr ON ur.ManagerId = mgr.Id
        WHERE DATE(la.FromDate) = ? 
        AND la.Status = 'APPROVED'
        AND la.FromDate >= CURDATE()
        ORDER BY mgr.Email, emp.FirstName
      `,
        [tomorrowDate]
      );

      return rows;
    } catch (error) {
      console.error("Error fetching leaves starting tomorrow:", error);
      return [];
    }
  }

  static async getLeavesStartingToday() {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [rows] = await pool.execute(
        `
        SELECT 
          la.Id as applicationId,
          la.FromDate,
          la.ToDate,
          la.TotalDays,
          la.Reason,
          lt.Name as LeaveTypeName,
          emp.FirstName as EmployeeFirstName,
          emp.LastName as EmployeeLastName,
          emp.Email as EmployeeEmail,
          mgr.FirstName as ManagerFirstName,
          mgr.LastName as ManagerLastName,
          mgr.Email as ManagerEmail
        FROM LeaveApplications la
        JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
        JOIN Users emp ON la.UserId = emp.Id
        JOIN UserReporting ur ON emp.Id = ur.UserId
        JOIN Users mgr ON ur.ManagerId = mgr.Id
        WHERE DATE(la.FromDate) = ? 
        AND la.Status = 'APPROVED'
        ORDER BY mgr.Email, emp.FirstName
      `,
        [today]
      );

      return rows;
    } catch (error) {
      console.error("Error fetching leaves starting today:", error);
      return [];
    }
  }

  static async sendLeaveReminderEmail(
    managerEmail,
    managerName,
    leaves,
    notificationType
  ) {
    try {
      const isAdvanceNotice = notificationType === "tomorrow";
      const subject = isAdvanceNotice
        ? `Leave Reminder - Employees on Leave Tomorrow`
        : `Leave Notification - Employees on Leave Today`;

      // Group leaves by employee for better email format
      const leavesList = leaves.map((leave) => ({
        employeeName: `${leave.EmployeeFirstName} ${leave.EmployeeLastName}`,
        leaveType: leave.LeaveTypeName,
        fromDate: leave.FromDate,
        toDate: leave.ToDate,
        totalDays: leave.TotalDays,
        reason: leave.Reason,
      }));

      const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: white; padding: 0; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .leave-item { 
              border: 1px solid #ddd; 
              border-radius: 4px; 
              padding: 15px; 
              margin: 10px 0; 
              background-color: #f9f9f9; 
            }
            .employee-name { font-weight: bold; color: #2c3e50; font-size: 16px; }
            .leave-details { margin-top: 8px; }
            .detail-row { margin: 4px 0; }
            .footer { 
              background-color: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              color: #6c757d; 
              font-size: 12px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${
                isAdvanceNotice ? "Leave Reminder" : "Leave Notification"
              }</h1>
              <p>${
                isAdvanceNotice
                  ? "Employees on Leave Tomorrow"
                  : "Employees on Leave Today"
              }</p>
            </div>
            
            <div class="content">
              <p>Dear ${managerName},</p>
              
              <p>${
                isAdvanceNotice
                  ? "This is a reminder that the following employees will be on leave tomorrow:"
                  : "The following employees are on leave today:"
              }</p>
              
              ${leavesList
                .map(
                  (leave) => `
                <div class="leave-item">
                  <div class="employee-name">${leave.employeeName}</div>
                  <div class="leave-details">
                    <div class="detail-row"><strong>Leave Type:</strong> ${
                      leave.leaveType
                    }</div>
                    <div class="detail-row"><strong>From:</strong> ${formatDate(
                      leave.fromDate
                    )}</div>
                    <div class="detail-row"><strong>To:</strong> ${formatDate(
                      leave.toDate
                    )}</div>
                    <div class="detail-row"><strong>Duration:</strong> ${
                      leave.totalDays
                    } day(s)</div>
                    <div class="detail-row"><strong>Reason:</strong> ${
                      leave.reason
                    }</div>
                  </div>
                </div>
              `
                )
                .join("")}
              
              <p>${
                isAdvanceNotice
                  ? "Please plan accordingly for tomorrow's staffing requirements."
                  : "Please ensure coverage is in place for these employees."
              }</p>
              
              <p>Thank you.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email from the Leave Management System.</p>
              <p>Total employees: ${leavesList.length}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.LEAVE_EMAIL_FROM,
        to: managerEmail,
        subject: subject,
        html: htmlContent,
      };

      await LeaveMailService.sendMail(mailOptions);
      console.log(`Leave reminder email sent to manager: ${managerEmail}`);
    } catch (error) {
      console.error("Error sending leave reminder email:", error);
      throw error;
    }
  }

  static async sendDailyLeaveNotifications() {
    try {
      console.log(
        "Running daily leave notification cron job at:",
        new Date().toLocaleString()
      );

      const leavesTomorrow = await this.getLeavesStartingTomorrow();

      const leavesToday = await this.getLeavesStartingToday();

      const managerGroups = {};

      leavesTomorrow.forEach((leave) => {
        const managerEmail = leave.ManagerEmail;
        if (!managerGroups[managerEmail]) {
          managerGroups[managerEmail] = {
            managerName: `${leave.ManagerFirstName} ${leave.ManagerLastName}`,
            tomorrow: [],
            today: [],
          };
        }
        managerGroups[managerEmail].tomorrow.push(leave);
      });

      leavesToday.forEach((leave) => {
        const managerEmail = leave.ManagerEmail;
        if (!managerGroups[managerEmail]) {
          managerGroups[managerEmail] = {
            managerName: `${leave.ManagerFirstName} ${leave.ManagerLastName}`,
            tomorrow: [],
            today: [],
          };
        }
        managerGroups[managerEmail].today.push(leave);
      });

      for (const [managerEmail, data] of Object.entries(managerGroups)) {
        if (data.tomorrow.length > 0) {
          await this.sendLeaveReminderEmail(
            managerEmail,
            data.managerName,
            data.tomorrow,
            "tomorrow"
          );
        }

        if (data.today.length > 0) {
          await this.sendLeaveReminderEmail(
            managerEmail,
            data.managerName,
            data.today,
            "today"
          );
        }
      }

      console.log(
        `Leave notifications sent to ${
          Object.keys(managerGroups).length
        } managers`
      );
      console.log(
        `Tomorrow's leaves: ${leavesTomorrow.length}, Today's leaves: ${leavesToday.length}`
      );
    } catch (error) {
      console.error("Error in daily leave notification cron job:", error);
    }
  }

  static initializeCronJobs() {
    cron.schedule(
      "0 10 * * *",
      async () => {
        await this.sendDailyLeaveNotifications();
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata",
      }
    );

    console.log(
      "Leave notification cron job scheduled to run daily at 10:00 AM IST"
    );
  }
}

module.exports = LeaveCronService;
