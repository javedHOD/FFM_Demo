-- FieldForce Enterprise Database Schema (MSSQL)
-- This is the database structure ready for backend implementation

-- Create Database
-- CREATE DATABASE FieldForceEnterprise;
-- GO

-- ============================================
-- 1. ROLES TABLE
-- ============================================
CREATE TABLE Roles (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL UNIQUE,
    CreatedAt DATETIME DEFAULT GETUTCDATE()
);

-- ============================================
-- 2. REGIONS TABLE
-- ============================================
CREATE TABLE Regions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL UNIQUE,
    CreatedAt DATETIME DEFAULT GETUTCDATE()
);

-- ============================================
-- 3. CITIES TABLE
-- ============================================
CREATE TABLE Cities (
    Id INT PRIMARY KEY IDENTITY(1,1),
    RegionId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (RegionId) REFERENCES Regions(Id),
    UNIQUE (RegionId, Name)
);

-- ============================================
-- 4. USERS TABLE
-- ============================================
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Phone NVARCHAR(20) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    RoleId INT NOT NULL,
    RegionId INT,
    CityId INT,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (RoleId) REFERENCES Roles(Id),
    FOREIGN KEY (RegionId) REFERENCES Regions(Id),
    FOREIGN KEY (CityId) REFERENCES Cities(Id)
);

CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Users_RoleId ON Users(RoleId);
CREATE INDEX IX_Users_RegionId ON Users(RegionId);
CREATE INDEX IX_Users_CityId ON Users(CityId);

-- ============================================
-- 5. SHOPS TABLE
-- ============================================
CREATE TABLE Shops (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ShopName NVARCHAR(255) NOT NULL,
    ShopType NVARCHAR(100),
    Address NVARCHAR(500),
    CityId INT NOT NULL,
    RegionId INT NOT NULL,
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    AssignedUserId INT,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (CityId) REFERENCES Cities(Id),
    FOREIGN KEY (RegionId) REFERENCES Regions(Id),
    FOREIGN KEY (AssignedUserId) REFERENCES Users(Id)
);

CREATE INDEX IX_Shops_CityId ON Shops(CityId);
CREATE INDEX IX_Shops_RegionId ON Shops(RegionId);
CREATE INDEX IX_Shops_AssignedUserId ON Shops(AssignedUserId);

