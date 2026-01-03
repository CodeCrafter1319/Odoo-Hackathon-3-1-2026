const { pool } = require("../config/database");
class ProjectResource {
  static async getProjectResources(projectId) {
    const query = `
     SELECT 
        pr.*,
        u.Id AS UserId,
        CONCAT(u.FirstName, ' ', u.LastName) AS ResourceName,
        u.Email AS ResourceEmail,
        u.Role AS ResourceRole,
        up.Phone AS ResourcePhone,
        CONCAT(assignedBy.FirstName, ' ', assignedBy.LastName) AS AssignedByName
      FROM ProjectResources pr
      INNER JOIN Users u ON pr.UserId = u.Id
      LEFT JOIN UserProfile up ON u.Id = up.UserId
      LEFT JOIN Users assignedBy ON pr.AssignedBy = assignedBy.Id
      WHERE pr.ProjectId = ? AND pr.IsActive = TRUE
      ORDER BY pr.AssignedDate DESC
    `;
    const [rows] = await pool.execute(query, [projectId]);
    return rows;
  }
  static async isResourceAssigned(projectId, userId) {
    const query = `
    SELECT Id FROM ProjectResources 
      WHERE ProjectId = ? AND UserId = ? AND IsActive = TRUE
    `;
    const [rows] = await pool.execute(query, [projectId, userId]);
    return rows.length > 0;
  }
  static async assignResource(projectId, userId, assignmentData, assignedBy) {
    const query = `
     INSERT INTO ProjectResources (
        ProjectId, UserId, Role, AllocationPercentage,
        AssignedDate, StartDate, EndDate, AssignedBy, Notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      projectId,
      userId,
      assignmentData.role || null,
      assignmentData.allocationPercentage || 100.0,
      assignmentData.assignedDate || new Date(),
      assignmentData.startDate || null,
      assignmentData.endDate || null,
      assignedBy,
      assignmentData.notes || null,
    ]);
    await this.updateProjectResourceCount(projectId);
    return result.insertId;
  }
  static async removeResource(projectId, userId) {
    const query = `
     UPDATE ProjectResources 
      SET IsActive = FALSE 
      WHERE ProjectId = ? AND UserId = ?
    `;
    const [result] = await pool.execute(query, [projectId, userId]);
    await this.updateProjectResourceCount(projectId);
    return result.affectedRows > 0;
  }
  static async updateResourceAssignment(projectId, userId, updateData) {
    const fields = [];
    const values = [];

    if (updateData.role !== undefined) {
      fields.push("Role = ?");
      values.push(updateData.role);
    }
    if (updateData.allocationPercentage !== undefined) {
      fields.push("AllocationPercentage = ?");
      values.push(updateData.allocationPercentage);
    }
    if (updateData.startDate !== undefined) {
      fields.push("StartDate = ?");
      values.push(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      fields.push("EndDate = ?");
      values.push(updateData.endDate);
    }
    if (updateData.notes !== undefined) {
      fields.push("Notes = ?");
      values.push(updateData.notes);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(projectId, userId);
    const query = `
      UPDATE ProjectResources 
      SET ${fields.join(", ")} 
      WHERE ProjectId = ? AND UserId = ? AND IsActive = TRUE
    `;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }

  // Update project's total resources count
  static async updateProjectResourceCount(projectId) {
    const query = `
      UPDATE CompanyProjects 
      SET TotalResources = (
        SELECT COUNT(*) FROM ProjectResources 
        WHERE ProjectId = ? AND IsActive = TRUE
      )
      WHERE Id = ?
    `;

    await pool.execute(query, [projectId, projectId]);
  }

  // Get resource's current projects
  static async getResourceProjects(userId) {
    const query = `
      SELECT 
        cp.Id,
        cp.ProjectName,
        cp.ProjectCode,
        cp.Status,
        pr.Role,
        pr.AllocationPercentage,
        pr.AssignedDate
      FROM ProjectResources pr
      INNER JOIN CompanyProjects cp ON pr.ProjectId = cp.Id
      WHERE pr.UserId = ? AND pr.IsActive = TRUE AND cp.IsActive = TRUE
      ORDER BY pr.AssignedDate DESC
    `;

    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }

  // Get available resources (not assigned to specific project)
  static async getAvailableResources(projectId) {
    const query = `
      SELECT 
        u.Id,
        CONCAT(u.FirstName, ' ', u.LastName) AS Name,
        u.Email,
        u.Role,
        up.Phone,
        (SELECT COUNT(*) FROM ProjectResources pr 
         WHERE pr.UserId = u.Id AND pr.IsActive = TRUE) AS CurrentProjectsCount
      FROM Users u
      LEFT JOIN UserProfile up ON u.Id = up.UserId
      WHERE u.Role IN ('RESOURCE', 'MANAGER')
        AND u.IsActive = TRUE
        AND u.Id NOT IN (
          SELECT UserId FROM ProjectResources 
          WHERE ProjectId = ? AND IsActive = TRUE
        )
      ORDER BY u.FirstName, u.LastName
    `;

    const [rows] = await pool.execute(query, [projectId]);
    return rows;
  }
}
module.exports = ProjectResource;
