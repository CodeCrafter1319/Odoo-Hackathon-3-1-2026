const ProjectService = require("../services/ProjectService");
const Project = require("../models/Project");
const { pool } = require("../config/database");
class ProjectController {
  // Get all projects (filtered by user role)
  static async getAllProjects(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userRole = req.user?.role;

      console.log("Get projects request:", { userId, userRole });

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      const projects = await ProjectService.getProjectsForUser(
        userId,
        userRole
      );

      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch projects",
      });
    }
  }

  // Get single project details
  static async getProjectById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      const project = await ProjectService.getProjectById(id, userId, userRole);

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      console.error("Get project error:", error);
      res
        .status(
          error.message === "Project not found or access denied" ? 404 : 500
        )
        .json({
          success: false,
          message: error.message || "Failed to fetch project details",
        });
    }
  }

  // Create new project (Admin/Company only)
  static async createProject(req, res) {
    try {
      const userId = req.user?.id || req.user?.Id;
      const projectData = req.body;

      console.log("Create project request from user:", userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      const result = await ProjectService.createProject(projectData, userId);

      res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: result,
      });
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create project",
      });
    }
  }

  // Update project
  static async updateProject(req, res) {
    try {
      const { id } = req.params;

      await ProjectService.updateProject(
        id,
        req.body,
        req.user.id,
        req.user.role
      );

      const project = await Project.getProjectById(id);

      res.json({
        success: true,
        data: project,
        message: "Project updated successfully",
      });
    } catch (error) {
      console.error("Update project error:", error);
      const statusCode = error.message.includes("permission") ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update project",
      });
    }
  }

  // Delete project (Admin/Company only)
  static async deleteProject(req, res) {
    try {
      const { id } = req.params;

      await ProjectService.deleteProject(id, req.user.id, req.user.role);

      res.json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      console.error("Delete project error:", error);
      const statusCode = error.message.includes("permission") ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to delete project",
      });
    }
  }

  // Get project resources
  static async getProjectResources(req, res) {
    try {
      const { id } = req.params;
      const resources = await ProjectService.getProjectResources(id);

      res.json({
        success: true,
        data: resources,
      });
    } catch (error) {
      console.error("Get project resources error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch project resources",
      });
    }
  }

  // Assign resource to project (Manager only)
  static async assignResource(req, res) {
   try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.Id;
    const resourceData = req.body;

    console.log('Assign resource request:', { projectId: id, userId, resourceData });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const result = await ProjectService.assignResourceToProject(id, resourceData, userId);

    res.status(201).json({
      success: true,
      message: result.message || 'Resource assigned successfully',
      data: result
    });
  } catch (error) {
    console.error('Assign resource error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign resource'
    });
  }
  }

  // Remove resource from project (Manager only)
  static async removeResource(req, res) {
   try {
    const { id, userId: resourceUserId } = req.params;
    const userId = req.user?.id || req.user?.Id;

    console.log('Remove resource request:', { projectId: id, resourceUserId, removedBy: userId });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const result = await ProjectService.removeResourceFromProject(id, resourceUserId, userId);

    res.json({
      success: true,
      message: result.message || 'Resource removed successfully'
    });
  } catch (error) {
    console.error('Remove resource error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove resource'
    });
  }
  }

  // Get available resources for assignment
  static async getAvailableResources(req, res) {
    try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.Id;

    console.log('Get available resources request:', { projectId: id, userId });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const resources = await ProjectService.getAvailableResources(id);

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('Get available resources error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch available resources'
    });
  }
  }

  // Get project statistics
  static async getStatistics(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userRole = req.user?.role;

      console.log("Get statistics request:", { userId, userRole });

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      const statistics = await ProjectService.getProjectStatistics(
        userId,
        userRole
      );

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Get statistics error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch statistics",
      });
    }
  }

  // Get project activity log
  static async getProjectActivity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.Id;
      const userRole = req.user?.role || req.user?.Role;
      const limit = parseInt(req.query.limit) || 50;

      console.log("Get project activity request:", {
        projectId: id,
        userId,
        userRole,
      });

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      // Verify user has access to this project
      const normalizedRole = userRole.toUpperCase();

      if (normalizedRole !== "ADMIN") {
        // Check if manager or resource has access
        const [access] = await pool.query(
          `
        SELECT 1 FROM CompanyProjects p
        LEFT JOIN ProjectResources pr ON p.Id = pr.ProjectId AND pr.UserId = ? AND pr.IsActive = 1
        WHERE p.Id = ? 
          AND p.IsActive = 1
          AND (p.ManagerId = ? OR pr.Id IS NOT NULL)
        LIMIT 1
      `,
          [userId, id, userId]
        );

        if (access.length === 0) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      }

      const activities = await ProjectService.getProjectActivity(id, limit);

      res.json({
        success: true,
        data: activities,
      });
    } catch (error) {
      console.error("Get project activity error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch project activity",
      });
    }
  }
}

module.exports = ProjectController;
