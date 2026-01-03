const AuthService = require("../services/authService");
const User = require("../models/User");
const { pool } = require("../config/database");
const fs = require("fs");
// const { ca } = require("date-fns/locale");
// const PDFDocument = require("pdfkit");
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
require("dotenv").config();
class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log("AuthController login attempt for:", email);

      // Use AuthService for login logic
      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      console.error("AuthController login error:", error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async register(req, res) {
    try {
      res.status(403).json({
        success: false,
        message:
          "Direct User registration is not allowed. Users must be created by administrators",
      });
    } catch (error) {
      console.error("Registration error details:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }
  static async createUserByAdmin(req, res) {
    try {
      const { firstName, lastName, email, role, managerId } = req.body; // Include managerId
      const adminUserId = req.user.Id;

      if (!firstName || !lastName || !email || !role) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      const validRoles = ["COMPANY", "RESOURCE", "MANAGER"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user role",
        });
      }

      console.log(
        `Admin ${adminUserId} creating user:`,
        firstName,
        lastName,
        email,
        role,
        managerId
      );

      const result = await AuthService.createUserByAdmin(
        {
          firstName,
          lastName,
          email,
          role,
          managerId, // Pass managerId to the service
        },
        adminUserId
      );

      res.json({
        success: true,
        message: "User created successfully. Verification email sent.",
        data: result,
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "User creation failed",
      });
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Verification token is required",
        });
      }

      console.log("AuthController verifyEmail token:", token);

      const result = await AuthService.verifyEmail(token);
      res.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Email verification failed",
      });
    }
  }

  static async setPassword(req, res) {
    try {
      const { userId, password } = req.body;

      if (!userId || !password) {
        return res.status(400).json({
          success: false,
          message: "User ID and password are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      console.log("AuthController setPassword for user:", userId);
      const result = await AuthService.setPassword(userId, password);

      res.json({
        success: true,
        message:
          "Password set successfully. Your account is now verified and you can login.",
        data: {
          nextStep: "login",
          accountVerified: true,
        },
      });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Set password failed",
      });
    }
  }
  static async updatePersonalDetails(req, res) {
    try {
      const userId = req.user.Id; // Use req.user.Id, not req.user.id
      const profileData = req.body;

      console.log("AuthController updatePersonalDetails for user:", userId);
      const result = await AuthService.updatePersonalDetails(
        userId,
        profileData
      );
      res.json({
        success: true,
        message: "Personal details updated successfully",
        data: {
          nextStep: result.nextStep || "education",
        },
      });
    } catch (error) {
      console.error("Update personal details error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Update personal details failed",
      });
    }
  }
  static async addEducation(req, res) {
    try {
      const userId = req.user.Id;
      const educationData = req.body;

      // Validate required fields
      if (
        !educationData.degree ||
        !educationData.fieldOfStudy ||
        !educationData.institution
      ) {
        return res.status(400).json({
          success: false,
          message: "Degree, field of study, and institution are required",
        });
      }

      console.log("Adding education for user:", userId);

      const result = await AuthService.addEducation(userId, educationData);

      res.json({
        success: true,
        message: result.message,
        data: {
          nextStep: result.nextStep || "employment",
        },
      });
    } catch (error) {
      console.error("AuthController addEducation error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async addEmployment(req, res) {
    try {
      const userId = req.user.Id;
      const employmentData = req.body;

      // Validate required fields
      if (!employmentData.jobTitle || !employmentData.companyName) {
        return res.status(400).json({
          success: false,
          message: "Job title and company name are required",
        });
      }

      console.log("Adding employment for user:", userId);

      const result = await AuthService.addEmployment(userId, employmentData);

      res.json({
        success: true,
        message: result.message,
        data: {
          profileComplete: result.profileComplete || false,
        },
      });
    } catch (error) {
      console.error("AuthController addEmployment error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async getProfileStatus(req, res) {
    try {
      const userId = req.user.Id;

      const result = await AuthService.getProfileStatus(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("AuthController getProfileStatus error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      console.log("Resending verification email to:", email);

      const result = await AuthService.resendVerificationEmail(email);

      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("AuthController resendVerificationEmail error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async getAllUsers(req, res) {
    try {
      const result = await AuthService.getAllUsers();

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("❌ AuthController getAllUsers error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get users",
      });
    }
  }
  static async getAvailableManagers(req, res) {
    try {
      const [rows] = await pool.execute(`
      SELECT Id, FirstName, LastName, Email, Role
      FROM Users 
      WHERE Role IN ('MANAGER', 'ADMIN') 
        AND IsActive = TRUE
      ORDER BY Role DESC, FirstName, LastName
    `);

      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error("Get managers error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get managers",
      });
    }
  }
  static async getProfile(req, res) {
    try {
      const userId = req.user.Id;

      // For new database structure, get user profile differently
      const user = (await User.findById)
        ? await User.findById(userId)
        : req.user;

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          id: user.Id,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          role: user.Role,
          roleName: user.Role, // Simplified for new structure
          isEmailVerified: user.IsEmailVerified,
          isActive: user.IsActive,
          company: null, // Will be implemented when company relationship is added
          profile: {},
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user profile",
      });
    }
  }
  static async saveProfileComplete(req, res) {
    try {
      const userId = req.user.Id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const payload = req.body || {};

      // Only UserProfile fields
      const profileFields = {
        Phone: payload.phone ?? null,
        DateOfBirth: payload.dateOfBirth ?? null,
        Gender: payload.gender ?? null,
        Address: payload.address ?? null,
        City: payload.city ?? null,
        State: payload.state ?? null,
        Country: payload.country ?? null,
        ZipCode: payload.zipCode ?? null,
        LinkedInProfile: payload.linkedInProfile ?? null,
        GitHubProfile: payload.gitHubProfile ?? null,
        PortfolioWebsite: payload.portfolioWebsite ?? null,
      };

      // Check if profile exists
      const [existing] = await pool.execute(
        "SELECT Id FROM UserProfile WHERE UserId = ?",
        [userId]
      );

      if (existing.length > 0) {
        // UPDATE
        const updates = [];
        const values = [];
        for (const key in profileFields) {
          updates.push(`${key} = ?`);
          values.push(profileFields[key]);
        }
        values.push(userId);

        await pool.execute(
          `UPDATE UserProfile SET ${updates.join(", ")} WHERE UserId = ?`,
          values
        );
      } else {
        // INSERT
        await pool.execute(
          `INSERT INTO UserProfile 
         (UserId, Phone, DateOfBirth, Gender, Address, City, State, Country, ZipCode, LinkedInProfile, GitHubProfile, PortfolioWebsite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            profileFields.Phone,
            profileFields.DateOfBirth,
            profileFields.Gender,
            profileFields.Address,
            profileFields.City,
            profileFields.State,
            profileFields.Country,
            profileFields.ZipCode,
            profileFields.LinkedInProfile,
            profileFields.GitHubProfile,
            profileFields.PortfolioWebsite,
          ]
        );
      }

      // Return merged profile
      const [rows] = await pool.execute(
        `SELECT u.Id, u.Email, u.FirstName, u.LastName,
              up.Phone, up.DateOfBirth, up.Gender, up.Address, up.City,
              up.State, up.Country, up.ZipCode, up.LinkedInProfile,
              up.GitHubProfile, up.PortfolioWebsite
       FROM Users u
       LEFT JOIN UserProfile up ON u.Id = up.UserId
       WHERE u.Id = ?`,
        [userId]
      );

      return res.json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      console.error("saveProfileComplete error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async activateUser(req, res) {
    try {
      const { userId } = req.params;

      // This would be implemented in User model
      (await User.activateUser) && (await User.activateUser(userId));

      res.json({
        success: true,
        message: "User activated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to activate user",
      });
    }
  }

  static async logout(req, res) {
    res.json({
      success: true,
      message: "Logout successful",
    });
  }

  static async testDB(req, res) {
    try {
      const [rows] = await pool.execute("SELECT COUNT(*) as count FROM Users");

      res.json({
        success: true,
        message: "Database connected",
        usersCount: rows[0].count,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Database connection failed",
        error: error.message,
      });
    }
  }
  static async checkVerificationToken(req, res) {
    try {
      const { token } = req.params;

      const user = await User.findByVerificationToken(token);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification token",
        });
      }

      // Check token expiry
      if (new Date() > new Date(user.EmailVerificationExpiry)) {
        return res.status(400).json({
          success: false,
          message: "Verification token has expired",
        });
      }

      res.json({
        success: true,
        data: {
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          role: user.Role,
          tokenValid: true,
        },
      });
    } catch (error) {
      console.error("AuthController checkVerificationToken error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async getPersonalDetails(req, res) {
    try {
      const userId = req.user.Id;
      const userProfile = await User.getUserProfile(userId);

      if (!userProfile) {
        return res.json({
          success: false,
          message: "Personal details not found",
          data: null,
        });
      }

      // Format the response with proper date formatting
      const personalDetails = {
        phone: userProfile.Phone,
        dateOfBirth: userProfile.DateOfBirth
          ? userProfile.DateOfBirth.toISOString().split("T")[0]
          : "", // Convert to YYYY-MM-DD or empty string
        gender: userProfile.Gender,
        address: userProfile.Address,
        city: userProfile.City,
        state: userProfile.State,
        country: userProfile.Country,
        zipCode: userProfile.ZipCode,
        linkedInProfile: userProfile.LinkedInProfile,
        gitHubProfile: userProfile.GitHubProfile,
        portfolioWebsite: userProfile.PortfolioWebsite,
      };

      res.json({
        success: true,
        data: personalDetails,
      });
    } catch (error) {
      console.error("Get personal details error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  static async getEducationDetails(req, res) {
    try {
      const userId = req.user.Id;
      const educationData = await AuthService.getEducationDetails(userId);

      if (educationData) {
        res.json({
          success: true,
          data: {
            degree: educationData.Degree,
            fieldOfStudy: educationData.FieldOfStudy,
            institution: educationData.Institution,
            startDate: educationData.StartDate
              ? educationData.StartDate.toISOString().split("T")[0]
              : "", // Format to YYYY-MM-DD or empty string
            endDate: educationData.EndDate
              ? educationData.EndDate.toISOString().split("T")[0]
              : "", // Format to YYYY-MM-DD or empty string
            grade: educationData.Grade,
            description: educationData.Description,
          },
        });
      } else {
        res.json({
          success: false,
          message: "No education details found",
          data: null,
        });
      }
    } catch (error) {
      console.error("Get education details error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  static async getEmploymentDetails(req, res) {
    try {
      const userId = req.user.Id;
      const employmentData = await AuthService.getEmploymentDetails(userId);

      if (employmentData) {
        res.json({
          success: true,
          data: {
            jobTitle: employmentData.JobTitle,
            companyName: employmentData.CompanyName,
            location: employmentData.Location,
            startDate: employmentData.StartDate,
            endDate: employmentData.EndDate,
            description: employmentData.Description,
            skills: employmentData.Skills || [],
            isCurrentJob: employmentData.IsCurrentJob,
          },
        });
      } else {
        res.json({
          success: false,
          message: "No employment details found",
          data: null,
        });
      }
    } catch (error) {
      console.error("Get employment details error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  static async getUserDetails(req, res) {
    try {
      const { userId } = req.params;

      // Get basic user information
      const [userRows] = await pool.execute(
        `SELECT 
        u.Id, u.Email, u.FirstName, u.LastName, u.Role,
        u.IsEmailVerified, u.IsActive, u.CreatedAt,
        up.Phone, up.DateOfBirth, up.Gender, up.Address,
        up.City, up.State, up.Country, up.ZipCode,
        up.LinkedInProfile, up.GitHubProfile, up.PortfolioWebsite
      FROM Users u
      LEFT JOIN UserProfile up ON u.Id = up.UserId
      WHERE u.Id = ?`,
        [userId]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userRows[0];

      // Get ALL records for this user
      const [educations] = await pool.execute(
        "SELECT * FROM EducationInfo WHERE UserId = ? ORDER BY StartDate DESC",
        [userId]
      );

      const [employments] = await pool.execute(
        "SELECT * FROM EmploymentInfo WHERE UserId = ? ORDER BY StartDate DESC",
        [userId]
      );

      const [languages] = await pool.execute(
        "SELECT * FROM Languages WHERE UserId = ? ORDER BY Id ASC",
        [userId]
      );

      const [certifications] = await pool.execute(
        "SELECT * FROM Certifications WHERE UserId = ? ORDER BY IssueDate DESC",
        [userId]
      );

      const [projects] = await pool.execute(
        "SELECT * FROM Projects WHERE UserId = ? ORDER BY StartDate DESC",
        [userId]
      );

      // Parse JSON fields
      const parsedEmployments = employments.map((emp) => ({
        ...emp,
        Skills: emp.Skills ? JSON.parse(emp.Skills) : [],
      }));

      const parsedProjects = projects.map((proj) => ({
        ...proj,
        Technologies: proj.Technologies ? JSON.parse(proj.Technologies) : [],
      }));

      const userDetails = {
        id: user.Id,
        email: user.Email,
        firstName: user.FirstName,
        lastName: user.LastName,
        role: user.Role,
        isEmailVerified: user.IsEmailVerified,
        isActive: user.IsActive,
        createdAt: user.CreatedAt,
        phone: user.Phone,
        dateOfBirth: user.DateOfBirth,
        gender: user.Gender,
        address: user.Address,
        city: user.City,
        state: user.State,
        country: user.Country,
        zipCode: user.ZipCode,
        linkedInProfile: user.LinkedInProfile,
        gitHubProfile: user.GitHubProfile,
        portfolioWebsite: user.PortfolioWebsite,
        educations: educations,
        employments: parsedEmployments,
        languages: languages,
        certifications: certifications,
        projects: parsedProjects,
      };

      res.json({
        success: true,
        data: userDetails,
      });
    } catch (error) {
      console.error("Get user details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user details",
      });
    }
  }

  static async getCurrentUserProfile(req, res) {
    try {
      const userId = req.user.Id; // Get current user's ID from token

      // Get comprehensive user details
      const [userRows] = await pool.execute(
        `
      SELECT 
        u.Id, u.Email, u.FirstName, u.LastName, u.Role, 
        u.IsEmailVerified, u.IsActive, u.CreatedAt,
        up.Phone, up.DateOfBirth, up.Gender, up.Address, 
        up.City, up.State, up.Country, up.ZipCode,
        up.LinkedInProfile, up.GitHubProfile, up.PortfolioWebsite,
        ei.Degree, ei.FieldOfStudy, ei.Institution, 
        ei.StartDate as EducationStartDate, ei.EndDate as EducationEndDate,
        ei.Grade, ei.Description as EducationDescription,
        emp.JobTitle, emp.CompanyName, emp.Location,
        emp.StartDate as EmploymentStartDate, emp.EndDate as EmploymentEndDate,
        emp.Description as EmploymentDescription, emp.Skills, emp.IsCurrentJob
      FROM Users u
      LEFT JOIN UserProfile up ON u.Id = up.UserId
      LEFT JOIN EducationInfo ei ON u.Id = ei.UserId
      LEFT JOIN EmploymentInfo emp ON u.Id = emp.UserId
      WHERE u.Id = ?
    `,
        [userId]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }

      const user = userRows[0];

      // Format the response
      const userDetails = {
        id: user.Id,
        email: user.Email,
        firstName: user.FirstName,
        lastName: user.LastName,
        role: user.Role,
        isEmailVerified: user.IsEmailVerified,
        isActive: user.IsActive,
        createdAt: user.CreatedAt,

        // Personal details
        phone: user.Phone,
        dateOfBirth: user.DateOfBirth,
        gender: user.Gender,
        address: user.Address,
        city: user.City,
        state: user.State,
        country: user.Country,
        zipCode: user.ZipCode,
        linkedInProfile: user.LinkedInProfile,
        gitHubProfile: user.GitHubProfile,
        portfolioWebsite: user.PortfolioWebsite,

        // Education
        degree: user.Degree,
        fieldOfStudy: user.FieldOfStudy,
        institution: user.Institution,
        educationStartDate: user.EducationStartDate,
        educationEndDate: user.EducationEndDate,
        grade: user.Grade,
        educationDescription: user.EducationDescription,

        // Employment
        jobTitle: user.JobTitle,
        companyName: user.CompanyName,
        location: user.Location,
        employmentStartDate: user.EmploymentStartDate,
        employmentEndDate: user.EmploymentEndDate,
        employmentDescription: user.EmploymentDescription,
        skills: user.Skills ? JSON.parse(user.Skills) : [],
        isCurrentJob: user.IsCurrentJob,
      };

      res.json({
        success: true,
        data: userDetails,
      });
    } catch (error) {
      console.error("Get current user profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve profile details",
      });
    }
  }
  // Save multiple education records
  static async saveEducations(req, res) {
    try {
      const userId = req.user.Id;
      const { educations } = req.body;

      if (!Array.isArray(educations)) {
        return res.status(400).json({
          success: false,
          message: "Education data must be an array",
        });
      }

      // Filter out invalid entries (must have required fields)
      const validEducations = educations.filter(
        (edu) =>
          edu.degree && edu.fieldOfStudy && edu.institution && edu.startDate
      );

      if (validEducations.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one valid education entry is required",
        });
      }

      await User.saveEducations(userId, validEducations);

      res.json({
        success: true,
        message: `Successfully saved ${validEducations.length} education records`,
      });
    } catch (error) {
      console.error("Save educations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save education records",
      });
    }
  }

  // Save multiple employment records
  static async saveEmployments(req, res) {
    try {
      const userId = req.user.Id;
      const { employments } = req.body;

      if (!Array.isArray(employments)) {
        return res.status(400).json({
          success: false,
          message: "Employment data must be an array",
        });
      }

      // Filter out invalid entries
      const validEmployments = employments.filter(
        (emp) => emp.jobTitle && emp.companyName && emp.startDate
      );

      if (validEmployments.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one valid employment entry is required",
        });
      }

      await User.saveEmployments(userId, validEmployments);

      res.json({
        success: true,
        message: `Successfully saved ${validEmployments.length} employment records`,
      });
    } catch (error) {
      console.error("Save employments error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save employment records",
      });
    }
  }

  // Get all educations for current user
  static async getAllEducations(req, res) {
    try {
      const userId = req.user.Id;
      const educations = await User.getAllEducations(userId);

      res.json({
        success: true,
        data: educations,
      });
    } catch (error) {
      console.error("Get all educations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch education records",
      });
    }
  }

  // Get all employments for current user
  static async getAllEmployments(req, res) {
    try {
      const userId = req.user.Id;
      const employments = await User.getAllEmployments(userId);

      res.json({
        success: true,
        data: employments,
      });
    } catch (error) {
      console.error("Get all employments error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch employment records",
      });
    }
  }
  static async deleteEducation(req, res) {
    try {
      const userId = req.user.Id;
      const recordId = Number(req.params.id);

      if (!recordId || isNaN(recordId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid education record ID" });
      }

      // NOTE: (recordId, userId)
      const result = await User.deleteEducationById(recordId, userId);

      if (result && result.affectedRows && result.affectedRows > 0) {
        return res.json({
          success: true,
          message: "Education record deleted successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Education record not found or not owned by user",
        });
      }
    } catch (error) {
      console.error("Delete education error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete education record" });
    }
  }

  static async deleteEmployment(req, res) {
    try {
      const userId = req.user.Id;
      const recordId = Number(req.params.id);

      if (!recordId || isNaN(recordId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid employment record ID" });
      }

      // NOTE: (recordId, userId)
      const result = await User.deleteEmploymentById(recordId, userId);

      if (result && result.affectedRows && result.affectedRows > 0) {
        return res.json({
          success: true,
          message: "Employment record deleted successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Employment record not found or not owned by user",
        });
      }
    } catch (error) {
      console.error("Delete employment error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete employment record",
      });
    }
  }
  static async downloadProfile(req, res) {
    try {
      const userId = req.user && req.user.Id;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      // Build profile (core tables) - adapt tables if your schema differs
      const [userRows] = await pool.execute(
        `SELECT u.Id, u.Email, u.FirstName, u.LastName, u.Role,
              up.Phone, up.DateOfBirth, up.Gender, up.Address,
              up.City, up.State, up.Country, up.ZipCode,
              up.LinkedInProfile, up.GitHubProfile, up.PortfolioWebsite
       FROM Users u
       LEFT JOIN UserProfile up ON u.Id = up.UserId
       WHERE u.Id = ?`,
        [userId]
      );
      if (!userRows || userRows.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "User profile not found" });
      const user = userRows[0];

      const [educations] = await pool.execute(
        `SELECT Id, Degree, FieldOfStudy, Institution, StartDate, EndDate, Grade, Description
       FROM EducationInfo WHERE UserId = ? ORDER BY StartDate DESC`,
        [userId]
      );
      const [employments] = await pool.execute(
        `SELECT Id, JobTitle, CompanyName, Location, StartDate, EndDate, Description, Skills
       FROM EmploymentInfo WHERE UserId = ? ORDER BY StartDate DESC`,
        [userId]
      );

      // optional tables handled softly (projects, certifications, languages)
      let projects = [],
        certifications = [],
        languages = [];
      try {
        const [p] = await pool.execute(
          `SELECT Id, Title, Summary, Link FROM Projects WHERE UserId = ? ORDER BY CreatedAt DESC`,
          [userId]
        );
        projects = p || [];
      } catch (e) {
        console.warn("Projects missing", e.message || e);
      }
      try {
        const [c] = await pool.execute(
          `SELECT Id, Title, Link FROM Certifications WHERE UserId = ? ORDER BY CreatedAt DESC`,
          [userId]
        );
        certifications = c || [];
      } catch (e) {
        console.warn("Certs missing", e.message || e);
      }
      try {
        const [l] = await pool.execute(
          `SELECT Id, Name, Level FROM Languages WHERE UserId = ? ORDER BY Id ASC`,
          [userId]
        );
        languages = l || [];
      } catch (e) {
        console.warn("Languages missing", e.message || e);
      }

      // normalize skills
      const normalizedEmployments = (employments || []).map((e) => {
        let skills = [];
        if (e.Skills) {
          try {
            skills =
              typeof e.Skills === "string" ? JSON.parse(e.Skills) : e.Skills;
          } catch {
            skills = ("" + e.Skills)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
        return { ...e, Skills: skills };
      });

      const profile = {
        id: user.Id,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        phone: user.Phone,
        city: user.City,
        state: user.State,
        country: user.Country,
        address: user.Address,
        linkedInProfile: user.LinkedInProfile,
        gitHubProfile: user.GitHubProfile,
        educations: educations || [],
        employments: normalizedEmployments,
        projects,
        certifications,
        languages,
        summary: user.Summary || user.About || "",
      };

      // Render EJS -> HTML
      const templatePath = path.join(__dirname, "..", "templates", "CV.ejs");
      if (!fs.existsSync(templatePath)) {
        console.error("CV template missing at", templatePath);
        return res
          .status(500)
          .json({ success: false, message: "CV template missing on server" });
      }
      const html = await ejs.renderFile(
        templatePath,
        { profile },
        { async: true }
      );

      // Connect to remote browser
      const wsEndpoint =
        process.env.BROWSERLESS_WSEndpoint ||
        process.env.BROWSERLESS_WS_ENDPOINT;
      if (!wsEndpoint) {
        console.error("BROWSERLESS_WSEndpoint not set");
        return res
          .status(500)
          .json({ success: false, message: "Server-side PDF not configured" });
      }

      const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: { width: 1200, height: 900 },
      });
      const page = await browser.newPage();

      // Increase/disable timeout
      page.setDefaultNavigationTimeout(0); // disable navigation timeout

      // Intercept requests and optionally block known heavy domains (fonts/analytics) to avoid stalls
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const url = req.url();
        // Block analytics, tracking, or fonts if necessary
        if (
          url.includes("google-analytics") ||
          url.includes("googletagmanager") ||
          url.includes("analytics") ||
          url.includes("doubleclick")
        ) {
          return req.abort();
        }
        // Optionally block large external font providers if you inlined critical CSS
        // if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return req.abort();
        req.continue();
      });

      // Logging for debugging
      page.on("requestfailed", (r) =>
        console.warn(
          "REQ FAIL:",
          r.url(),
          r.failure && r.failure.errorText,
          r.resourceType()
        )
      );
      page.on("console", (msg) => {
        try {
          console.log("PAGE LOG:", msg.text());
        } catch (e) {}
      });

      // Try aggressive loading strategies: networkidle0 -> load -> fallback
      let loaded = false;
      try {
        await page.setContent(html, {
          waitUntil: "networkidle0",
          timeout: 45000,
        }); // first try
        loaded = true;
      } catch (err) {
        console.warn("networkidle0 failed:", err && err.message);
        try {
          await page.setContent(html, { waitUntil: "load", timeout: 30000 });
          await page.waitForTimeout(800); // let fonts/images render
          loaded = true;
        } catch (err2) {
          console.warn("load fallback failed:", err2 && err2.message);
          try {
            await page.setContent(html, { timeout: 0 });
            await page.waitForTimeout(600);
            loaded = true;
          } catch (err3) {
            console.error("final setContent failed:", err3 && err3.message);
            throw new Error("Failed to load CV HTML in remote browser");
          }
        }
      }

      // Emulate screen (or 'print' if you prefer)
      try {
        await page.emulateMediaType("screen");
      } catch (e) {}

      // Generate PDF (disable PDF timeout)
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
        timeout: 0,
      });

      try {
        await page.close();
      } catch (e) {}
      try {
        await browser.disconnect();
      } catch (e) {}

      // Send PDF
      const filename = `${profile.firstName || "resume"}_${
        profile.lastName || ""
      }_CV.pdf`.replace(/\s+/g, "_");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error("downloadProfile remote puppeteer error", err);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate PDF",
          error: err.message || String(err),
        });
      }
    }
  }
  // ===== LANGUAGES ENDPOINTS =====
  static async saveLanguages(req, res) {
    try {
      const userId = req.user.Id;
      const { languages } = req.body;

      if (!Array.isArray(languages)) {
        return res.status(400).json({
          success: false,
          message: "Languages data must be an array",
        });
      }

      const validLanguages = languages.filter(
        (lang) => lang.name && lang.level
      );

      await User.saveLanguages(userId, validLanguages);
      res.json({
        success: true,
        message: `Successfully saved ${validLanguages.length} languages`,
      });
    } catch (error) {
      console.error("Save languages error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save languages",
      });
    }
  }

  static async getAllLanguages(req, res) {
    try {
      const userId = req.user.Id;
      const languages = await User.getAllLanguages(userId);
      res.json({
        success: true,
        data: languages,
      });
    } catch (error) {
      console.error("Get all languages error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch languages",
      });
    }
  }

  static async deleteLanguage(req, res) {
    try {
      const userId = req.user.Id;
      const languageId = Number(req.params.id);

      if (!languageId || isNaN(languageId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid language ID",
        });
      }

      const result = await User.deleteLanguageById(languageId, userId);
      if (result && result.affectedRows && result.affectedRows > 0) {
        return res.json({
          success: true,
          message: "Language deleted successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Language not found",
        });
      }
    } catch (error) {
      console.error("Delete language error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete language",
      });
    }
  }

  // ===== CERTIFICATIONS ENDPOINTS =====
  static async saveCertifications(req, res) {
    try {
      const userId = req.user.Id;
      const { certifications } = req.body;

      console.log("Received certifications request for user:", userId);
      console.log(
        "Certifications payload:",
        JSON.stringify(certifications, null, 2)
      );

      if (!Array.isArray(certifications)) {
        return res.status(400).json({
          success: false,
          message: "Certifications data must be an array",
        });
      }

      const validCertifications = certifications.filter((cert) => cert.title);

      if (validCertifications.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one certification with a title is required",
        });
      }

      console.log(`Saving ${validCertifications.length} certifications...`);

      await User.saveCertifications(userId, validCertifications);

      res.json({
        success: true,
        message: `Successfully saved ${validCertifications.length} certifications`,
      });
    } catch (error) {
      console.error("Save certifications controller error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to save certifications",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async getAllCertifications(req, res) {
    try {
      const userId = req.user.Id;
      const certifications = await User.getAllCertifications(userId);
      res.json({
        success: true,
        data: certifications,
      });
    } catch (error) {
      console.error("Get all certifications error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch certifications",
      });
    }
  }

  static async deleteCertification(req, res) {
    try {
      const userId = req.user.Id;
      const certificationId = Number(req.params.id);

      if (!certificationId || isNaN(certificationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid certification ID",
        });
      }

      const result = await User.deleteCertificationById(
        certificationId,
        userId
      );
      if (result && result.affectedRows && result.affectedRows > 0) {
        return res.json({
          success: true,
          message: "Certification deleted successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Certification not found",
        });
      }
    } catch (error) {
      console.error("Delete certification error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete certification",
      });
    }
  }

  // ===== PROJECTS ENDPOINTS =====
  static async saveProjects(req, res) {
    try {
      const userId = req.user.Id;
      const { projects } = req.body;

      if (!Array.isArray(projects)) {
        return res.status(400).json({
          success: false,
          message: "Projects data must be an array",
        });
      }

      const validProjects = projects.filter((proj) => proj.title);

      await User.saveProjects(userId, validProjects);
      res.json({
        success: true,
        message: `Successfully saved ${validProjects.length} projects`,
      });
    } catch (error) {
      console.error("Save projects error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save projects",
      });
    }
  }

  static async getAllProjects(req, res) {
    try {
      const userId = req.user.Id;
      const projects = await User.getAllProjects(userId);
      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error("Get all projects error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch projects",
      });
    }
  }

  static async deleteProject(req, res) {
    try {
      const userId = req.user.Id;
      const projectId = Number(req.params.id);

      if (!projectId || isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      const result = await User.deleteProjectById(projectId, userId);
      if (result && result.affectedRows && result.affectedRows > 0) {
        return res.json({
          success: true,
          message: "Project deleted successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    } catch (error) {
      console.error("Delete project error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete project",
      });
    }
  }
}

module.exports = AuthController;
