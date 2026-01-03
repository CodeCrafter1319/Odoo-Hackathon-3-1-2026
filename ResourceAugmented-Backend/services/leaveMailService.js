// services/leaveMailService.js
const leaveTransporter = require('../config/leave-mail');
const { pool } = require('../config/database');

class LeaveMailService {
  
  // Generic mail sending method
  static async sendMail(options) {
    try {
      const info = await leaveTransporter.sendMail(options);
      console.log('Leave mail sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Leave mail send error:', error);
      throw error;
    }
  }

  // Fetch manager email from database for a specific employee
  static async getManagerEmailByEmployeeId(employeeId) {
    try {
      const [managerRows] = await pool.execute(`
        SELECT u.Email, u.FirstName, u.LastName
        FROM UserReporting ur
        JOIN Users u ON ur.ManagerId = u.Id
        WHERE ur.UserId = ? AND u.IsActive = TRUE
      `, [employeeId]);

      if (managerRows.length === 0) {
        console.log(`No manager found for employee ID: ${employeeId}`);
        return null;
      }

      const manager = managerRows[0];
      console.log(`Manager found: ${manager.FirstName} ${manager.LastName} <${manager.Email}> for employee ID: ${employeeId}`);
      return {
        email: manager.Email,
        name: `${manager.FirstName} ${manager.LastName}`
      };
    } catch (error) {
      console.error('Error fetching manager email:', error);
      throw error;
    }
  }

  // Fetch employee email from database
  static async getEmployeeEmailById(employeeId) {
    try {
      const [employeeRows] = await pool.execute(`
        SELECT Email, FirstName, LastName
        FROM Users
        WHERE Id = ? AND IsActive = TRUE
      `, [employeeId]);

      if (employeeRows.length === 0) {
        console.log(`No employee found with ID: ${employeeId}`);
        return null;
      }

      const employee = employeeRows[0];
      console.log(`Employee found: ${employee.FirstName} ${employee.LastName} <${employee.Email}> for ID: ${employeeId}`);
      return {
        email: employee.Email,
        name: `${employee.FirstName} ${employee.LastName}`
      };
    } catch (error) {
      console.error('Error fetching employee email:', error);
      throw error;
    }
  }