-- ============================================
-- 6. ATTENDANCE TABLE
-- ============================================
CREATE TABLE Attendance (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    CheckInTime DATETIME NOT NULL,
    CheckOutTime DATETIME,
    CheckInLatitude DECIMAL(10, 8),
    CheckInLongitude DECIMAL(11, 8),
    CheckOutLatitude DECIMAL(10, 8),
    CheckOutLongitude DECIMAL(11, 8),
    SelfieUrl NVARCHAR(MAX),
    Status NVARCHAR(50) NOT NULL DEFAULT 'CheckedIn', -- CheckedIn, CheckedOut, Absent, Late
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE INDEX IX_Attendance_UserId ON Attendance(UserId);
CREATE INDEX IX_Attendance_CreatedAt ON Attendance(CreatedAt);

-- ============================================
-- 7. VISITS TABLE
-- ============================================
CREATE TABLE Visits (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    ShopId INT NOT NULL,
    VisitStartTime DATETIME NOT NULL,
    VisitEndTime DATETIME,
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    DurationMinutes INT,
    Remarks NVARCHAR(MAX),
    Status NVARCHAR(50) NOT NULL DEFAULT 'InProgress', -- InProgress, Completed, Cancelled
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (ShopId) REFERENCES Shops(Id)
);

CREATE INDEX IX_Visits_UserId ON Visits(UserId);
CREATE INDEX IX_Visits_ShopId ON Visits(ShopId);
CREATE INDEX IX_Visits_CreatedAt ON Visits(CreatedAt);

-- ============================================
-- 8. VISIT PHOTOS TABLE
-- ============================================
CREATE TABLE VisitPhotos (
    Id INT PRIMARY KEY IDENTITY(1,1),
    VisitId INT NOT NULL,
    PhotoType NVARCHAR(50) NOT NULL, -- OutsideShop, ShelfPhoto, SelfieWithShopkeeper
    PhotoUrl NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (VisitId) REFERENCES Visits(Id) ON DELETE CASCADE
);

CREATE INDEX IX_VisitPhotos_VisitId ON VisitPhotos(VisitId);
CREATE INDEX IX_VisitPhotos_PhotoType ON VisitPhotos(PhotoType);

-- ============================================
-- 9. SALES ENTRIES TABLE
-- ============================================
CREATE TABLE SalesEntries (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    ShopId INT NOT NULL,
    ProductName NVARCHAR(255) NOT NULL,
    Quantity INT NOT NULL,
    Amount DECIMAL(15, 2) NOT NULL,
    Remarks NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (ShopId) REFERENCES Shops(Id)
);

CREATE INDEX IX_SalesEntries_UserId ON SalesEntries(UserId);
CREATE INDEX IX_SalesEntries_ShopId ON SalesEntries(ShopId);
CREATE INDEX IX_SalesEntries_CreatedAt ON SalesEntries(CreatedAt);

-- ============================================
-- 10. ORDERS TABLE
-- ============================================
CREATE TABLE Orders (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    ShopId INT NOT NULL,
    OrderType NVARCHAR(50) NOT NULL, -- RetailerToMD, MDToDistributor
    ProductName NVARCHAR(255) NOT NULL,
    Quantity INT NOT NULL,
    Remarks NVARCHAR(MAX),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected, Completed
    ApprovedBy INT,
    ApprovalRemarks NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (ShopId) REFERENCES Shops(Id),
    FOREIGN KEY (ApprovedBy) REFERENCES Users(Id)
);

CREATE INDEX IX_Orders_UserId ON Orders(UserId);
CREATE INDEX IX_Orders_ShopId ON Orders(ShopId);
CREATE INDEX IX_Orders_Status ON Orders(Status);
CREATE INDEX IX_Orders_CreatedAt ON Orders(CreatedAt);

-- ============================================
-- 11. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE AuditLogs (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT,
    Action NVARCHAR(255) NOT NULL,
    EntityName NVARCHAR(100),
    EntityId INT,
    Details NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE INDEX IX_AuditLogs_CreatedAt ON AuditLogs(CreatedAt);
CREATE INDEX IX_AuditLogs_UserId ON AuditLogs(UserId);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert Roles
INSERT INTO Roles (Name) VALUES ('Promoter');
INSERT INTO Roles (Name) VALUES ('City Manager');
INSERT INTO Roles (Name) VALUES ('Regional Manager');
INSERT INTO Roles (Name) VALUES ('National Sales Manager');
INSERT INTO Roles (Name) VALUES ('Admin');

-- Insert Regions
INSERT INTO Regions (Name) VALUES ('Central');
INSERT INTO Regions (Name) VALUES ('Western');
INSERT INTO Regions (Name) VALUES ('Eastern');
INSERT INTO Regions (Name) VALUES ('Northern');
INSERT INTO Regions (Name) VALUES ('Southern');

-- Insert Cities
INSERT INTO Cities (RegionId, Name) VALUES (1, 'Riyadh');
INSERT INTO Cities (RegionId, Name) VALUES (1, 'Al-Kharj');
INSERT INTO Cities (RegionId, Name) VALUES (2, 'Jeddah');
INSERT INTO Cities (RegionId, Name) VALUES (2, 'Mecca');
INSERT INTO Cities (RegionId, Name) VALUES (3, 'Dammam');
INSERT INTO Cities (RegionId, Name) VALUES (3, 'Al-Ahsa');
INSERT INTO Cities (RegionId, Name) VALUES (4, 'Tabuk');
INSERT INTO Cities (RegionId, Name) VALUES (5, 'Abha');

-- Insert Admin User (Password should be hashed in production)
INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId, RegionId, CityId, IsActive) 
VALUES ('Admin User', 'admin@fieldforce.com', '+966501234567', 'HASHED_PASSWORD_HERE', 5, 1, 1, 1);

-- Insert NSM
INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId, RegionId, CityId, IsActive) 
VALUES ('National Sales Manager', 'nsm@fieldforce.com', '+966502345678', 'HASHED_PASSWORD_HERE', 4, 1, 1, 1);

-- Insert RM
INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId, RegionId, CityId, IsActive) 
VALUES ('Regional Manager', 'rm@fieldforce.com', '+966503456789', 'HASHED_PASSWORD_HERE', 3, 1, 1, 1);

