const { ca } = require("date-fns/locale");
const { pool } = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  // Admin creates Resource/Company user (email + name + role + verification token)
  static async createMinimal(userData) {
    try {
      const {
        firstName,
        lastName,
        email,
        role,
        createdBy,
        verificationToken,
        tokenExpiry,
      } = userData;

      console.log("Creating minimal user with data:", {
        firstName,
        lastName,
        email,
        role,
        createdBy,
        verificationToken: verificationToken ? "PROVIDED" : "MISSING",
        tokenExpiry: tokenExpiry ? tokenExpiry.toISOString() : "MISSING",
      });

      const [result] = await pool.execute(
        `
      INSERT INTO Users (
        FirstName, LastName, Email, Role, CreatedBy,
        EmailVerificationToken, EmailVerificationExpiry,
        IsEmailVerified, IsActive, CreatedAt, UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, TRUE, NOW(), NOW())
    `,
        [
          firstName,
          lastName,
          email,
          role,
          createdBy,
          verificationToken,
          tokenExpiry,
        ]
      );

      const userId = result.insertId;
      console.log("User created with ID:", userId);
      console.log("Verification token stored:", verificationToken);
      console.log("Token expiry stored:", tokenExpiry);

      return userId;
    } catch (error) {
      console.error("User.createMinimal error:", error);
      throw error;
    }
  }

  static async setPassword(userId, password) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashPassword = await bcrypt.hash(password, salt);

      // Set password and mark user as verified
      await pool.execute(
        `
      UPDATE Users 
      SET Password = ?, Salt = ?, IsEmailVerified = TRUE, UpdatedAt = NOW() 
      WHERE Id = ?
    `,
        [hashPassword, salt, userId]
      );

      console.log("Password set and user verified for ID:", userId);
    } catch (error) {
      console.error("User.setPassword error:", error);
      throw error;
    }
  }
  static async verifyPassword(plainPassword, hashedPassword) {
    console.log("Verifying password...");
    console.log("Plain password:", plainPassword);
    console.log("Hashed password:", hashedPassword ? "EXISTS" : "NULL");

    if (!plainPassword || !hashedPassword) {
      console.log("Missing password data");
      return false;
    }
    try {
      const result = await bcrypt.compare(plainPassword, hashedPassword);
      console.log("Password verification result:", result);
      return result;
    } catch (error) {
      console.error("Password verification error:", error);
      return false;
    }
  }
  // static async updateLoginAttempts(userId, attemptCount) {
  //   try {
  //     await pool.execute(
  //       "UPDATE Users SET AccessFailedCount = ? WHERE Id = ?",
  //       [attemptCount, userId]
  //     );
  //   } catch (error) {
  //     console.error("Update login attempts error:", error);
  //     throw error;
  //   }
  // }

  // Static method to update last login
  // static async updateLastLogin(userId) {
  //   try {
  //     await pool.execute("UPDATE Users SET LastLoginAt = NOW() WHERE Id = ?", [
  //       userId,
  //     ]);
  //   } catch (error) {
  //     console.error("Update last login error:", error);
  //     throw error;
  //   }
  // }
  static async findById(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM Users WHERE Id = ? AND IsActive = TRUE",
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Find by ID error:", error);
      throw error;
    }
  }
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      `
      SELECT * FROM Users WHERE Email = ? AND IsActive = TRUE
    `,
      [email]
    );
    return rows[0] || null;
  }

  static async findByVerificationToken(token) {
    try {
      console.log("User.findByVerificationToken called with:", token);
      const [rows] = await pool.execute(
        `SELECT Id, Email, FirstName, LastName, Role, IsEmailVerified, IsTokenUsed, IsActive, EmailVerificationToken, EmailVerificationExpiry, CreatedAt
       FROM Users
       WHERE EmailVerificationToken = ? AND IsActive = TRUE AND IsTokenUsed = FALSE`,
        [token]
      );
      console.log("Database query result:", rows);
      console.log("Found user count:", rows.length);
      return rows[0] || null;
    } catch (error) {
      console.error("User.findByVerificationToken error:", error);
      throw error;
    }
  }

  static async findUserByUsedToken(token) {
    try {
      const [rows] = await pool.execute(
        `SELECT Id, Email, FirstName, LastName, Role, IsEmailVerified, IsTokenUsed
       FROM Users
       WHERE EmailVerificationToken = ? AND IsTokenUsed = TRUE`,
        [token]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("User.findUserByUsedToken error:", error);
      throw error;
    }
  }

  static async setPassword(userId, password) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Set password and mark user as verified
      await pool.execute(
        `
      UPDATE Users
      SET Password = ?, Salt = ?, IsEmailVerified = TRUE, UpdatedAt = NOW()
      WHERE Id = ?
    `,
        [hashedPassword, salt, userId]
      );

      console.log("Password set and user verified for ID:", userId);
    } catch (error) {
      console.error("User.setPassword error:", error);
      throw error;
    }
  }

  static async markTokenAsUsed(userId) {
    try {
      console.log("Marking token as used for user ID:", userId);
      await pool.execute(
        `
      UPDATE Users
      SET
        IsTokenUsed = TRUE,
        UpdatedAt = NOW()
      WHERE Id = ?
    `,
        [userId]
      );

      console.log("Token marked as used for user ID:", userId);
    } catch (error) {
      console.error("User.markTokenAsUsed error:", error);
      throw error;
    }
  }
  static async markUserAsVerified(userId) {
    try {
      console.log("Marking user as verified for user ID:", userId);
      await pool.execute(
        `
      UPDATE Users
      SET
        IsEmailVerified = TRUE,
        UpdatedAt = NOW()
      WHERE Id = ?
    `,
        [userId]
      );

      console.log("User marked as verified for user ID:", userId);
    } catch (error) {
      console.error("User.markUserAsVerified error:", error);
      throw error;
    }
  }
  static async updatePersonalDetails(userId, profileData) {
    try {
      // Safely extract data and convert undefined to null
      const safeData = {
        phone: profileData.phone || null,
        dateOfBirth: profileData.dateOfBirth || null, // Convert empty string to null
        gender: profileData.gender || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        country: profileData.country || null,
        zipCode: profileData.zipCode || null,
        linkedInProfile: profileData.linkedInProfile || null,
        gitHubProfile: profileData.gitHubProfile || null,
        portfolioWebsite: profileData.portfolioWebsite || null,
      };

      // Log the data being inserted for debugging
      console.log("Inserting personal details:", { userId, ...safeData });

      await pool.execute(
        `
      INSERT INTO UserProfile (
        UserId, Phone, DateOfBirth, Gender, Address, City, State, Country,
        ZipCode, LinkedInProfile, GitHubProfile, PortfolioWebsite
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        Phone = VALUES(Phone),
        DateOfBirth = VALUES(DateOfBirth),
        Gender = VALUES(Gender),
        Address = VALUES(Address),
        City = VALUES(City),
        State = VALUES(State),
        Country = VALUES(Country),
        ZipCode = VALUES(ZipCode),
        LinkedInProfile = VALUES(LinkedInProfile),
        GitHubProfile = VALUES(GitHubProfile),
        PortfolioWebsite = VALUES(PortfolioWebsite)
    `,
        [
          userId,
          safeData.phone,
          safeData.dateOfBirth,
          safeData.gender,
          safeData.address,
          safeData.city,
          safeData.state,
          safeData.country,
          safeData.zipCode,
          safeData.linkedInProfile,
          safeData.gitHubProfile,
          safeData.portfolioWebsite,
        ]
      );
    } catch (error) {
      console.error("Update personal details error:", error);
      throw error;
    }
  }

  static async addEducation(userId, eduData) {
    try {
      const {
        degree,
        fieldOfStudy,
        institution,
        startDate,
        endDate,
        grade,
        description,
      } = eduData;

      // Handle date fields properly
      const safeData = {
        userId,
        degree: degree || null,
        fieldOfStudy: fieldOfStudy || null,
        institution: institution || null,
        startDate: startDate || null, // Convert empty string to null
        endDate: endDate || null, // Convert empty string to null
        grade: grade || null,
        description: description || null,
      };

      console.log("Inserting education data:", safeData);

      await pool.execute(
        `
      INSERT INTO EducationInfo (
        UserId, Degree, FieldOfStudy, Institution, StartDate, EndDate, Grade, Description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        Degree = VALUES(Degree),
        FieldOfStudy = VALUES(FieldOfStudy),
        Institution = VALUES(Institution),
        StartDate = VALUES(StartDate),
        EndDate = VALUES(EndDate),
        Grade = VALUES(Grade),
        Description = VALUES(Description)
    `,
        [
          safeData.userId,
          safeData.degree,
          safeData.fieldOfStudy,
          safeData.institution,
          safeData.startDate,
          safeData.endDate,
          safeData.grade,
          safeData.description,
        ]
      );
    } catch (error) {
      console.error("Add education error:", error);
      throw error;
    }
  }

  static async addEmployment(userId, empData) {
    try {
      const {
        jobTitle,
        companyName,
        location,
        startDate,
        endDate,
        description,
        skills,
        isCurrentJob,
      } = empData;

      // Ensure all undefined values are converted to null for MySQL
      const safeData = {
        userId,
        jobTitle: jobTitle || null,
        companyName: companyName || null,
        location: location || null,
        startDate: startDate || null,
        endDate: endDate || null, // This is the key fix
        description: description || null,
        skills: Array.isArray(skills) ? JSON.stringify(skills) : null,
        isCurrentJob: isCurrentJob || false,
      };

      console.log("Inserting employment data:", safeData); // Debug log

      await pool.execute(
        `
      INSERT INTO EmploymentInfo (
        UserId, JobTitle, CompanyName, Location, StartDate, EndDate, 
        Description, Skills, IsCurrentJob
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        JobTitle = VALUES(JobTitle),
        CompanyName = VALUES(CompanyName),
        Location = VALUES(Location),
        StartDate = VALUES(StartDate),
        EndDate = VALUES(EndDate),
        Description = VALUES(Description),
        Skills = VALUES(Skills),
        IsCurrentJob = VALUES(IsCurrentJob)
    `,
        [
          safeData.userId,
          safeData.jobTitle,
          safeData.companyName,
          safeData.location,
          safeData.startDate,
          safeData.endDate,
          safeData.description,
          safeData.skills,
          safeData.isCurrentJob,
        ]
      );

      console.log("Employment data inserted successfully for user:", userId);
    } catch (error) {
      console.error("Add employment error:", error);
      throw error;
    }
  }

  static async getUserProfile(userId) {
    try {
      const [rows] = await pool.execute(
        `
      SELECT
        u.Id,
        u.Email,
        u.FirstName,
        u.LastName,
        u.Role,
        u.IsEmailVerified,
        u.IsActive,
        up.Phone,
        up.DateOfBirth,
        up.Gender,
        up.Address,
        up.City,
        up.State,
        up.Country,
        up.ZipCode,
        up.LinkedInProfile,
        up.GitHubProfile,
        up.PortfolioWebsite
      FROM Users u
      LEFT JOIN UserProfile up ON u.Id = up.UserId
      WHERE u.Id = ? AND u.IsActive = TRUE
    `,
        [userId]
      );

      return rows[0] || null;
    } catch (error) {
      console.error("Get user profile error:", error);
      throw error;
    }
  }
  static async hasPersonalDetails(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT COUNT(*) as count FROM UserProfile WHERE UserId = ?",
        [userId]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error("Has personal details error:", error);
      return false;
    }
  }

  // Check if user has education info
  static async hasEducation(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT COUNT(*) as count FROM EducationInfo WHERE UserId = ?",
        [userId]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error("Has education error:", error);
      return false;
    }
  }

  // Check if user has employment info
  static async hasEmployment(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT COUNT(*) as count FROM EmploymentInfo WHERE UserId = ?",
        [userId]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error("Has employment error:", error);
      return false;
    }
  }

  // Update verification token
  static async updateVerificationToken(userId, token, expiry) {
    try {
      await pool.execute(
        "UPDATE Users SET EmailVerificationToken = ?, EmailVerificationExpiry = ? WHERE Id = ?",
        [token, expiry, userId]
      );
    } catch (error) {
      console.error("Update verification token error:", error);
      throw error;
    }
  }
  static async getAllUsers() {
    try {
      const [rows] = await pool.execute(`
      SELECT 
        Id, Email, FirstName, LastName, Role, 
        IsEmailVerified, IsActive, CreatedAt, UpdatedAt
      FROM Users 
      ORDER BY CreatedAt DESC
    `);
      return rows;
    } catch (error) {
      console.error("❌ User.getAllUsers database error:", error);
      throw error;
    }
  }
  static async saveEducations(userId, educationsArray) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const edu of educationsArray) {
        const safeData = {
          degree: edu.degree || null,
          fieldOfStudy: edu.fieldOfStudy || null,
          institution: edu.institution || null,
          startDate: edu.startDate || null,
          endDate: edu.endDate || null,
          grade: edu.grade || null,
          description: edu.description || null,
        };

        // Check if this education record already exists
        const [existing] = await connection.execute(
          `
        SELECT Id FROM EducationInfo 
        WHERE UserId = ? AND Degree = ? AND Institution = ? AND StartDate = ?
      `,
          [userId, safeData.degree, safeData.institution, safeData.startDate]
        );

        if (existing.length > 0) {
          // Update existing record
          await connection.execute(
            `
          UPDATE EducationInfo 
          SET FieldOfStudy = ?, EndDate = ?, Grade = ?, Description = ?
          WHERE Id = ?
        `,
            [
              safeData.fieldOfStudy,
              safeData.endDate,
              safeData.grade,
              safeData.description,
              existing[0].Id,
            ]
          );
        } else {
          // Insert new record
          await connection.execute(
            `
          INSERT INTO EducationInfo (
            UserId, Degree, FieldOfStudy, Institution, StartDate, EndDate, Grade, Description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
              userId,
              safeData.degree,
              safeData.fieldOfStudy,
              safeData.institution,
              safeData.startDate,
              safeData.endDate,
              safeData.grade,
              safeData.description,
            ]
          );
        }
      }

      await connection.commit();
      console.log(
        `Processed ${educationsArray.length} education records for user ${userId}`
      );
    } catch (error) {
      await connection.rollback();
      console.error("Save educations error:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async saveEmployments(userId, employmentsArray) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const emp of employmentsArray) {
        const safeData = {
          jobTitle: emp.jobTitle || null,
          companyName: emp.companyName || null,
          location: emp.location || null,
          startDate: emp.startDate || null,
          endDate: emp.endDate || null,
          description: emp.description || null,
          skills: Array.isArray(emp.skills) ? JSON.stringify(emp.skills) : null,
          isCurrentJob: emp.isCurrentJob || false,
        };

        // Check if this employment record already exists
        const [existing] = await connection.execute(
          `
        SELECT Id FROM EmploymentInfo 
        WHERE UserId = ? AND JobTitle = ? AND CompanyName = ? AND StartDate = ?
      `,
          [userId, safeData.jobTitle, safeData.companyName, safeData.startDate]
        );

        if (existing.length > 0) {
          // Update existing record
          await connection.execute(
            `
          UPDATE EmploymentInfo 
          SET Location = ?, EndDate = ?, Description = ?, Skills = ?, IsCurrentJob = ?
          WHERE Id = ?
        `,
            [
              safeData.location,
              safeData.endDate,
              safeData.description,
              safeData.skills,
              safeData.isCurrentJob,
              existing[0].Id,
            ]
          );
        } else {
          // Insert new record
          await connection.execute(
            `
          INSERT INTO EmploymentInfo (
            UserId, JobTitle, CompanyName, Location, StartDate, EndDate,
            Description, Skills, IsCurrentJob
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
              userId,
              safeData.jobTitle,
              safeData.companyName,
              safeData.location,
              safeData.startDate,
              safeData.endDate,
              safeData.description,
              safeData.skills,
              safeData.isCurrentJob,
            ]
          );
        }
      }

      await connection.commit();
      console.log(
        `Processed ${employmentsArray.length} employment records for user ${userId}`
      );
    } catch (error) {
      await connection.rollback();
      console.error("Save employments error:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  static async getAllEducations(userId) {
    try {
      const [rows] = await pool.execute(
        `
      SELECT * FROM EducationInfo 
      WHERE UserId = ? 
      ORDER BY StartDate DESC
    `,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error("Get all educations error:", error);
      throw error;
    }
  }

  // Get all employment records for a user
  static async getAllEmployments(userId) {
    try {
      const [rows] = await pool.execute(
        `
      SELECT * FROM EmploymentInfo 
      WHERE UserId = ? 
      ORDER BY StartDate DESC
    `,
        [userId]
      );

      // Parse skills JSON for each record
      return rows.map((emp) => ({
        ...emp,
        skills: emp.Skills ? JSON.parse(emp.Skills) : [],
      }));
    } catch (error) {
      console.error("Get all employments error:", error);
      throw error;
    }
  }
  static async deleteEducationById(educationId, userId) {
    try {
      const [result] = await pool.execute(
        `DELETE FROM EducationInfo WHERE Id = ? AND UserId = ?`,
        [educationId, userId]
      );
      console.log(
        `Deleted education record ID ${educationId} for user ID ${userId}`
      );
      return result;
    } catch (error) {
      console.error("Delete education error:", error);
      throw error;
    }
  }
  static async deleteEmploymentById(employmentId, userId) {
    try {
      const [result] = await pool.execute(
        `DELETE FROM EmploymentInfo WHERE Id = ? AND UserId = ?`,
        [employmentId, userId]
      );
      console.log(
        `Deleted employment record ID ${employmentId} for user ID ${userId}`
      );
      return result;
    } catch (error) {
      console.error("Delete employment error:", error);
      throw error;
    }
  }
  // ===== LANGUAGES METHODS =====
  static async saveLanguages(userId, languagesArray) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete existing languages for this user
      await connection.execute("DELETE FROM Languages WHERE UserId = ?", [
        userId,
      ]);

      // Insert new languages
      for (const lang of languagesArray) {
        const safeData = {
          name: lang.name || null,
          level: lang.level || "BASIC",
        };

        await connection.execute(
          `INSERT INTO Languages (UserId, Name, Level) VALUES (?, ?, ?)`,
          [userId, safeData.name, safeData.level]
        );
      }

      await connection.commit();
      console.log(
        `Saved ${languagesArray.length} languages for user ${userId}`
      );
    } catch (error) {
      await connection.rollback();
      console.error("Save languages error:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAllLanguages(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM Languages WHERE UserId = ? ORDER BY Id ASC",
        [userId]
      );
      return rows;
    } catch (error) {
      console.error("Get all languages error:", error);
      throw error;
    }
  }

  static async deleteLanguageById(languageId, userId) {
    try {
      const [result] = await pool.execute(
        "DELETE FROM Languages WHERE Id = ? AND UserId = ?",
        [languageId, userId]
      );
      return result;
    } catch (error) {
      console.error("Delete language error:", error);
      throw error;
    }
  }

  // ===== CERTIFICATIONS METHODS =====
  static async saveCertifications(userId, certifications) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete existing certifications
      await connection.execute("DELETE FROM Certifications WHERE UserId = ?", [
        userId,
      ]);

      // Insert new certifications
      if (certifications && certifications.length > 0) {
        const insertQuery = `INSERT INTO Certifications 
        (UserId, Title, IssuingOrganization, IssueDate, ExpiryDate, CredentialId, Link, Description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        for (const cert of certifications) {
          // Convert ISO date strings to MySQL DATE format (YYYY-MM-DD)
          const issueDate =
            cert.issueDate || cert.IssueDate
              ? new Date(cert.issueDate || cert.IssueDate)
                  .toISOString()
                  .split("T")[0]
              : null;

          const expiryDate =
            cert.expiryDate || cert.ExpiryDate
              ? new Date(cert.expiryDate || cert.ExpiryDate)
                  .toISOString()
                  .split("T")[0]
              : null;

          await connection.execute(insertQuery, [
            userId,
            cert.title || cert.Title || null,
            cert.issuingOrganization || cert.IssuingOrganization || null,
            issueDate,
            expiryDate,
            cert.credentialId || cert.CredentialId || null,
            cert.link || cert.Link || null,
            cert.description || cert.Description || null,
          ]);
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error saving certifications:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAllCertifications(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM Certifications WHERE UserId = ? ORDER BY IssueDate DESC",
        [userId]
      );
      return rows;
    } catch (error) {
      console.error("Get all certifications error:", error);
      throw error;
    }
  }

  static async deleteCertificationById(certificationId, userId) {
    try {
      const [result] = await pool.execute(
        "DELETE FROM Certifications WHERE Id = ? AND UserId = ?",
        [certificationId, userId]
      );
      return result;
    } catch (error) {
      console.error("Delete certification error:", error);
      throw error;
    }
  }

  // ===== PROJECTS METHODS =====
  static async saveProjects(userId, projects) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete existing projects
      await connection.execute("DELETE FROM Projects WHERE UserId = ?", [
        userId,
      ]);

      // Insert new projects
      if (projects && projects.length > 0) {
        const insertQuery = `INSERT INTO Projects 
        (UserId, Title, Description, Technologies, Link, StartDate, EndDate, IsOngoing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        for (const proj of projects) {
          // Convert ISO date strings to MySQL DATE format (YYYY-MM-DD)
          const startDate =
            proj.startDate || proj.StartDate
              ? new Date(proj.startDate || proj.StartDate)
                  .toISOString()
                  .split("T")[0]
              : null;

          const endDate =
            proj.endDate || proj.EndDate
              ? new Date(proj.endDate || proj.EndDate)
                  .toISOString()
                  .split("T")[0]
              : null;

          // Handle technologies array
          const technologies = Array.isArray(
            proj.technologies || proj.Technologies
          )
            ? JSON.stringify(proj.technologies || proj.Technologies)
            : proj.technologies || proj.Technologies || null;

          await connection.execute(insertQuery, [
            userId,
            proj.title || proj.Title || null,
            proj.description || proj.Description || null,
            technologies,
            proj.link || proj.Link || null,
            startDate,
            endDate,
            proj.isOngoing || proj.IsOngoing || false,
          ]);
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error saving projects:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get all project records for a user
  static async getAllProjects(userId) {
    try {
      // Check if StartDate column exists, fallback to CreatedAt or Id
      const [rows] = await pool.execute(
        `SELECT * FROM Projects 
       WHERE UserId = ? 
       ORDER BY COALESCE(StartDate, CreatedAt, Id) DESC`,
        [userId]
      );
      // Parse technologies JSON for each record
      return rows.map((proj) => ({
        ...proj,
        technologies: proj.Technologies ? JSON.parse(proj.Technologies) : [],
      }));
    } catch (error) {
      console.error("Get all projects error:", error);
      throw error;
    }
  }
  // Helper method to check if columns exist in Projects table
  static async checkProjectsTableStructure() {
    try {
      const [columns] = await pool.execute(`SHOW COLUMNS FROM Projects`);
      console.log(
        "Projects table structure:",
        columns.map((c) => c.Field)
      );
      return columns.map((c) => c.Field);
    } catch (error) {
      console.error("Failed to check Projects table structure:", error);
      return [];
    }
  }

  static async deleteProjectById(projectId, userId) {
    try {
      const [result] = await pool.execute(
        "DELETE FROM Projects WHERE Id = ? AND UserId = ?",
        [projectId, userId]
      );
      return result;
    } catch (error) {
      console.error("Delete project error:", error);
      throw error;
    }
  }
}
module.exports = User;
