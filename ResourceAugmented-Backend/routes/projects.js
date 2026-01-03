const express = require("express");
const router = express.Router();
const ProjectController = require("../controllers/ProjectController");
const authMiddleware = require("../middleware/auth");

// Apply authentication to all project routes
router.use(authMiddleware);

// ===== PROJECT ROUTES =====

// Get all projects (filtered by user role)
router.get("/", ProjectController.getAllProjects);

// Get project statistics
router.get("/statistics", ProjectController.getStatistics);

// Get single project details
router.get("/:id", ProjectController.getProjectById);

// Create new project (Admin/Company only)
router.post("/", ProjectController.createProject);

// Update project
router.put("/:id", ProjectController.updateProject);

// Delete project (Admin/Company only)
router.delete("/:id", ProjectController.deleteProject);

// ===== PROJECT RESOURCE ROUTES =====

// Get project resources
router.get("/:id/resources", ProjectController.getProjectResources);

// Get available resources for assignment
router.get("/:id/available-resources", ProjectController.getAvailableResources);

// Assign resource to project (Manager only)
router.post("/:id/resources", ProjectController.assignResource);

// Remove resource from project (Manager only)
router.delete("/:id/resources/:userId", ProjectController.removeResource);

// ===== PROJECT ACTIVITY =====

// Get project activity log
router.get("/:id/activity", ProjectController.getProjectActivity);

module.exports = router;
