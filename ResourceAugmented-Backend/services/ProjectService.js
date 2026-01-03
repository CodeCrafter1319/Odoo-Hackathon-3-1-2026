const { pool } = require("../config/database");

class ProjectService {
  async getProjectsForUser(userId, userRole) {
    try {
      console.log("Getting projects for user:", userId, "with role:", userRole);

      let query = "";
      let params = [];
      const normalizedRole = userRole ? userRole.toUpperCase() : null;

      switch (normalizedRole) {
        case "ADMIN":
          query = `
          SELECT 
            p.*,
            CONCAT(u.FirstName, ' ', u.LastName) as ManagerName,
            u.Email as ManagerEmail,
            COUNT(DISTINCT pr.UserId) as TotalResources
          FROM CompanyProjects p
          LEFT JOIN Users u ON p.ManagerId = u.Id
          LEFT JOIN ProjectResources pr ON p.Id = pr.ProjectId AND pr.IsActive = 1
          WHERE p.IsActive = 1
          GROUP BY p.Id
          ORDER BY p.CreatedAt DESC
        `;
          break;

        case "MANAGER":
          query = `
          SELECT 
            p.*,
            CONCAT(u.FirstName, ' ', u.LastName) as ManagerName,
            u.Email as ManagerEmail,
            COUNT(DISTINCT pr.UserId) as TotalResources
          FROM CompanyProjects p
          LEFT JOIN Users u ON p.ManagerId = u.Id
          LEFT JOIN ProjectResources pr ON p.Id = pr.ProjectId AND pr.IsActive = 1
          WHERE p.IsActive = 1 AND p.ManagerId = ?
          GROUP BY p.Id
          ORDER BY p.CreatedAt DESC
        `;
          params = [userId];
          break;

        case "RESOURCE":
          query = `
          SELECT 
            p.*,
            CONCAT(u.FirstName, ' ', u.LastName) as ManagerName,
            u.Email as ManagerEmail,
            COUNT(DISTINCT pr2.UserId) as TotalResources,
            pr.Role as MyRole,
            pr.AllocationPercentage,
            pr.AssignedDate,
            pr.StartDate as MyStartDate,
            pr.EndDate as MyEndDate
          FROM CompanyProjects p
          INNER JOIN ProjectResources pr ON p.Id = pr.ProjectId 
            AND pr.UserId = ? AND pr.IsActive = 1
          LEFT JOIN Users u ON p.ManagerId = u.Id
          LEFT JOIN ProjectResources pr2 ON p.Id = pr2.ProjectId AND pr2.IsActive = 1
          WHERE p.IsActive = 1
          GROUP BY p.Id
          ORDER BY p.CreatedAt DESC
        `;
          params = [userId];
          break;

        default:
          throw new Error(`Invalid user role: ${userRole}`);
      }
      const [projects] = await pool.query(query, params);

      // Safe JSON parsing with error handling
      return projects.map((project) => {
        let technologies = [];

        if (project.Technologies) {
          try {
            // Check if it's already a JSON object (some MySQL drivers auto-parse)
            if (typeof project.Technologies === "string") {
              technologies = JSON.parse(project.Technologies);
            } else if (Array.isArray(project.Technologies)) {
              technologies = project.Technologies;
            } else {
              technologies = [];
            }
          } catch (parseError) {
            console.error(
              `Error parsing technologies for project ${project.Id}:`,
              parseError
            );
            console.error("Technologies value:", project.Technologies);
            technologies = [];
          }
        }

        return {
          ...project,
          Technologies: technologies,
        };
      });
    } catch (error) {
      console.error("Error in getProjectsForUser:", error);
      throw error;
    }
  }
  async getProjectById(projectId, userId, userRole) {
    try {
      const normalizedRole = userRole ? userRole.toUpperCase() : null;

      let query = `
      SELECT 
        p.*,
        CONCAT(u.FirstName, ' ', u.LastName) as ManagerName,
        u.Email as ManagerEmail,
        CONCAT(creator.FirstName, ' ', creator.LastName) as CreatedByName
      FROM CompanyProjects p
      LEFT JOIN Users u ON p.ManagerId = u.Id
      LEFT JOIN Users creator ON p.CreatedBy = creator.Id
      WHERE p.Id = ? AND p.IsActive = 1
    `;

      const params = [projectId];

      if (normalizedRole === "MANAGER") {
        query += " AND p.ManagerId = ?";
        params.push(userId);
      } else if (normalizedRole === "RESOURCE") {
        query += ` AND EXISTS (
        SELECT 1 FROM ProjectResources pr 
        WHERE pr.ProjectId = p.Id AND pr.UserId = ? AND pr.IsActive = 1
      )`;
        params.push(userId);
      }

      const [projects] = await pool.query(query, params);

      if (projects.length === 0) {
        throw new Error("Project not found or access denied");
      }

      const project = projects[0];

      // Safe JSON parsing
      let technologies = [];
      if (project.Technologies) {
        try {
          if (typeof project.Technologies === "string") {
            technologies = JSON.parse(project.Technologies);
          } else if (Array.isArray(project.Technologies)) {
            technologies = project.Technologies;
          }
        } catch (parseError) {
          console.error(
            `Error parsing technologies for project ${project.Id}:`,
            parseError
          );
          technologies = [];
        }
      }
      project.Technologies = technologies;

      const [resources] = await pool.query(
        `
      SELECT 
        pr.*,
        CONCAT(u.FirstName, ' ', u.LastName) as ResourceName,
        u.Email as ResourceEmail,
        u.Role as ResourceRole,
        CONCAT(assigner.FirstName, ' ', assigner.LastName) as AssignedByName
      FROM ProjectResources pr
      INNER JOIN Users u ON pr.UserId = u.Id
      LEFT JOIN Users assigner ON pr.AssignedBy = assigner.Id
      WHERE pr.ProjectId = ? AND pr.IsActive = 1
      ORDER BY pr.AssignedDate DESC
    `,
        [projectId]
      );

      project.resources = resources;
      return project;
    } catch (error) {
      console.error("Error in getProjectById:", error);
      throw error;
    }
  }

