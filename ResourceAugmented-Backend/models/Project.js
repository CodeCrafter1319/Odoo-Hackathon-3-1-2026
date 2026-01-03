const { pool } = require("../config/database");
class Project {
  static async getAllProjects() {
    const query = `
         SELECT 
        cp.*,
        CONCAT(m.FirstName, ' ', m.LastName) AS ManagerName,
        m.Email AS ManagerEmail,
        COUNT(DISTINCT pr.UserId) AS AssignedResourcesCount
      FROM CompanyProjects cp
      LEFT JOIN Users m ON cp.ManagerId = m.Id
      LEFT JOIN ProjectResources pr ON cp.Id = pr.ProjectId AND pr.IsActive = TRUE
      WHERE cp.IsActive = TRUE
      GROUP BY cp.Id
      ORDER BY cp.CreatedAt DESC
        `;
    const [rows] = await pool.execute(query);
    return rows.map(this.formatProject);
  }
  static async getProjectById(projectId) {
    const query = `
    SELECT 
        cp.*,
        CONCAT(m.FirstName, ' ', m.LastName) AS ManagerName,
        m.Email AS ManagerEmail,
        CONCAT(creator.FirstName, ' ', creator.LastName) AS CreatedByName
      FROM CompanyProjects cp
      LEFT JOIN Users m ON cp.ManagerId = m.Id
      LEFT JOIN Users creator ON cp.CreatedBy = creator.Id
      WHERE cp.Id = ? AND cp.IsActive = TRUE
    `;
    const [rows] = await pool.execute(query, [projectId]);
    if (rows.length === 0) {
      return null;
    }
    return this.formatProject(rows[0]);
  }
  static async getProjectsByUserId(userId) {
    const query = `
        SELECT 
    cp.*,
    CONCAT(m.FirstName, ' ', m.LastName) AS ManagerName,
    pr.Role AS MyRole,
    pr.AllocationPercentage,
    pr.AssignedDate,
    pr.StartDate AS MyStartDate,
    pr.EndDate AS MyEndDate
    FROM CompanyProjects cp
    LEFT JOIN Users m ON cp.ManagerId = m.Id
    LEFT JOIN ProjectResources pr ON cp.Id = pr.ProjectId
   AND pr.UserId = ?
   AND pr.IsActive = TRUE
WHERE cp.Id = ?
  AND cp.IsActive = TRUE;

    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows.map(this.formatProject);
  }
  static async getProjectsByManagerId(managerId) {
    const query = `
    SELECT 
        cp.*,
        COUNT(DISTINCT pr.UserId) AS AssignedResourcesCount
      FROM CompanyProjects cp
      LEFT JOIN ProjectResources pr ON cp.Id = pr.ProjectId AND pr.IsActive = TRUE
      WHERE cp.ManagerId = ? AND cp.IsActive = TRUE
      GROUP BY cp.Id
      ORDER BY cp.StartDate DESC
    `;
    const [rows] = await pool.execute(query, [managerId]);
    return rows.map(this.formatProject);
  }
  static async createProject(projectData) {
    const query = `
     INSERT INTO CompanyProjects (
        ProjectName, ProjectCode, Description, ClientName, ProjectType, Status,
        StartDate, EndDate, EstimatedEndDate, Technologies, ProjectStack, Domain,
        ManagerId, Priority, ProjectLocation, DocumentationUrl, RepositoryUrl,
        EstimatedBudget, Currency, CreatedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      projectData.ProjectName,
      projectData.ProjectCode,
      projectData.Description || null,
      projectData.ClientName || null,
      projectData.ProjectType || "Client",
      projectData.Status || "Planning",
      projectData.StartDate,
      projectData.EndDate || null,
      projectData.EstimatedEndDate || null,
      JSON.stringify(projectData.technologies || []),
      projectData.ProjectStack || null,
      projectData.Domain || null,
      projectData.ManagerId || null,
      projectData.Priority || "Medium",
      projectData.ProjectLocation || "Remote",
      projectData.DocumentationUrl || null,
      projectData.RepositoryUrl || null,
      projectData.EstimatedBudget || null,
      projectData.Currency || "USD",
      projectData.CreatedBy,
    ]);
    return result.insertId;
  }
  static async updateProject(projectId, projectData) {
    const fields = [];
    const values = [];

    const updateableFields = {
      ProjectName: "projectName",
      Description: "description",
      ClientName: "clientName",
      Status: "status",
      StartDate: "startDate",
      EndDate: "endDate",
      EstimatedEndDate: "estimatedEndDate",
      Technologies: "technologies",
      ProjectStack: "projectStack",
      Domain: "domain",
      ManagerId: "managerId",
      Priority: "priority",
      ProjectLocation: "projectLocation",
      DocumentationUrl: "documentationUrl",
      RepositoryUrl: "repositoryUrl",
      EstimatedBudget: "estimatedBudget",
    };
    Object.keys(updateableFields).forEach((dbField) => {
      const dataField = updateableFields[dbField];
      if (projectData[dataField] !== undefined) {
        fields.push(`${dbField}=?`);
        values.push(
          dbField === "Technologies"
            ? JSON.stringify(projectData[dataField])
            : projectData[dataField]
        );
      }
    });
    if (fields.length === 0) {
      throw new Error("No fields to update");
    }
    values.push(projectId);
    const query = `UPDATE CompanyProjects SET ${fields.join(
      ", "
    )} WHERE Id = ?`;
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }
  static async deleteProject(projectId) {
    const query = `
        UPDATE CompanyProjects SET IsActive = FALSE WHERE Id = ?
    `;
    const [result] = await pool.execute(query, [projectId]);
    return result.affectedRows > 0;
  }
  static formatProject(project) {
    if (project.Technologies) {
      try {
        project.Technologies = JSON.parse(project.Technologies);
      } catch (e) {
        project.Technologies = [];
      }
    }
    return project;
  }
}

module.exports = Project;
