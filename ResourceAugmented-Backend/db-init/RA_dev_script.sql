-- ============================================================================
-- Resource Augmentation Platform - Development Database Setup
-- ============================================================================
-- Database: ResourceDatabase_dev
-- Purpose: Complete database schema with tables, indexes, and initial data
-- ============================================================================

-- ============================================================================
-- 1. DATABASE INITIALIZATION
-- ============================================================================

CREATE DATABASE IF NOT EXISTS ResourceDatabase_dev;
USE ResourceDatabase_dev;


-- ============================================================================
-- 2. USER MANAGEMENT TABLES
-- ============================================================================

-- Core Users Table
CREATE TABLE Users (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  Email VARCHAR(255) UNIQUE NOT NULL,
  FirstName VARCHAR(100) NULL,
  LastName VARCHAR(100) NULL,
  Password VARCHAR(255) NULL,
  Salt VARCHAR(255) NULL,
  Role ENUM('ADMIN', 'COMPANY', 'RESOURCE', 'MANAGER') NOT NULL DEFAULT 'RESOURCE',
  Gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
  IsEmailVerified BOOLEAN DEFAULT FALSE,
  EmailVerificationToken VARCHAR(255) NULL,
  EmailVerificationExpiry DATETIME NULL,
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedBy INT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (Email),
  INDEX idx_user_type (Role)
);