  // Send leave application notification to manager
  static async sendLeaveApplicationNotification(employeeId, leaveApplicationData) {
    try {
      // Fetch manager email from database
      const managerInfo = await this.getManagerEmailByEmployeeId(employeeId);
      if (!managerInfo) {
        console.log('Skipping email notification - no manager found');
        return null;
      }

      // Fetch employee info from database
      const employeeInfo = await this.getEmployeeEmailById(employeeId);
      if (!employeeInfo) {
        throw new Error('Employee information not found');
      }

      const { 
        leaveType, 
        fromDate, 
        toDate, 
        totalDays, 
        reason, 
        applicationId 
      } = leaveApplicationData;

      const subject = `Leave Application Submitted - ${employeeInfo.name}`;
      
      // Format dates safely
      const formatDate = (dateStr) => {
        try {
          return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch (error) {
          return 'Invalid Date';
        }
      };

      const safeFromDate = formatDate(fromDate);
      const safeToDate = formatDate(toDate);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: white; padding: 0; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .details-table th, .details-table td { 
              padding: 12px; 
              text-align: left; 
              border: 1px solid #ddd; 
            }
            .details-table th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
              color: #495057; 
            }
            .action-link { 
              display: inline-block; 
              background-color: #007bff; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0; 
            }
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
              <h1>Leave Application by ${employeeInfo.name}</h1>
            </div>
            
            <div class="content">
              <p>Dear ${managerInfo.name},</p>
              
              <p>A new leave application has been submitted by <strong>${employeeInfo.name}</strong> and requires your approval.</p>
              
              <table class="details-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Employee</td>
                    <td>${employeeInfo.name}</td>
                  </tr>
                  <tr>
                    <td>Leave Type</td>
                    <td>${leaveType || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>From Date</td>
                    <td>${safeFromDate}</td>
                  </tr>
                  <tr>
                    <td>To Date</td>
                    <td>${safeToDate}</td>
                  </tr>
                  <tr>
                    <td>Total Days</td>
                    <td>${totalDays || 'N/A'} day(s)</td>
                  </tr>
                  <tr>
                    <td>Reason</td>
                    <td>${reason || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Application ID</td>
                    <td>#${applicationId}</td>
                  </tr>
                </tbody>
              </table>
              
              <div style="text-align: center;">
                <a href="${process.env.LEAVE_FRONTEND_URL}/manager/leave-approvals" class="action-link">
                  Review Application
                </a>
              </div>
              
              <p><strong>Important:</strong> Please review and respond to this leave application at your earliest convenience.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email from the Leave Management System.</p>
              <p>Employee: ${employeeInfo.email} | Application ID: #${applicationId}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.LEAVE_EMAIL_FROM,
        to: managerInfo.email,
        subject: subject,
        html: htmlContent,
      };

      const result = await this.sendMail(mailOptions);
      console.log(`Leave application notification sent to manager: ${managerInfo.email}`);
      return result;
      
    } catch (error) {
      console.error('Error sending leave application notification:', error);
      throw error;
    }
  }

  // Send leave approval/rejection notification to employee
  static async sendLeaveApprovalNotification(employeeId, approverId, leaveApprovalData) {
    try {
      // Fetch employee email from database
      const employeeInfo = await this.getEmployeeEmailById(employeeId);
      if (!employeeInfo) {
        throw new Error('Employee information not found');
      }

      // Fetch manager info from database
      const managerInfo = await this.getEmployeeEmailById(approverId);
      if (!managerInfo) {
        throw new Error('Manager information not found');
      }

      const {
        leaveType,
        fromDate,
        toDate,
        totalDays,
        status,
        comments,
        applicationId
      } = leaveApprovalData;

      // Safe variable handling
      const safeStatus = (status || 'PROCESSED').toString().toUpperCase();
      const isApproved = safeStatus === 'APPROVED';
      const statusText = isApproved ? 'approved' : 'rejected';
      
      const safeLeaveType = leaveType || 'Unknown Leave Type';
      const safeTotalDays = totalDays || '0';
      const safeComments = comments || '';
      
      // Safe date formatting
      const formatDate = (dateStr) => {
        try {
          return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric', 
            month: 'short',
            day: 'numeric'
          });
        } catch (error) {
          return 'Invalid Date';
        }
      };

      const safeFromDate = formatDate(fromDate);
      const safeToDate = formatDate(toDate);

      const subject = `Leave Application ${isApproved ? 'Approved' : 'Rejected'} - ${safeLeaveType}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: white; padding: 0; }
            .header { color: white; padding: 20px; text-align: center; }
            .header.approved { background-color: #28a745; }
            .header.rejected { background-color: #dc3545; }
            .content { padding: 30px; }
            .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .details-table th, .details-table td { 
              padding: 12px; 
              text-align: left; 
              border: 1px solid #ddd; 
            }
            .details-table th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
              color: #495057; 
            }
            .comments-section { 
              background-color: #f8f9fa; 
              padding: 15px; 
              border-radius: 4px; 
              margin: 20px 0; 
              border-left: 4px solid #007bff; 
            }
            .footer { 
              background-color: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              color: #6c757d; 
              font-size: 12px; 
            }
            .message-box { 
              padding: 15px; 
              border-radius: 4px; 
              margin: 20px 0; 
            }
            .message-approved { 
              background-color: #d4edda; 
              color: #155724; 
              border: 1px solid #c3e6cb; 
            }
            .message-rejected { 
              background-color: #f8d7da; 
              color: #721c24; 
              border: 1px solid #f5c6cb; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header ${isApproved ? 'approved' : 'rejected'}">
              <h1>Leave Application ${isApproved ? 'Approved' : 'Rejected'}</h1>
            </div>
            
            <div class="content">
              <p>Dear ${employeeInfo.name},</p>
              
              <p>Your leave application has been <strong>${statusText}</strong> by <strong>${managerInfo.name}</strong>.</p>
              
              <table class="details-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Leave Type</td>
                    <td>${safeLeaveType}</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td><strong>${safeStatus}</strong></td>
                  </tr>
                  <tr>
                    <td>From Date</td>
                    <td>${safeFromDate}</td>
                  </tr>
                  <tr>
                    <td>To Date</td>
                    <td>${safeToDate}</td>
                  </tr>
                  <tr>
                    <td>Total Days</td>
                    <td>${safeTotalDays} day(s)</td>
                  </tr>
                  <tr>
                    <td>Reviewed by</td>
                    <td>${managerInfo.name}</td>
                  </tr>
                </tbody>
              </table>
              
              ${safeComments ? `
                <div class="comments-section">
                  <h4>Manager's Comments:</h4>
                  <p>${safeComments}</p>
                </div>
              ` : ''}
              
              <div class="message-box ${isApproved ? 'message-approved' : 'message-rejected'}">
                ${isApproved ? 
                  '<strong>Congratulations!</strong> Your leave has been approved. Please ensure proper handover of your responsibilities.' :
                  'If you have any questions regarding this decision, please contact your manager directly.'
                }
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated email from the Leave Management System.</p>
              <p>Manager: ${managerInfo.email} | Application ID: #${applicationId}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.LEAVE_EMAIL_FROM,
        to: employeeInfo.email,
        subject: subject,
        html: htmlContent,
      };

      const result = await this.sendMail(mailOptions);
      console.log(`Leave ${statusText} notification sent to employee: ${employeeInfo.email}`);
      return result;
      
    } catch (error) {
      console.error('Error sending leave approval notification:', error);
      throw error;
    }
  }

  // Get all managers for notification (if needed for multiple managers)
  static async getAllManagerEmails() {
    try {
      const [managerRows] = await pool.execute(`
        SELECT Email, FirstName, LastName
        FROM Users
        WHERE Role IN ('MANAGER', 'ADMIN') AND IsActive = TRUE
        ORDER BY Role DESC, FirstName, LastName
      `);

      return managerRows.map(manager => ({
        email: manager.Email,
        name: `${manager.FirstName} ${manager.LastName}`
      }));
    } catch (error) {
      console.error('Error fetching all manager emails:', error);
      throw error;
    }
  }
}

module.exports = LeaveMailService;