  // Get project statistics
  async getProjectStatistics(userId, userRole) {
    try {
      const normalizedRole = userRole ? userRole.toUpperCase() : null;

      let query = "";
      let params = [];

      switch (normalizedRole) {
        case "ADMIN":
          query = `
            SELECT 
              COUNT(DISTINCT CASE WHEN p.IsActive = 1 THEN p.Id END) as TotalProjects,
              COUNT(DISTINCT CASE WHEN p.Status = 'ACTIVE' AND p.IsActive = 1 THEN p.Id END) as ActiveProjects,
              COUNT(DISTINCT CASE WHEN p.Status = 'PLANNING' AND p.IsActive = 1 THEN p.Id END) as PlanningProjects,
              COUNT(DISTINCT CASE WHEN p.Status = 'COMPLETED' AND p.IsActive = 1 THEN p.Id END) as CompletedProjects,
              COUNT(DISTINCT pr.UserId) as TotalResourcesAssigned
            FROM CompanyProjects p
            LEFT JOIN ProjectResources pr ON p.Id = pr.ProjectId AND pr.IsActive = 1
          `;
          break;

        case "MANAGER":
          query = `
            SELECT 
              COUNT(DISTINCT CASE WHEN p.IsActive = 1 THEN p.Id END) as TotalProjects,
              COUNT(DISTINCT CASE WHEN p.Status = 'ACTIVE' AND p.IsActive = 1 THEN p.Id END) as ActiveProjects,
              COUNT(DISTINCT CASE WHEN p.Status = 'PLANNING' AND p.IsActive = 1 THEN p.Id END) as PlanningProjects,
              COUNT(DISTINCT CASE WHEN p.Status = 'COMPLETED' AND p.IsActive = 1 THEN p.Id END) as CompletedProjects,
              COUNT(DISTINCT pr.UserId) as TotalResourcesAssigned
            FROM CompanyProjects p
            LEFT JOIN ProjectResources pr ON p.Id = pr.ProjectId AND pr.IsActive = 1
            WHERE p.ManagerId = ?
          `;
          params = [userId];
          break;

        case "RESOURCE":
          query = `
            SELECT 
              COUNT(DISTINCT p.Id) as TotalProjects,
              COUNT(DISTINCT CASE WHEN p.Status = 'ACTIVE' THEN p.Id END) as ActiveProjects,
              0 as PlanningProjects,
              0 as CompletedProjects,
              0 as TotalResourcesAssigned
            FROM CompanyProjects p
            INNER JOIN ProjectResources pr ON p.Id = pr.ProjectId 
              AND pr.UserId = ? 
              AND pr.IsActive = 1
            WHERE p.IsActive = 1
          `;
          params = [userId];
          break;

        default:
          throw new Error(`Invalid user role: ${userRole}`);
      }

      const [results] = await pool.query(query, params);
      return (
        results[0] || {
          TotalProjects: 0,
          ActiveProjects: 0,
          PlanningProjects: 0,
          CompletedProjects: 0,
          TotalResourcesAssigned: 0,
        }
      );
    } catch (error) {
      console.error("Error in getProjectStatistics:", error);
      throw error;
    }
  }