-- Insert City Managers
INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId, RegionId, CityId, IsActive) 
VALUES ('City Manager', 'cm@fieldforce.com', '+966504567890', 'HASHED_PASSWORD_HERE', 2, 1, 1, 1);

-- Insert Promoters
INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId, RegionId, CityId, IsActive) 
VALUES ('Promoter User', 'promoter@fieldforce.com', '+966505678901', 'HASHED_PASSWORD_HERE', 1, 1, 1, 1);

INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId, RegionId, CityId, IsActive) 
VALUES ('Promoter Two', 'promoter2@fieldforce.com', '+966506789012', 'HASHED_PASSWORD_HERE', 1, 2, 3, 1);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: User details with role, region, city
CREATE VIEW vw_UserDetails AS
SELECT 
    u.Id,
    u.FullName,
    u.Email,
    u.Phone,
    r.Name AS RoleName,
    reg.Name AS RegionName,
    c.Name AS CityName,
    u.IsActive,
    u.CreatedAt
FROM Users u
LEFT JOIN Roles r ON u.RoleId = r.Id
LEFT JOIN Regions reg ON u.RegionId = reg.Id
LEFT JOIN Cities c ON u.CityId = c.Id;

-- View: Shop details with location info
CREATE VIEW vw_ShopDetails AS
SELECT 
    s.Id,
    s.ShopName,
    s.ShopType,
    s.Address,
    c.Name AS CityName,
    reg.Name AS RegionName,
    s.Latitude,
    s.Longitude,
    u.FullName AS AssignedUserName,
    s.IsActive,
    s.CreatedAt
FROM Shops s
LEFT JOIN Cities c ON s.CityId = c.Id
LEFT JOIN Regions reg ON s.RegionId = reg.Id
LEFT JOIN Users u ON s.AssignedUserId = u.Id;

-- View: Visit details with shop and user info
CREATE VIEW vw_VisitDetails AS
SELECT 
    v.Id,
    v.UserId,
    u.FullName AS UserName,
    v.ShopId,
    s.ShopName,
    v.VisitStartTime,
    v.VisitEndTime,
    v.DurationMinutes,
    v.Status,
    (SELECT COUNT(*) FROM VisitPhotos WHERE VisitId = v.Id) AS PhotoCount,
    v.CreatedAt
FROM Visits v
LEFT JOIN Users u ON v.UserId = u.Id
LEFT JOIN Shops s ON v.ShopId = s.Id;

-- ============================================
-- STORED PROCEDURES (OPTIONAL)
-- ============================================

-- Get daily attendance summary
CREATE PROCEDURE sp_GetDailyAttendanceSummary
    @Date DATE
AS
BEGIN
    SELECT 
        CAST(a.CreatedAt AS DATE) AS AttendanceDate,
        COUNT(DISTINCT a.UserId) AS TotalStaff,
        SUM(CASE WHEN a.Status = 'CheckedIn' THEN 1 ELSE 0 END) AS CheckedIn,
        SUM(CASE WHEN a.Status = 'CheckedOut' THEN 1 ELSE 0 END) AS CheckedOut,
        SUM(CASE WHEN a.Status = 'Absent' THEN 1 ELSE 0 END) AS Absent,
        SUM(CASE WHEN a.SelfieUrl IS NOT NULL THEN 1 ELSE 0 END) AS WithSelfie
    FROM Attendance a
    WHERE CAST(a.CreatedAt AS DATE) = @Date
    GROUP BY CAST(a.CreatedAt AS DATE);
END;

-- Get visit compliance report
CREATE PROCEDURE sp_GetVisitComplianceReport
    @DateFrom DATE,
    @DateTo DATE
AS
BEGIN
    SELECT 
        v.Id AS VisitId,
        u.FullName AS UserName,
        s.ShopName,
        v.VisitStartTime,
        v.DurationMinutes,
        (SELECT COUNT(*) FROM VisitPhotos WHERE VisitId = v.Id) AS PhotosUploaded,
        CASE 
            WHEN (SELECT COUNT(*) FROM VisitPhotos WHERE VisitId = v.Id) = 3 THEN 'Compliant'
            ELSE 'Non-Compliant'
        END AS ComplianceStatus
    FROM Visits v
    LEFT JOIN Users u ON v.UserId = u.Id
    LEFT JOIN Shops s ON v.ShopId = s.Id
    WHERE CAST(v.CreatedAt AS DATE) BETWEEN @DateFrom AND @DateTo
    ORDER BY v.CreatedAt DESC;
