const LeaveService = require("../services/leaveService");
const LeaveApplication = require("../models/LeaveApplication");

function sanitizeParams(obj) {
  const cleaned = {};
  for (const key in obj) {
    cleaned[key] = obj[key] === undefined ? null : obj[key];
  }
  return cleaned;
}

class LeaveController {
  // Apply for leave
 static async applyLeave(req, res) {
  try {
    const userId = req.user.Id;
    
    console.log('Received leave application data:', req.body);
    console.log('User ID:', userId);
    
    // Validate request body structure
    if (!req.body) {
      return res.status(400).json({ 
        success: false, 
        message: 'Request body is required' 
      });
    }
    
    const { leaveTypeId, fromDate, toDate, reason, leaveDays } = req.body;
    
    // Validate required fields
    if (!leaveTypeId || !fromDate || !toDate || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: leaveTypeId, fromDate, toDate, reason' 
      });
    }
    
    // Validate leaveDays array
    if (!leaveDays || !Array.isArray(leaveDays) || leaveDays.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'leaveDays array is required and cannot be empty' 
      });
    }
    
    // Validate each leave day
    for (const day of leaveDays) {
      if (!day.date || typeof day.isHalfDay !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          message: 'Each leave day must have date and isHalfDay properties' 
        });
      }
    }
    
    const result = await LeaveService.applyLeave(userId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Apply leave controller error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to apply for leave' 
    });
  }
}


  // Get user's leave applications
  static async getMyLeaveApplications(req, res) {
    try {
      const userId = req.user.Id;
      const applications = await LeaveApplication.getByUserId(userId);
      res.json({ success: true, data: applications });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getPendingForResource(req, res) {
  try {
    const userId = req.user.Id;
    // Reuse model: getByUserId and filter server-side for Status = 'PENDING'
    const applications = await LeaveApplication.getByUserId(userId);
    const pending = (applications || []).filter(a => a.Status === 'PENDING');
    res.json({ success: true, data: pending });
  } catch (error) {
    console.error('getPendingForResource error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

  // Get leave types for current user (filtered by gender)
   static async getLeaveTypes(req, res) {
    try {
      const userId = req.user.Id;
      const leaveTypes = await LeaveService.getLeaveTypesForUser(userId);
      res.json({ success: true, data: leaveTypes });
    } catch (error) {
      console.error('getLeaveTypes error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get leave balance
  static async getLeaveBalance(req, res) {
    try {
      const userId = req.user.Id;
      const year = req.query.year || new Date().getFullYear();
      const balance = await LeaveService.getLeaveBalance(userId, year);
      res.json({ success: true, data: balance });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get pending approvals (for managers)
  static async getPendingApprovals(req, res) {
    try {
      const approverId = req.user.Id;
      console.log('Getting pending approvals for manager:', approverId);
      const pending = await LeaveApplication.getPendingForApprover(approverId);
      console.log('Found pending approvals:', pending.length);
      res.json({ success: true, data: pending });
    } catch (error) {
      console.error('getPendingApprovals error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get all leave applications for managers
  static async getAllLeaveApplications(req, res) {
  try {
    const userId = req.user.Id;
    const userRole = req.user.Role; // Make sure Role is included in your JWT token
    
    let applications;
    
    if (userRole === 'ADMIN') {
      // Admins see ALL applications across the entire organization
      applications = await LeaveApplication.getAllApplications();
    } else if (userRole === 'MANAGER') {
      // Managers see only their team's applications
      applications = await LeaveApplication.getAllForManager(userId);
    } else {
      // Regular employees shouldn't access this endpoint
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error in getAllLeaveApplications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}


  // Process leave approval/rejection
  static async processLeaveAction(req, res) {
    try {
      const approverId = req.user.Id;
      const sanitizedBody = sanitizeParams(req.body);
      const { applicationId, action, comments } = sanitizedBody;
      
      console.log('Processing leave action:', { applicationId, action, comments, approverId });
      
      if (!applicationId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Application ID and action are required'
        });
      }

      if (!['APPROVED', 'REJECTED'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action must be APPROVED or REJECTED'
        });
      }

      await LeaveService.processLeaveApproval(approverId, applicationId, action, comments);
      
      res.json({
        success: true,
        message: `Leave ${action.toLowerCase()} successfully`
      });
    } catch (error) {
      console.error('processLeaveAction error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get manager dashboard stats
  static async getManagerDashboardStats(req, res) {
    try {
      const managerId = req.user.Id;
      const stats = await LeaveService.getManagerDashboardStats(managerId);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('getManagerDashboardStats error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get team members for a manager
  static async getTeamMembers(req, res) {
    try {
      const managerId = req.user.Id;
      const teamMembers = await LeaveService.getTeamMembers(managerId);
      res.json({ success: true, data: teamMembers });
    } catch (error) {
      console.error('getTeamMembers error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = LeaveController;