  // Get project resources
  async getProjectResources(projectId) {
    try {
      const [resources] = await pool.query(
        `
        SELECT 
          pr.*,
          CONCAT(u.FirstName, ' ', u.LastName) as ResourceName,
          u.Email as ResourceEmail,
          u.Role as ResourceRole,
          CONCAT(assigner.FirstName, ' ', assigner.LastName) as AssignedByName
        FROM ProjectResources pr
        INNER JOIN Users u ON pr.UserId = u.Id
        LEFT JOIN Users assigner ON pr.AssignedBy = assigner.Id
        WHERE pr.ProjectId = ? AND pr.IsActive = 1
        ORDER BY pr.AssignedDate DESC
      `,
        [projectId]
      );

      return resources;
    } catch (error) {
      console.error("Error in getProjectResources:", error);
      throw error;
    }
  }

  // Get available resources
  async getAvailableResources(projectId) {
    try {
      const [resources] = await pool.query(
        `
      SELECT 
        u.Id,
        CONCAT(u.FirstName, ' ', u.LastName) as Name,
        u.Email,
        u.Role,
        COUNT(DISTINCT pr.ProjectId) as CurrentProjectsCount,
        GROUP_CONCAT(DISTINCT p.ProjectName SEPARATOR ', ') as CurrentProjects
      FROM Users u
      LEFT JOIN ProjectResources pr ON u.Id = pr.UserId 
        AND pr.IsActive = 1
        AND pr.ProjectId != ?
      LEFT JOIN CompanyProjects p ON pr.ProjectId = p.Id AND p.IsActive = 1
      WHERE u.IsActive = 1
        AND u.Id NOT IN (
          SELECT UserId 
          FROM ProjectResources 
          WHERE ProjectId = ? AND IsActive = 1
        )
      GROUP BY u.Id
      ORDER BY u.FirstName, u.LastName ASC
    `,
        [projectId, projectId]
      );

      return resources;
    } catch (error) {
      console.error("Error in getAvailableResources:", error);
      throw error;
    }
  }