END;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX IX_Attendance_UserDate ON Attendance(UserId, CAST(CreatedAt AS DATE));
CREATE INDEX IX_SalesEntries_UserDate ON SalesEntries(UserId, CAST(CreatedAt AS DATE));
CREATE INDEX IX_Visits_UserStatus ON Visits(UserId, Status);

-- ============================================
-- 12. COUNTRIES TABLE (NEW - Location Management)
-- ============================================
CREATE TABLE Countries (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Code NVARCHAR(10) NOT NULL UNIQUE,
    PhoneCode NVARCHAR(20),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE()
);

-- ============================================
-- 13. REGIONS TABLE (UPDATED - with Country)
-- ============================================
ALTER TABLE Regions ADD CountryId INT;
ALTER TABLE Regions ADD CONSTRAINT FK_Regions_Countries FOREIGN KEY (CountryId) REFERENCES Countries(Id);
ALTER TABLE Regions ADD Code NVARCHAR(10);
ALTER TABLE Regions ADD IsActive BIT DEFAULT 1;
ALTER TABLE Regions ADD UpdatedAt DATETIME DEFAULT GETUTCDATE();

-- ============================================
-- 14. CITIES TABLE (UPDATED - with Country/Region)
-- ============================================
ALTER TABLE Cities ADD CountryId INT;
ALTER TABLE Cities ADD CONSTRAINT FK_Cities_Countries FOREIGN KEY (CountryId) REFERENCES Countries(Id);
ALTER TABLE Cities ADD Code NVARCHAR(10);
ALTER TABLE Cities ADD IsActive BIT DEFAULT 1;
ALTER TABLE Cities ADD UpdatedAt DATETIME DEFAULT GETUTCDATE();

-- ============================================
-- 15. DEPARTMENTS TABLE (NEW - HR)
-- ============================================
CREATE TABLE Departments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Code NVARCHAR(10),
    Description NVARCHAR(500),
    HeadUserId INT,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (HeadUserId) REFERENCES Users(Id)
);

-- ============================================
-- 16. DESIGNATIONS TABLE (NEW - HR)
-- ============================================
CREATE TABLE Designations (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Code NVARCHAR(10),
    DepartmentId INT,
    [Level] INT DEFAULT 0,
    Description NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
);

-- ============================================
-- 17. EMPLOYEES TABLE (NEW - HR)
-- ============================================
CREATE TABLE Employees (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    EmployeeCode NVARCHAR(20) NOT NULL UNIQUE,
    FullName NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Phone NVARCHAR(20),
    DesignationId INT,
    DepartmentId INT,
    ReportingManagerId INT,
    CountryId INT,
    RegionId INT,
    CityId INT,
    JoinDate DATE NOT NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (DesignationId) REFERENCES Designations(Id),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
    FOREIGN KEY (ReportingManagerId) REFERENCES Employees(Id),
    FOREIGN KEY (CountryId) REFERENCES Countries(Id),
    FOREIGN KEY (RegionId) REFERENCES Regions(Id),
    FOREIGN KEY (CityId) REFERENCES Cities(Id)
);

-- ============================================
-- 18. EMPLOYEE ATTENDANCE TABLE (NEW - HR)
-- ============================================
CREATE TABLE EmployeeAttendance (
    Id INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    [Date] DATE NOT NULL,
    CheckInTime DATETIME,
    CheckOutTime DATETIME,
    CheckInLatitude DECIMAL(10, 8),
    CheckInLongitude DECIMAL(11, 8),
    CheckOutLatitude DECIMAL(10, 8),
    CheckOutLongitude DECIMAL(11, 8),
    WorkingHours DECIMAL(5, 2),
    BreakHours DECIMAL(5, 2),
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'Present',
    IsLate BIT DEFAULT 0,
    LateMinutes INT,
    IsMissingCheckIn BIT DEFAULT 0,
    IsMissingCheckOut BIT DEFAULT 0,
    Remarks NVARCHAR(MAX),
    SelfieUrl NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (EmployeeId) REFERENCES Employees(Id),
    UNIQUE (EmployeeId, [Date])
);