-- User Profile Details
CREATE TABLE UserProfile (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT NOT NULL,
  Phone VARCHAR(20) NULL,
  DateOfBirth DATE NULL,
  Gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
  Address TEXT NULL,
  City VARCHAR(100) NULL,
  State VARCHAR(100) NULL,
  Country VARCHAR(100) NULL,
  ZipCode VARCHAR(20) NULL,
  LinkedInProfile VARCHAR(255) NULL,
  GitHubProfile VARCHAR(255) NULL,
  PortfolioWebsite VARCHAR(255) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Manager-Employee Relationship
CREATE TABLE UserReporting (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  UserId INT NOT NULL,
  ManagerId INT NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_userreporting_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  CONSTRAINT fk_userreporting_manager FOREIGN KEY (ManagerId) REFERENCES Users(Id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_manager (UserId, ManagerId),
  INDEX idx_userreporting_userid (UserId),
  INDEX idx_userreporting_managerid (ManagerId)
);


-- ============================================================================
-- 3. EMPLOYEE PROFILE TABLES
-- ============================================================================

-- Education Information
CREATE TABLE EducationInfo (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT NOT NULL,
  Degree VARCHAR(200) NOT NULL,
  FieldOfStudy VARCHAR(200) NOT NULL,
  Institution VARCHAR(200) NOT NULL,
  StartDate DATE NOT NULL,
  EndDate DATE NULL,
  Grade VARCHAR(50) NULL,
  Description TEXT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Employment History
CREATE TABLE EmploymentInfo (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT NOT NULL,
  JobTitle VARCHAR(200) NOT NULL,
  CompanyName VARCHAR(200) NOT NULL,
  Location VARCHAR(200) NULL,
  StartDate DATE NOT NULL,
  EndDate DATE NULL,
  Description TEXT NULL,
  Skills TEXT NULL, -- JSON array: ["React", "Node.js"]
  IsCurrentJob BOOLEAN DEFAULT FALSE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Projects
CREATE TABLE Projects (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT NOT NULL,
  Title VARCHAR(200) NOT NULL,
  Description TEXT NULL,
  Technologies TEXT NULL,
  Link VARCHAR(500) NULL,
  StartDate DATE NULL,
  EndDate DATE NULL,
  IsOngoing BOOLEAN DEFAULT FALSE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  INDEX idx_projects_userid (UserId)
);

-- Certifications
CREATE TABLE Certifications (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT NOT NULL,
  Title VARCHAR(200) NOT NULL,
  IssuingOrganization VARCHAR(200) NULL,
  IssueDate DATE NULL,
  ExpiryDate DATE NULL,
  CredentialId VARCHAR(100) NULL,
  Link VARCHAR(500) NULL,
  Description TEXT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  INDEX idx_certifications_userid (UserId)
);

-- Languages
CREATE TABLE Languages (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT NOT NULL,
  Name VARCHAR(120) NOT NULL,
  Level VARCHAR(60) NULL, -- e.g., "Native", "Fluent", "B2"
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  INDEX idx_langs_userid (UserId)
);


-- ============================================================================
-- 4. LEAVE MANAGEMENT TABLES
-- ============================================================================

-- Leave Types Configuration
CREATE TABLE LeaveTypes (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  Name VARCHAR(100) NOT NULL,
  Code VARCHAR(20) UNIQUE,
  MaxDaysPerYear INT,
  MinDays DECIMAL(3,1) DEFAULT 0.5,
  MaxDays INT DEFAULT 365,
  MaxConsecutiveDays INT,
  AllowCarryForward BOOLEAN DEFAULT FALSE,
  CarryForwardMaxDays INT,
  RequiresApproval BOOLEAN DEFAULT TRUE,
  RequireDocuments BOOLEAN DEFAULT FALSE,
  ApplicableGenders JSON NULL DEFAULT NULL,
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Policies by User Role
CREATE TABLE LeavePolicies (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserType ENUM('RESOURCE', 'MANAGER', 'COMPANY', 'ADMIN'),
  LeaveTypeId INT,
  AccrualRate DECIMAL(4,2), -- Days per month
  EligibilityMonths INT DEFAULT 0,
  MaxBalance INT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(Id)
);

-- Employee Leave Balances
CREATE TABLE LeaveBalances (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT,
  LeaveTypeId INT,
  TotalAllocated DECIMAL(5,2),
  AvailableDays DECIMAL(5,2),
  UsedDays DECIMAL(5,2) DEFAULT 0,
  CarriedForward DECIMAL(5,2) DEFAULT 0,
  UnpaidDaysTaken DECIMAL(5,2) DEFAULT 0,
  Year INT,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id),
  FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(Id)
);

-- Leave Applications
CREATE TABLE LeaveApplications (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  UserId INT,
  LeaveTypeId INT,
  FromDate DATE,
  ToDate DATE,
  TotalDays DECIMAL(4,2),
  CalculatedDays DECIMAL(4,1),
  HalfDay BOOLEAN DEFAULT FALSE,
  Reason TEXT,
  Status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
  AppliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ResponseAt TIMESTAMP NULL,
  ApprovedBy INT NULL,
  RejectionReason TEXT NULL,
  AttachmentUrl VARCHAR(500) NULL,
  PaidDays DECIMAL(4,2) DEFAULT 0,
  UnpaidDays DECIMAL(4,2) DEFAULT 0,
  IsPartiallyUnpaid BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (UserId) REFERENCES Users(Id),
  FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(Id),
  FOREIGN KEY (ApprovedBy) REFERENCES Users(Id)
);

-- Leave Application Days (for half-day tracking)
CREATE TABLE LeaveApplicationDays (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  ApplicationId INT NOT NULL,
  LeaveDate DATE NOT NULL,
  IsHalfDay BOOLEAN DEFAULT FALSE,
  HalfDayType ENUM('MORNING', 'AFTERNOON') NULL,
  IsPaid BOOLEAN DEFAULT TRUE,
  PayStatus ENUM('PAID', 'UNPAID') DEFAULT 'PAID',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ApplicationId) REFERENCES LeaveApplications(Id) ON DELETE CASCADE,
  UNIQUE KEY unique_application_date (ApplicationId, LeaveDate)
);

-- Leave Approval Workflow
CREATE TABLE LeaveApprovalWorkflow (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  ApplicationId INT,
  ApproverId INT,
  ApprovalLevel INT,
  Status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  Comments TEXT,
  ActionDate TIMESTAMP NULL,
  FOREIGN KEY (ApplicationId) REFERENCES LeaveApplications(Id),
  FOREIGN KEY (ApproverId) REFERENCES Users(Id)
);

-- Leave Payment Details
CREATE TABLE LeavePaymentDetails (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  ApplicationId INT NOT NULL,
  UserId INT NOT NULL,
  LeaveTypeId INT NOT NULL,
  RequestedDays DECIMAL(4,2) NOT NULL,
  PaidDays DECIMAL(4,2) NOT NULL,
  UnpaidDays DECIMAL(4,2) NOT NULL,
  AvailableBalanceAtTime DECIMAL(4,2) NOT NULL,
  PaymentCalculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ApplicationId) REFERENCES LeaveApplications(Id) ON DELETE CASCADE,
  FOREIGN KEY (UserId) REFERENCES Users(Id),
  FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(Id)
);

-- Leave Accrual Log (for monthly accrual tracking)
CREATE TABLE LeaveAccrualLog (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  LeaveTypeId INT NOT NULL,
  Year INT NOT NULL,
  Month INT NOT NULL,
  AccrualAmount DECIMAL(3,1) NOT NULL,
  EmployeesAffected INT NOT NULL,
  ProcessedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(Id),
  UNIQUE KEY unique_year_month (LeaveTypeId, Year, Month)
);


-- ============================================================================
-- 5. INITIAL DATA SETUP
-- ============================================================================

-- Insert Default Leave Types
INSERT INTO LeaveTypes (Name, Code, MaxDaysPerYear, IsActive) VALUES
('Annual Leave', 'AL', 20, TRUE),
('Sick Leave', 'SL', 10, TRUE),
('Emergency Leave', 'EL', 5, TRUE),
('Maternity Leave', 'ML', 90, TRUE),
('Paternity Leave', 'PL', 15, TRUE);

-- Set Gender-Specific Leave Types
UPDATE LeaveTypes SET ApplicableGenders = '["MALE", "FEMALE", "OTHER"]' WHERE Code IN ('AL', 'SL', 'EL');
UPDATE LeaveTypes SET ApplicableGenders = '["FEMALE"]' WHERE Code = 'ML';
UPDATE LeaveTypes SET ApplicableGenders = '["MALE"]' WHERE Code = 'PL';

-- Create Initial Leave Balances for All Existing Users
INSERT INTO LeaveBalances (UserId, LeaveTypeId, TotalAllocated, AvailableDays, UsedDays, Year)
SELECT u.Id, lt.Id, lt.MaxDaysPerYear, lt.MaxDaysPerYear, 0, YEAR(CURDATE())
FROM Users u
CROSS JOIN LeaveTypes lt
WHERE lt.IsActive = TRUE
  AND u.Role IN ('RESOURCE', 'MANAGER', 'COMPANY')
  AND u.IsActive = TRUE
ON DUPLICATE KEY UPDATE
  TotalAllocated = VALUES(TotalAllocated),
  AvailableDays = VALUES(AvailableDays);


-- ============================================================================
-- 6. USEFUL VERIFICATION QUERIES (Comment out when not needed)
-- ============================================================================

/*
-- View All Users
SELECT Id, FirstName, LastName, Email, Role, IsActive FROM Users ORDER BY Id;

-- View User Reporting Structure
SELECT 
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  CONCAT(m.FirstName, ' ', m.LastName) AS Manager
FROM UserReporting ur
JOIN Users u ON ur.UserId = u.Id
JOIN Users m ON ur.ManagerId = m.Id;

-- View Leave Balances
SELECT 
  u.Id,
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  u.Role,
  lt.Name AS LeaveType,
  lb.TotalAllocated,
  lb.AvailableDays,
  lb.UsedDays
FROM Users u
LEFT JOIN LeaveBalances lb ON u.Id = lb.UserId AND lb.Year = YEAR(CURDATE())
LEFT JOIN LeaveTypes lt ON lb.LeaveTypeId = lt.Id
WHERE u.Role IN ('RESOURCE', 'MANAGER', 'COMPANY')
  AND u.IsActive = TRUE
ORDER BY u.FirstName, lt.Name;

-- View All Leave Applications
SELECT 
  la.Id,
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  lt.Name AS LeaveType,
  la.FromDate,
  la.ToDate,
  la.TotalDays,
  la.Status,
  la.AppliedAt
FROM LeaveApplications la
JOIN Users u ON la.UserId = u.Id
JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
ORDER BY la.AppliedAt DESC;

-- View Active Leave Types
SELECT Id, Name, Code, MaxDaysPerYear, ApplicableGenders, IsActive 
FROM LeaveTypes 
WHERE IsActive = TRUE;
*/


-- ============================================================================
-- 6. USEFUL VERIFICATION QUERIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 USER MANAGEMENT TABLES
-- ----------------------------------------------------------------------------

-- View All Users
SELECT * FROM Users ORDER BY Id;

-- View User Profiles
SELECT * FROM UserProfile ORDER BY UserId;

-- View Manager-Employee Relationships
SELECT * FROM UserReporting ORDER BY Id;

-- View Users with Manager Names (JOIN)
SELECT 
  u.Id,
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  u.Email,
  u.Role,
  CONCAT(m.FirstName, ' ', m.LastName) AS Manager
FROM Users u
LEFT JOIN UserReporting ur ON u.Id = ur.UserId
LEFT JOIN Users m ON ur.ManagerId = m.Id
ORDER BY u.Id;


-- ----------------------------------------------------------------------------
-- 6.2 EMPLOYEE PROFILE TABLES
-- ----------------------------------------------------------------------------

-- View All Education Records
SELECT * FROM EducationInfo ORDER BY UserId, StartDate DESC;

-- View All Employment Records
SELECT * FROM EmploymentInfo ORDER BY UserId, StartDate DESC;

-- View All Projects
SELECT * FROM Projects ORDER BY UserId, StartDate DESC;

-- View All Certifications
SELECT * FROM Certifications ORDER BY UserId, IssueDate DESC;

-- View All Languages
SELECT * FROM Languages ORDER BY UserId;


-- ----------------------------------------------------------------------------
-- 6.3 LEAVE MANAGEMENT TABLES
-- ----------------------------------------------------------------------------

-- View All Leave Types
SELECT * FROM LeaveTypes ORDER BY Id;

-- View Leave Policies
SELECT * FROM LeavePolicies ORDER BY UserType, LeaveTypeId;

-- View All Leave Balances
SELECT * FROM LeaveBalances ORDER BY UserId, LeaveTypeId;

-- View Leave Balances with User and Leave Type Names (JOIN)
SELECT 
  lb.Id,
  lb.UserId,
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  u.Role,
  lt.Name AS LeaveType,
  lb.TotalAllocated,
  lb.AvailableDays,
  lb.UsedDays,
  lb.CarriedForward,
  lb.UnpaidDaysTaken,
  lb.Year
FROM LeaveBalances lb
JOIN Users u ON lb.UserId = u.Id
JOIN LeaveTypes lt ON lb.LeaveTypeId = lt.Id
WHERE lb.Year = YEAR(CURDATE())
ORDER BY u.FirstName, lt.Name;

-- View All Leave Applications
SELECT * FROM LeaveApplications ORDER BY AppliedAt DESC;

-- View Leave Applications with Details (JOIN)
SELECT 
  la.Id,
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  u.Email,
  lt.Name AS LeaveType,
  la.FromDate,
  la.ToDate,
  la.TotalDays,
  la.CalculatedDays,
  la.Status,
  la.Reason,
  la.AppliedAt,
  la.ResponseAt,
  CONCAT(approver.FirstName, ' ', approver.LastName) AS ApprovedBy
FROM LeaveApplications la
JOIN Users u ON la.UserId = u.Id
JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
LEFT JOIN Users approver ON la.ApprovedBy = approver.Id
ORDER BY la.AppliedAt DESC;

-- View Leave Application Days
SELECT * FROM LeaveApplicationDays ORDER BY ApplicationId, LeaveDate;

-- View Leave Approval Workflow
SELECT * FROM LeaveApprovalWorkflow ORDER BY ApplicationId, ApprovalLevel;

-- View Leave Payment Details
SELECT * FROM LeavePaymentDetails ORDER BY PaymentCalculatedAt DESC;

-- View Leave Accrual Log
SELECT * FROM LeaveAccrualLog ORDER BY Year DESC, Month DESC;


-- ----------------------------------------------------------------------------
-- 6.4 QUICK STATUS CHECKS
-- ----------------------------------------------------------------------------

-- Count Records in Each Table
SELECT 'Users' AS TableName, COUNT(*) AS RecordCount FROM Users
UNION ALL
SELECT 'UserProfile', COUNT(*) FROM UserProfile
UNION ALL
SELECT 'UserReporting', COUNT(*) FROM UserReporting
UNION ALL
SELECT 'EducationInfo', COUNT(*) FROM EducationInfo
UNION ALL
SELECT 'EmploymentInfo', COUNT(*) FROM EmploymentInfo
UNION ALL
SELECT 'Projects', COUNT(*) FROM Projects
UNION ALL
SELECT 'Certifications', COUNT(*) FROM Certifications
UNION ALL
SELECT 'Languages', COUNT(*) FROM Languages
UNION ALL
SELECT 'LeaveTypes', COUNT(*) FROM LeaveTypes
UNION ALL
SELECT 'LeavePolicies', COUNT(*) FROM LeavePolicies
UNION ALL
SELECT 'LeaveBalances', COUNT(*) FROM LeaveBalances
UNION ALL
SELECT 'LeaveApplications', COUNT(*) FROM LeaveApplications
UNION ALL
SELECT 'LeaveApplicationDays', COUNT(*) FROM LeaveApplicationDays
UNION ALL
SELECT 'LeaveApprovalWorkflow', COUNT(*) FROM LeaveApprovalWorkflow
UNION ALL
SELECT 'LeavePaymentDetails', COUNT(*) FROM LeavePaymentDetails
UNION ALL
SELECT 'LeaveAccrualLog', COUNT(*) FROM LeaveAccrualLog;

-- View Active Users by Role
SELECT Role, COUNT(*) AS Count 
FROM Users 
WHERE IsActive = TRUE 
GROUP BY Role 
ORDER BY Role;

-- View Pending Leave Applications
SELECT 
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  lt.Name AS LeaveType,
  la.FromDate,
  la.ToDate,
  la.TotalDays,
  la.AppliedAt
FROM LeaveApplications la
JOIN Users u ON la.UserId = u.Id
JOIN LeaveTypes lt ON la.LeaveTypeId = lt.Id
WHERE la.Status = 'PENDING'
ORDER BY la.AppliedAt;

-- View Current Year Leave Summary by Employee
SELECT 
  u.Id,
  CONCAT(u.FirstName, ' ', u.LastName) AS Employee,
  u.Role,
  SUM(lb.TotalAllocated) AS TotalLeaveAllocated,
  SUM(lb.AvailableDays) AS TotalAvailable,
  SUM(lb.UsedDays) AS TotalUsed
FROM Users u
LEFT JOIN LeaveBalances lb ON u.Id = lb.UserId AND lb.Year = YEAR(CURDATE())
WHERE u.Role IN ('RESOURCE', 'MANAGER', 'COMPANY')
  AND u.IsActive = TRUE
GROUP BY u.Id, u.FirstName, u.LastName, u.Role
ORDER BY u.FirstName;


-- ----------------------------------------------------------------------------
-- 6.5 SEARCH QUERIES (Replace values as needed)
-- ----------------------------------------------------------------------------

-- Find User by Email
SELECT * FROM Users WHERE Email = 'user@example.com';

-- Find User by ID
SELECT * FROM Users WHERE Id = 37;

-- Find Leave Applications for Specific User
SELECT * FROM LeaveApplications WHERE UserId = 37 ORDER BY AppliedAt DESC;

-- Find Leave Balance for Specific User
SELECT 
  lt.Name AS LeaveType,
  lb.TotalAllocated,
  lb.AvailableDays,
  lb.UsedDays,
  lb.Year
FROM LeaveBalances lb
JOIN LeaveTypes lt ON lb.LeaveTypeId = lt.Id
WHERE lb.UserId = 37
ORDER BY lt.Name;

-- Find Team Members for a Manager
SELECT 
  u.Id,
  CONCAT(u.FirstName, ' ', u.LastName) AS TeamMember,
  u.Email,
  u.Role
FROM UserReporting ur
JOIN Users u ON ur.UserId = u.Id
WHERE ur.ManagerId = 37
ORDER BY u.FirstName;
-- ============================================================================