  // Assign resource to project
  async assignResourceToProject(projectId, resourceData, assignedBy) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        userId,
        role = null,
        allocationPercentage = 100,
        startDate = null,
        endDate = null,
        notes = null,
      } = resourceData;

      // Check if resource is already assigned
      const [existing] = await connection.query(
        `
      SELECT Id FROM ProjectResources 
      WHERE ProjectId = ? AND UserId = ? AND IsActive = 1
    `,
        [projectId, userId]
      );

      if (existing.length > 0) {
        throw new Error("Resource is already assigned to this project");
      }

      // Verify user exists and is a valid resource
      const [users] = await connection.query(
        `
      SELECT Id, CONCAT(FirstName, ' ', LastName) as Name, Role 
      FROM Users 
      WHERE Id = ? AND IsActive = 1
    `,
        [userId]
      );

      if (users.length === 0) {
        throw new Error("User not found or inactive");
      }

      const user = users[0];

      // Insert resource assignment
      const [result] = await connection.query(
        `
      INSERT INTO ProjectResources (
        ProjectId,
        UserId,
        Role,
        AllocationPercentage,
        StartDate,
        EndDate,
        AssignedBy,
        AssignedDate,
        Notes,
        IsActive,
        CreatedAt,
        UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1, NOW(), NOW())
    `,
        [
          projectId,
          userId,
          role,
          allocationPercentage,
          startDate,
          endDate,
          assignedBy,
          notes,
        ]
      );

      // Update project's TotalResources count
      await connection.query(
        `
      UPDATE CompanyProjects 
      SET TotalResources = (
        SELECT COUNT(DISTINCT UserId) 
        FROM ProjectResources 
        WHERE ProjectId = ? AND IsActive = 1
      ),
      UpdatedAt = NOW()
      WHERE Id = ?
    `,
        [projectId, projectId]
      );

      // Log activity
      try {
        await connection.query(
          `
        INSERT INTO ProjectActivityLog (
          ProjectId,
          UserId,
          ActivityType,
          Description,
          NewValue,
          CreatedAt
        ) VALUES (?, ?, 'RESOURCE_ADDED', ?, ?, NOW())
      `,
          [
            projectId,
            assignedBy,
            `${user.Name} was assigned to the project as ${role || user.Role}`,
            JSON.stringify({ userId, role, allocationPercentage }),
          ]
        );
      } catch (activityError) {
        console.warn("Failed to log activity:", activityError.message);
      }

      await connection.commit();

      return {
        id: result.insertId,
        success: true,
        message: `${user.Name} assigned successfully`,
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in assignResourceToProject:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Remove resource from project
  async removeResourceFromProject(projectId, userId, removedBy) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get resource details before removing
      const [resources] = await connection.query(
        `
      SELECT 
        pr.*,
        CONCAT(u.FirstName, ' ', u.LastName) as ResourceName
      FROM ProjectResources pr
      INNER JOIN Users u ON pr.UserId = u.Id
      WHERE pr.ProjectId = ? AND pr.UserId = ? AND pr.IsActive = 1
    `,
        [projectId, userId]
      );

      if (resources.length === 0) {
        throw new Error("Resource not found in this project");
      }

      const resource = resources[0];

      // Soft delete the resource assignment
      await connection.query(
        `
      UPDATE ProjectResources 
      SET IsActive = 0, UpdatedAt = NOW()
      WHERE ProjectId = ? AND UserId = ? AND IsActive = 1
    `,
        [projectId, userId]
      );

      // Update project's TotalResources count
      await connection.query(
        `
      UPDATE CompanyProjects 
      SET TotalResources = (
        SELECT COUNT(DISTINCT UserId) 
        FROM ProjectResources 
        WHERE ProjectId = ? AND IsActive = 1
      ),
      UpdatedAt = NOW()
      WHERE Id = ?
    `,
        [projectId, projectId]
      );

      // Log activity
      try {
        await connection.query(
          `
        INSERT INTO ProjectActivityLog (
          ProjectId,
          UserId,
          ActivityType,
          Description,
          OldValue,
          CreatedAt
        ) VALUES (?, ?, 'RESOURCE_REMOVED', ?, ?, NOW())
      `,
          [
            projectId,
            removedBy,
            `${resource.ResourceName} was removed from the project`,
            JSON.stringify({ userId, role: resource.Role }),
          ]
        );
      } catch (activityError) {
        console.warn("Failed to log activity:", activityError.message);
      }

      await connection.commit();

      return {
        success: true,
        message: `${resource.ResourceName} removed successfully`,
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in removeResourceFromProject:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  // Create new project
  async createProject(projectData, createdBy) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      console.log("Creating project:", projectData);

      const {
        projectName,
        projectCode,
        description,
        clientName,
        projectType = "CLIENT",
        status = "PLANNING",
        startDate,
        endDate,
        estimatedEndDate,
        technologies = [],
        projectStack,
        domain,
        managerId,
        priority = "MEDIUM",
        projectLocation,
        documentationUrl,
        repositoryUrl,
        estimatedBudget,
        currency = "USD",
      } = projectData;

      // Validate required fields
      if (!projectName || !projectCode || !startDate || !managerId) {
        throw new Error(
          "Missing required fields: projectName, projectCode, startDate, and managerId are required"
        );
      }

      // Check if project code already exists
      const [existingProjects] = await connection.query(
        "SELECT Id FROM CompanyProjects WHERE ProjectCode = ? AND IsActive = 1",
        [projectCode]
      );

      if (existingProjects.length > 0) {
        throw new Error(`Project with code "${projectCode}" already exists`);
      }

      // Verify manager exists
      const [managers] = await connection.query(
        `SELECT Id FROM Users WHERE Id = ? AND Role IN ('MANAGER', 'ADMIN') AND IsActive = 1`,
        [managerId]
      );

      if (managers.length === 0) {
        throw new Error("Invalid manager ID or user is not a manager");
      }

      // Insert project
      const [result] = await connection.query(
        `
      INSERT INTO CompanyProjects (
        ProjectName,
        ProjectCode,
        Description,
        ClientName,
        ProjectType,
        Status,
        StartDate,
        EndDate,
        EstimatedEndDate,
        Technologies,
        ProjectStack,
        Domain,
        ManagerId,
        Priority,
        ProjectLocation,
        DocumentationUrl,
        RepositoryUrl,
        EstimatedBudget,
        Currency,
        CreatedBy,
        CreatedAt,
        UpdatedAt,
        IsActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
    `,
        [
          projectName,
          projectCode,
          description || null,
          clientName || null,
          projectType,
          status,
          startDate,
          endDate || null,
          estimatedEndDate || null,
          JSON.stringify(technologies),
          projectStack || null,
          domain || null,
          managerId,
          priority,
          projectLocation || null,
          documentationUrl || null,
          repositoryUrl || null,
          estimatedBudget || null,
          currency,
          createdBy,
        ]
      );

      const projectId = result.insertId;

      // Log activity - FIX: Use ProjectActivityLog instead of ProjectActivities
      try {
        await connection.query(
          `
        INSERT INTO ProjectActivityLog (
          ProjectId,
          UserId,
          ActivityType,
          Description,
          CreatedAt
        ) VALUES (?, ?, 'CREATED', ?, NOW())
      `,
          [
            projectId,
            createdBy,
            `Project "${projectName}" (${projectCode}) was created`,
          ]
        );
      } catch (activityError) {
        // Continue if activity logging fails
        console.warn("Failed to log activity:", activityError.message);
      }

      await connection.commit();

      console.log("Project created successfully with ID:", projectId);

      return {
        id: projectId,
        projectCode,
        projectName,
        success: true,
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in createProject:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  // Get project activity log
  async getProjectActivity(projectId, limit = 50) {
    try {
      const [activities] = await pool.query(
        `
      SELECT 
        pal.*,
        CONCAT(u.FirstName, ' ', u.LastName) as UserName,
        u.Email as UserEmail,
        u.Role as UserRole
      FROM ProjectActivityLog pal
      INNER JOIN Users u ON pal.UserId = u.Id
      WHERE pal.ProjectId = ?
      ORDER BY pal.CreatedAt DESC
      LIMIT ?
    `,
        [projectId, limit]
      );

      return activities;
    } catch (error) {
      console.error("Error in getProjectActivity:", error);
      throw error;
    }
  }
  async logActivity(
    projectId,
    userId,
    activityType,
    description,
    oldValue = null,
    newValue = null
  ) {
    try {
      await pool.query(
        `
      INSERT INTO ProjectActivityLog (
        ProjectId,
        UserId,
        ActivityType,
        Description,
        OldValue,
        NewValue,
        CreatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,
        [projectId, userId, activityType, description, oldValue, newValue]
      );
    } catch (error) {
      console.error("Failed to log activity:", error.message);
      // Don't throw - activity logging is not critical
    }
  }
async updateProject(projectId, projectData, updatedBy) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      "SELECT * FROM CompanyProjects WHERE Id = ? AND IsActive = 1",
      [projectId]
    );

    if (existingRows.length === 0) {
      throw new Error("Project not found or inactive");
    }

    const existing = existingRows[0];

    const {
      ProjectName,
      ProjectCode,
      Description,
      ClientName,
      ProjectType,
      Status,
      StartDate,
      EndDate,
      EstimatedEndDate,
      Technologies,
      ProjectStack,
      Domain,
      ManagerId,
      Priority,
      ProjectLocation,
      DocumentationUrl,
      RepositoryUrl,
      EstimatedBudget,
      Currency,
    } = projectData;

    // 3. Handle Technologies - MUST be JSON string for MySQL
    let technologiesJson = existing.Technologies; // default to existing
    if (typeof Technologies !== "undefined" && Technologies !== null) {
      if (Array.isArray(Technologies)) {
        // Frontend sends array → stringify it
        technologiesJson = JSON.stringify(Technologies);
      } else if (typeof Technologies === "string") {
        // Already a string, could be JSON or comma-separated
        technologiesJson = Technologies;
      }
    }

    // 4. Build parameterized UPDATE query
    const updateFields = [];
    const params = [];

    // Helper to add field only if value is provided (not undefined)
    const addField = (column, value) => {
      if (typeof value !== "undefined") {
        updateFields.push(`${column} = ?`);
        params.push(value === null ? null : value);
      }
    };

    // Add all fields that can be updated
    addField("ProjectName", ProjectName);
    addField("ProjectCode", ProjectCode);
    addField("Description", Description);
    addField("ClientName", ClientName);
    addField("ProjectType", ProjectType);
    addField("Status", Status);
    addField("StartDate", StartDate);
    addField("EndDate", EndDate);
    addField("EstimatedEndDate", EstimatedEndDate);
    
    // ✅ Use the stringified version, not the raw Technologies
    if (typeof Technologies !== "undefined") {
      addField("Technologies", technologiesJson);
    }
    
    addField("ProjectStack", ProjectStack);
    addField("Domain", Domain);
    addField("ManagerId", ManagerId);
    addField("Priority", Priority);
    addField("ProjectLocation", ProjectLocation);
    addField("DocumentationUrl", DocumentationUrl);
    addField("RepositoryUrl", RepositoryUrl);
    addField("EstimatedBudget", EstimatedBudget);
    addField("Currency", Currency);

    // Always update timestamp
    updateFields.push("UpdatedAt = NOW()");

    // Nothing to update?
    if (updateFields.length === 1) {
      throw new Error("No fields to update");
    }

    const sql = `
      UPDATE CompanyProjects
      SET ${updateFields.join(", ")}
      WHERE Id = ?
        AND IsActive = 1
    `;
    params.push(projectId);

    await connection.query(sql, params);

    // 5. Log activity in ProjectActivityLog
    try {
      await connection.query(
        `
        INSERT INTO ProjectActivityLog (
          ProjectId,
          UserId,
          ActivityType,
          Description,
          OldValue,
          NewValue,
          CreatedAt
        ) VALUES (?, ?, 'UPDATED', ?, ?, ?, NOW())
      `,
        [
          projectId,
          updatedBy || null,
          `Project "${ProjectName || existing.ProjectName}" was updated`,
          JSON.stringify(existing),
          JSON.stringify(projectData),
        ]
      );
    } catch (activityError) {
      console.warn("Failed to log project update activity:", activityError.message);
    }

    await connection.commit();

    console.log("✅ Project updated successfully:", projectId);

    return {
      success: true,
      message: "Project updated successfully",
      projectId,
    };
  } catch (error) {
    await connection.rollback();
    console.error("Error in updateProject:", error);
    throw error;
  } finally {
    connection.release();
  }
}
}

module.exports = new ProjectService();