-- ============================================
-- 19. ATTENDANCE CONFIG TABLE (NEW - HR)
-- ============================================
CREATE TABLE AttendanceConfig (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OfficeStartTime NVARCHAR(10) NOT NULL,
    OfficeEndTime NVARCHAR(10) NOT NULL,
    GracePeriodMinutes INT DEFAULT 15,
    LateThresholdMinutes INT DEFAULT 30,
    MinimumWorkingHours DECIMAL(5, 2) DEFAULT 8,
    HalfDayHours DECIMAL(5, 2) DEFAULT 4,
    IsFlexibleTiming BIT DEFAULT 0,
    WorkingDays NVARCHAR(50),
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE()
);

-- ============================================
-- 20. APPROVAL HIERARCHY TABLE (NEW - HR)
-- ============================================
CREATE TABLE ApprovalHierarchies (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    DepartmentId INT,
    [Level] INT NOT NULL,
    ApproverDesignationId INT,
    ApproverUserId INT,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
    FOREIGN KEY (ApproverDesignationId) REFERENCES Designations(Id),
    FOREIGN KEY (ApproverUserId) REFERENCES Users(Id)
);

-- ============================================
-- 21. APPROVAL REQUESTS TABLE (NEW - HR)
-- ============================================
CREATE TABLE ApprovalRequests (
    Id INT PRIMARY KEY IDENTITY(1,1),
    RequestId NVARCHAR(50) NOT NULL UNIQUE,
    RequestType NVARCHAR(50) NOT NULL,
    EmployeeId INT NOT NULL,
    EmployeeName NVARCHAR(255) NOT NULL,
    EmployeeCode NVARCHAR(20) NOT NULL,
    DepartmentId INT,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX),
    StartDate DATE,
    EndDate DATE,
    CurrentLevel INT DEFAULT 1,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    ApprovedBy INT,
    ApprovedByName NVARCHAR(255),
    ApprovalRemarks NVARCHAR(MAX),
    ApprovedAt DATETIME,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (EmployeeId) REFERENCES Employees(Id),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
    FOREIGN KEY (ApprovedBy) REFERENCES Users(Id)
);

-- ============================================
-- 22. APPROVAL HISTORY TABLE (NEW - HR)
-- ============================================
CREATE TABLE ApprovalHistory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    RequestId INT NOT NULL,
    [Level] INT NOT NULL,
    ApproverId INT NOT NULL,
    ApproverName NVARCHAR(255) NOT NULL,
    ApproverDesignation NVARCHAR(100),
    [Action] NVARCHAR(50) NOT NULL,
    Remarks NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (RequestId) REFERENCES ApprovalRequests(Id),
    FOREIGN KEY (ApproverId) REFERENCES Users(Id)
);

-- ============================================
-- SEED DATA FOR NEW TABLES
-- ============================================

-- Seed Countries
INSERT INTO Countries (Name, Code, PhoneCode) VALUES ('Saudi Arabia', 'SA', '+966');
INSERT INTO Countries (Name, Code, PhoneCode) VALUES ('United Arab Emirates', 'AE', '+971');
INSERT INTO Countries (Name, Code, PhoneCode) VALUES ('Qatar', 'QA', '+974');
INSERT INTO Countries (Name, Code, PhoneCode) VALUES ('Kuwait', 'KW', '+965');
INSERT INTO Countries (Name, Code, PhoneCode) VALUES ('Oman', 'OM', '+968');

-- Seed Attendance Config
INSERT INTO AttendanceConfig (OfficeStartTime, OfficeEndTime, GracePeriodMinutes, LateThresholdMinutes, MinimumWorkingHours, HalfDayHours, WorkingDays)
VALUES ('09:00', '18:00', 15, 30, 8.00, 4.00, '0,1,2,3,4');

-- ============================================
-- INDEXES FOR NEW TABLES
-- ============================================
CREATE INDEX IX_EmployeeAttendance_EmployeeId ON EmployeeAttendance(EmployeeId);
CREATE INDEX IX_EmployeeAttendance_Date ON EmployeeAttendance([Date]);
CREATE INDEX IX_ApprovalRequests_Status ON ApprovalRequests([Status]);
CREATE INDEX IX_ApprovalRequests_EmployeeId ON ApprovalRequests(EmployeeId);

-- ============================================
-- END OF SCHEMA
-- ============================================
