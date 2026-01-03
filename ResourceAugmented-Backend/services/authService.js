const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const EmailService = require("./emailService");
const { jwtSecret, maxLoginAttempts, jwtExpire } = require("../config/auth");
const { pool } = require("../config/database");
class AuthService {
  static generateToken(user) {
    return jwt.sign(
      {
        userId: user.Id,
        Id: user.Id,
        Email: user.Email,
        Role: user.Role,
        FirstName: user.FirstName,
        LastName: user.LastName,
      },
      jwtSecret,
      { expiresIn: jwtExpire }
    );
  }

  static generateVerificationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  // Admin login (predefined admin user)
  static async login(email, password) {
    try {
      console.log("AuthService login attempt for:", email);

      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check if user has completed verification (both token used AND password set)
      if (!user.IsEmailVerified && user.Role !== "ADMIN") {
        if (!user.IsTokenUsed) {
          throw new Error("Please verify your email before logging in");
        } else {
          throw new Error(
            "Please complete your account setup by setting a password"
          );
        }
      }

      // Verify password
      if (!user.Password) {
        throw new Error(
          "Please complete your account setup by setting a password"
        );
      }

      const isValidPassword = await User.verifyPassword(
        password,
        user.Password
      );
      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      // Rest of login logic...
      const userProfile = await User.getUserProfile(user.Id);
      const token = this.generateToken(userProfile);
      console.log(
        "AuthService login successful for user role:",
        userProfile.Role
      );
      return {
        token,
        user: {
          id: userProfile.Id,
          email: userProfile.Email,
          firstName: userProfile.FirstName,
          lastName: userProfile.LastName,
          role: userProfile.Role,
          isEmailVerified: userProfile.IsEmailVerified,
          isActive: userProfile.IsActive,
          profile: {},
        },
      };
    } catch (error) {
      console.error("AuthService login error:", error);
      throw error;
    }
  }

  // Admin adds a new user (Resource or Company)
  static async addUserByAdmin(userData, adminUserId) {
    try {
      const { firstName, lastName, email, role } = userData;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error("User already exists with this email");
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create minimal user record
      const userId = await User.createMinimal({
        firstName,
        lastName,
        email,
        role,
        createdBy: adminUserId,
        verificationToken,
        tokenExpiry,
      });

      // TODO: Send verification email here
      // await EmailService.sendVerificationEmail(email, firstName, verificationToken);

      return {
        userId,
        message: "User created successfully. Verification email sent.",
        verificationToken, // Remove this in production
      };
    } catch (error) {
      console.error("AuthService addUserByAdmin error:", error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // User verifies email and can set password
  // In services/authService.js
  // In services/authService.js
  // Update your verifyEmail method in services/authService.js
  static async verifyEmail(token) {
    const user = await User.findByVerificationToken(token);
    if (!user) {
      // Check if token was already used, and allow password setup if so
      const usedUser = await User.findUserByUsedToken(token);
      if (usedUser) {
        return {
          success: true,
          message: "Email already verified. You can now set your password.",
          data: { userId: usedUser.Id, email: usedUser.Email },
        };
      }
      throw new Error(
        "This verification link has already been used or has expired..."
      );
    }
    // Mark token as used, but don't verify email
    await User.markTokenAsUsed(user.Id);
    return {
      success: true,
      message: "Email verification successful. Please set your password.",
      data: { userId: user.Id, email: user.Email },
    };
  }

  // User sets password after email verification
  static async setPassword(userId, password) {
    try {
      await User.setPassword(userId, password);
      console.log("Password set and user verified for ID:", userId);

      return {
        message:
          "Password set successfully. Your account is now verified and you can login.",
      };
    } catch (error) {
      console.error("AuthService setPassword error:", error);
      throw new Error(`Failed to set password: ${error.message}`);
    }
  }

  // Wizard Step 1: Update personal details
  static async updatePersonalDetails(userId, profileData) {
    try {
      await User.updatePersonalDetails(userId, profileData);
      return { message: "Personal details updated successfully" };
    } catch (error) {
      console.error("AuthService updatePersonalDetails error:", error);
      throw new Error(`Failed to update personal details: ${error.message}`);
    }
  }

  // Wizard Step 2: Add education info
  static async addEducation(userId, educationData) {
    try {
      await User.addEducation(userId, educationData);
      return { message: "Education information added successfully" };
    } catch (error) {
      console.error("AuthService addEducation error:", error);
      throw new Error(`Failed to add education: ${error.message}`);
    }
  }

  // Wizard Step 3: Add employment info
  static async addEmployment(userId, employmentData) {
    try {
      await User.addEmployment(userId, employmentData);
      return { message: "Employment information added successfully" };
    } catch (error) {
      console.error("AuthService addEmployment error:", error);
      throw new Error(`Failed to add employment: ${error.message}`);
    }
  }

  // Get user's profile completion status
  static async getProfileStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check what steps are completed
      const hasPersonalDetails = await User.hasPersonalDetails(userId);
      const hasEducation = await User.hasEducation(userId);
      const hasEmployment = await User.hasEmployment(userId);

      return {
        userId,
        isEmailVerified: user.IsEmailVerified,
        hasPassword: !!user.Password,
        profileCompletion: {
          personalDetails: hasPersonalDetails,
          education: hasEducation,
          employment: hasEmployment,
        },
        nextStep: this.getNextStep(
          user,
          hasPersonalDetails,
          hasEducation,
          hasEmployment
        ),
      };
    } catch (error) {
      console.error("AuthService getProfileStatus error:", error);
      throw error;
    }
  }

  static getNextStep(user, hasPersonalDetails, hasEducation, hasEmployment) {
    if (!user.IsEmailVerified) return "verify-email";
    if (!user.Password) return "set-password";
    if (!hasPersonalDetails) return "personal-details";
    if (!hasEducation) return "education";
    if (!hasEmployment) return "employment";
    return "complete";
  }

  // Resend verification email
  static async resendVerificationEmail(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.IsEmailVerified) {
        throw new Error("Email is already verified");
      }

      // Generate new token
      const verificationToken = this.generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.updateVerificationToken(
        user.Id,
        verificationToken,
        tokenExpiry
      );

      // TODO: Send verification email
      // await EmailService.sendVerificationEmail(email, user.FirstName, verificationToken);

      return { message: "Verification email sent successfully" };
    } catch (error) {
      console.error("AuthService resendVerificationEmail error:", error);
      throw error;
    }
  }
  static async createUserByAdmin(userData, adminUserId) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { firstName, lastName, email, role, managerId } = userData;

      // Declare assignedManagerId at the function scope level
      let assignedManagerId = null;

      // Validate input
      if (!firstName || !lastName || !email || !role) {
        throw new Error("First name, last name, email, and role are required");
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error("User already exists with this email");
      }

      // If managerId is provided, validate it exists
      if (managerId) {
        const [managerRows] = await connection.execute(
          "SELECT Id, Role FROM Users WHERE Id = ? AND IsActive = TRUE",
          [managerId]
        );

        if (managerRows.length === 0) {
          throw new Error("Invalid manager ID");
        }

        if (!["MANAGER", "ADMIN"].includes(managerRows[0].Role)) {
          throw new Error("Selected user is not a manager");
        }
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create minimal user record
      const userId = await User.createMinimal({
        firstName,
        lastName,
        email,
        role,
        createdBy: adminUserId,
        verificationToken,
        tokenExpiry,
      });

      // Auto-assign manager if provided or if creating RESOURCE
      if (role === "RESOURCE") {
        // Assign the provided managerId or find a default one
        assignedManagerId = managerId;

        // If no manager specified, auto-assign to the creating admin or first available manager
        if (!assignedManagerId) {
          const [defaultManagerRows] = await connection.execute(
            `
          SELECT Id FROM Users
          WHERE Role IN ('MANAGER', 'ADMIN') AND IsActive = TRUE
          ORDER BY
            CASE WHEN Id = ? THEN 0 ELSE 1 END,
            Role DESC,
            Id ASC
          LIMIT 1
        `,
            [adminUserId]
          );

          if (defaultManagerRows.length > 0) {
            assignedManagerId = defaultManagerRows[0].Id;
          }
        }

        // Insert manager relationship if we have a manager to assign
        if (assignedManagerId) {
          await connection.execute(
            `
          INSERT INTO UserReporting (UserId, ManagerId, CreatedAt)
          VALUES (?, ?, NOW())
        `,
            [userId, assignedManagerId]
          );

          console.log(
            `Manager ${assignedManagerId} assigned to user ${userId}`
          );
        }
      }

      // Create initial leave balances for the new user
      await this.createInitialLeaveBalances(userId, connection);

      await connection.commit();

      // Send verification email
      try {
        const emailResult = await EmailService.sendVerificationEmail(
          email,
          verificationToken,
          { firstName, lastName, email, role }
        );

        console.log("Verification email sent successfully");
        return {
          success: true,
          userId,
          message:
            "User created successfully. Verification email sent to " + email,
          verificationToken,
          verificationLink: `/verify-email/${verificationToken}`,
          emailSent: true,
          emailMessageId: emailResult.messageId,
          managerAssigned: !!assignedManagerId,
        };
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        return {
          success: true,
          userId,
          message:
            "User created successfully, but verification email could not be sent.",
          verificationToken,
          verificationLink: `/verify-email/${verificationToken}`,
          emailSent: false,
          emailError: emailError.message,
          managerAssigned: !!assignedManagerId,
        };
      }
    } catch (error) {
      await connection.rollback();
      console.error("AuthService createUserByAdmin error:", error);
      throw new Error(`Failed to create user: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  static async getAllUsers() {
    try {
      // Get all users from database
      const users = await User.getAllUsers();

      if (!users || users.length === 0) {
        return {
          success: true,
          message: "No users found",
          data: [],
        };
      }

      const formattedUsers = users.map((user) => {
        return {
          id: user.Id,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          role: user.Role,
          isEmailVerified: user.IsEmailVerified,
          isActive: user.IsActive,
          createdAt: user.CreatedAt,
        };
      });

      return {
        success: true,
        message: "Users retrieved successfully",
        data: formattedUsers,
      };
    } catch (error) {
      console.error("AuthService getAllUsers error:", error);
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  static async getEducationDetails(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM EducationInfo WHERE UserId = ? ORDER BY StartDate DESC LIMIT 1",
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Get education details error:", error);
      throw error;
    }
  }
  static async getEmploymentDetails(userId) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM EmploymentInfo WHERE UserId = ? ORDER BY StartDate DESC LIMIT 1",
        [userId]
      );

      if (rows && rows[0]) {
        const employmentData = rows[0];

        // Handle skills parsing safely
        if (employmentData.Skills) {
          try {
            employmentData.Skills = JSON.parse(employmentData.Skills);
          } catch (e) {
            employmentData.Skills = [];
          }
        } else {
          employmentData.Skills = [];
        }

        // Convert date fields to proper format or empty string for UI
        employmentData.StartDate = employmentData.StartDate
          ? employmentData.StartDate.toISOString().split("T")[0]
          : "";
        employmentData.EndDate = employmentData.EndDate
          ? employmentData.EndDate.toISOString().split("T")[0]
          : "";

        return employmentData;
      }

      return null;
    } catch (error) {
      console.error("Get employment details error:", error);
      throw error;
    }
  }
  static async createInitialLeaveBalances(userId, connection) {
    try {
      console.log(`Creating initial leave balances for user ${userId}`);

      // Get Annual Leave type ID specifically
      const [leaveTypeRows] = await connection.execute(`
      SELECT Id FROM LeaveTypes WHERE Name = 'Annual Leave' AND IsActive = TRUE
    `);

      if (leaveTypeRows.length === 0) {
        console.error("No Annual Leave type found");
        return;
      }

      const leaveTypeId = leaveTypeRows[0].Id;
      const currentYear = new Date().getFullYear();

      // Create balance record for Annual Leave only
      await connection.execute(
        `
      INSERT INTO LeaveBalances (UserId, LeaveTypeId, TotalAllocated, AvailableDays, UsedDays, CarriedForward, Year, UnpaidDaysTaken)
      VALUES (?, ?, 0, 0, 0, 0, ?, 0)
      ON DUPLICATE KEY UPDATE UserId = VALUES(UserId)
    `,
        [userId, leaveTypeId, currentYear]
      );

      console.log(`✅ Leave balance created for user ${userId} - Annual Leave`);
    } catch (error) {
      console.error(
        `❌ Error creating leave balances for user ${userId}:`,
        error
      );
      throw error;
    }
  }
}
module.exports = AuthService;
