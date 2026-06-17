-- ============================================================
--  FIELD FORCE MANAGEMENT SYSTEM — Full MSSQL / T-SQL Script
--  Run in SSMS against your SQL Server instance
--  Database: ffm_v4
--  Generated: 2026-06-05
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ffm_v4')
    CREATE DATABASE [ffm_v4];
GO

USE [ffm_v4];
GO

SET NOCOUNT ON;
GO

-- ============================================================
-- TABLE: roles
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'roles')
CREATE TABLE roles (
    id         INT           PRIMARY KEY IDENTITY(1,1),
    name       NVARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME      DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: countries
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'countries')
CREATE TABLE countries (
    id         INT           PRIMARY KEY IDENTITY(1,1),
    name       NVARCHAR(100) NOT NULL UNIQUE,
    code       NVARCHAR(10)  NOT NULL UNIQUE,
    phone_code NVARCHAR(20)  NULL,
    is_active  BIT           DEFAULT 1,
    created_at DATETIME      DEFAULT GETDATE(),
    updated_at DATETIME      DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: regions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'regions')
CREATE TABLE regions (
    id         INT           PRIMARY KEY IDENTITY(1,1),
    country_id INT           NULL,
    name       NVARCHAR(100) NOT NULL,
    code       NVARCHAR(10)  NULL,
    is_active  BIT           DEFAULT 1,
    created_at DATETIME      DEFAULT GETDATE(),
    updated_at DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_regions_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL,
    CONSTRAINT uq_region_country_name UNIQUE (country_id, name)
);
GO

-- ============================================================
-- TABLE: cities
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cities')
CREATE TABLE cities (
    id         INT           PRIMARY KEY IDENTITY(1,1),
    region_id  INT           NOT NULL,
    country_id INT           NULL,
    name       NVARCHAR(100) NOT NULL,
    code       NVARCHAR(10)  NULL,
    is_active  BIT           DEFAULT 1,
    created_at DATETIME      DEFAULT GETDATE(),
    updated_at DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_cities_region  FOREIGN KEY (region_id)  REFERENCES regions(id)   ON DELETE CASCADE,
    CONSTRAINT fk_cities_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE NO ACTION
);
GO

-- ============================================================
-- TABLE: users
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
CREATE TABLE users (
    id            INT           PRIMARY KEY IDENTITY(1,1),
    full_name     NVARCHAR(255) NOT NULL,
    email         NVARCHAR(255) NOT NULL UNIQUE,
    phone         NVARCHAR(20)  NULL,
    password_hash NVARCHAR(255) NOT NULL,
    role_id       INT           NOT NULL,
    region_id     INT           NULL,
    city_id       INT           NULL,
    is_active     BIT           DEFAULT 1,
    created_at    DATETIME      DEFAULT GETDATE(),
    updated_at    DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_users_role   FOREIGN KEY (role_id)   REFERENCES roles(id),
    CONSTRAINT fk_users_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    CONSTRAINT fk_users_city   FOREIGN KEY (city_id)   REFERENCES cities(id)  ON DELETE NO ACTION
);
GO

-- ============================================================
-- TABLE: shops
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'shops')
CREATE TABLE shops (
    id               INT            PRIMARY KEY IDENTITY(1,1),
    shop_name        NVARCHAR(255)  NOT NULL,
    shop_type        NVARCHAR(100)  NULL,
    address          NVARCHAR(500)  NULL,
    city_id          INT            NULL,
    region_id        INT            NULL,
    latitude         DECIMAL(10,8)  NULL,
    longitude        DECIMAL(11,8)  NULL,
    assigned_user_id INT            NULL,
    is_active        BIT            DEFAULT 1,
    created_at       DATETIME       DEFAULT GETDATE(),
    updated_at       DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_shops_city   FOREIGN KEY (city_id)          REFERENCES cities(id)  ON DELETE NO ACTION,
    CONSTRAINT fk_shops_region FOREIGN KEY (region_id)        REFERENCES regions(id) ON DELETE NO ACTION,
    CONSTRAINT fk_shops_user   FOREIGN KEY (assigned_user_id) REFERENCES users(id)   ON DELETE SET NULL
);
GO

-- ============================================================
-- TABLE: attendance
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'attendance')
CREATE TABLE attendance (
    id                   INT            PRIMARY KEY IDENTITY(1,1),
    user_id              INT            NOT NULL,
    check_in_time        DATETIME       NOT NULL,
    check_out_time       DATETIME       NULL,
    check_in_latitude    DECIMAL(10,8)  NULL,
    check_in_longitude   DECIMAL(11,8)  NULL,
    check_out_latitude   DECIMAL(10,8)  NULL,
    check_out_longitude  DECIMAL(11,8)  NULL,
    selfie_url           NVARCHAR(MAX)  NULL,
    status               NVARCHAR(50)   DEFAULT 'CheckedIn',
    created_at           DATETIME       DEFAULT GETDATE(),
    updated_at           DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- ============================================================
-- TABLE: visits
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'visits')
CREATE TABLE visits (
    id               INT            PRIMARY KEY IDENTITY(1,1),
    user_id          INT            NOT NULL,
    shop_id          INT            NOT NULL,
    visit_start_time DATETIME       NOT NULL,
    visit_end_time   DATETIME       NULL,
    latitude         DECIMAL(10,8)  NULL,
    longitude        DECIMAL(11,8)  NULL,
    duration_minutes INT            NULL,
    remarks          NVARCHAR(MAX)  NULL,
    status           NVARCHAR(50)   DEFAULT 'InProgress',
    created_at       DATETIME       DEFAULT GETDATE(),
    updated_at       DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_visits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_visits_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE NO ACTION
);
GO

-- ============================================================
-- TABLE: visit_photos
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'visit_photos')
CREATE TABLE visit_photos (
    id         INT            PRIMARY KEY IDENTITY(1,1),
    visit_id   INT            NOT NULL,
    photo_type NVARCHAR(50)   NOT NULL,
    photo_url  NVARCHAR(MAX)  NOT NULL,
    created_at DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_visit_photos_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);
GO

-- ============================================================
-- TABLE: sales_entries
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sales_entries')
CREATE TABLE sales_entries (
    id           INT            PRIMARY KEY IDENTITY(1,1),
    user_id      INT            NOT NULL,
    shop_id      INT            NOT NULL,
    product_name NVARCHAR(255)  NOT NULL,
    quantity     INT            NOT NULL,
    amount       DECIMAL(15,2)  NOT NULL,
    remarks      NVARCHAR(MAX)  NULL,
    created_at   DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE NO ACTION
);
GO

-- ============================================================
-- TABLE: orders
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
CREATE TABLE orders (
    id               INT            PRIMARY KEY IDENTITY(1,1),
    user_id          INT            NOT NULL,
    shop_id          INT            NOT NULL,
    order_type       NVARCHAR(50)   NOT NULL,
    product_name     NVARCHAR(255)  NOT NULL,
    quantity         INT            NOT NULL,
    remarks          NVARCHAR(MAX)  NULL,
    status           NVARCHAR(50)   DEFAULT 'Pending',
    approved_by      INT            NULL,
    approval_remarks NVARCHAR(MAX)  NULL,
    created_at       DATETIME       DEFAULT GETDATE(),
    updated_at       DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_orders_user     FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_shop     FOREIGN KEY (shop_id)     REFERENCES shops(id) ON DELETE NO ACTION,
    CONSTRAINT fk_orders_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION
);
GO

-- ============================================================
-- TABLE: departments
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departments')
CREATE TABLE departments (
    id           INT            PRIMARY KEY IDENTITY(1,1),
    name         NVARCHAR(100)  NOT NULL,
    code         NVARCHAR(10)   NULL,
    description  NVARCHAR(500)  NULL,
    head_user_id INT            NULL,
    is_active    BIT            DEFAULT 1,
    created_at   DATETIME       DEFAULT GETDATE(),
    updated_at   DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_dept_head FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL
);
GO

-- ============================================================
-- TABLE: designations
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'designations')
CREATE TABLE designations (
    id            INT            PRIMARY KEY IDENTITY(1,1),
    name          NVARCHAR(100)  NOT NULL,
    code          NVARCHAR(10)   NULL,
    department_id INT            NULL,
    [level]       INT            DEFAULT 0,
    description   NVARCHAR(500)  NULL,
    is_active     BIT            DEFAULT 1,
    created_at    DATETIME       DEFAULT GETDATE(),
    updated_at    DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_desig_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);
GO

-- ============================================================
-- TABLE: employees
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employees')
CREATE TABLE employees (
    id                   INT            PRIMARY KEY IDENTITY(1,1),
    user_id              INT            NULL,
    employee_code        NVARCHAR(20)   NOT NULL UNIQUE,
    full_name            NVARCHAR(255)  NOT NULL,
    email                NVARCHAR(255)  NOT NULL UNIQUE,
    phone                NVARCHAR(20)   NULL,
    designation_id       INT            NULL,
    department_id        INT            NULL,
    reporting_manager_id INT            NULL,
    country_id           INT            NULL,
    region_id            INT            NULL,
    city_id              INT            NULL,
    join_date            DATE           NOT NULL,
    is_active            BIT            DEFAULT 1,
    created_at           DATETIME       DEFAULT GETDATE(),
    updated_at           DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_emp_user    FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE SET NULL,
    CONSTRAINT fk_emp_desig   FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL,
    CONSTRAINT fk_emp_dept    FOREIGN KEY (department_id)  REFERENCES departments(id)  ON DELETE SET NULL,
    CONSTRAINT fk_emp_country FOREIGN KEY (country_id)     REFERENCES countries(id)    ON DELETE NO ACTION,
    CONSTRAINT fk_emp_region  FOREIGN KEY (region_id)      REFERENCES regions(id)      ON DELETE NO ACTION,
    CONSTRAINT fk_emp_city    FOREIGN KEY (city_id)        REFERENCES cities(id)       ON DELETE NO ACTION
);
GO

-- ============================================================
-- TABLE: employee_attendance
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_attendance')
CREATE TABLE employee_attendance (
    id                   INT            PRIMARY KEY IDENTITY(1,1),
    employee_id          INT            NOT NULL,
    [date]               DATE           NOT NULL,
    check_in_time        DATETIME       NULL,
    check_out_time       DATETIME       NULL,
    check_in_latitude    DECIMAL(10,8)  NULL,
    check_in_longitude   DECIMAL(11,8)  NULL,
    check_out_latitude   DECIMAL(10,8)  NULL,
    check_out_longitude  DECIMAL(11,8)  NULL,
    working_hours        DECIMAL(5,2)   NULL,
    [status]             NVARCHAR(50)   DEFAULT 'Present',
    is_late              BIT            DEFAULT 0,
    late_minutes         INT            NULL,
    is_missing_check_in  BIT            DEFAULT 0,
    is_missing_check_out BIT            DEFAULT 0,
    remarks              NVARCHAR(MAX)  NULL,
    selfie_url           NVARCHAR(MAX)  NULL,
    created_at           DATETIME       DEFAULT GETDATE(),
    updated_at           DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_emp_att_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT uq_emp_date UNIQUE (employee_id, [date])
);
GO

-- ============================================================
-- TABLE: attendance_config
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'attendance_config')
CREATE TABLE attendance_config (
    id                     INT            PRIMARY KEY IDENTITY(1,1),
    office_start_time      NVARCHAR(10)   DEFAULT '09:00',
    office_end_time        NVARCHAR(10)   DEFAULT '18:00',
    grace_period_minutes   INT            DEFAULT 15,
    late_threshold_minutes INT            DEFAULT 30,
    minimum_working_hours  DECIMAL(5,2)   DEFAULT 8.00,
    half_day_hours         DECIMAL(5,2)   DEFAULT 4.00,
    is_flexible_timing     BIT            DEFAULT 0,
    working_days           NVARCHAR(50)   DEFAULT '0,1,2,3,4',
    created_at             DATETIME       DEFAULT GETDATE(),
    updated_at             DATETIME       DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: approval_hierarchies
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_hierarchies')
CREATE TABLE approval_hierarchies (
    id                      INT            PRIMARY KEY IDENTITY(1,1),
    name                    NVARCHAR(100)  NOT NULL,
    description             NVARCHAR(500)  NULL,
    department_id           INT            NULL,
    [level]                 INT            NOT NULL,
    approver_designation_id INT            NULL,
    approver_user_id        INT            NULL,
    is_active               BIT            DEFAULT 1,
    created_at              DATETIME       DEFAULT GETDATE(),
    updated_at              DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_ah_dept  FOREIGN KEY (department_id)           REFERENCES departments(id)  ON DELETE SET NULL,
    CONSTRAINT fk_ah_desig FOREIGN KEY (approver_designation_id) REFERENCES designations(id) ON DELETE SET NULL,
    CONSTRAINT fk_ah_user  FOREIGN KEY (approver_user_id)        REFERENCES users(id)        ON DELETE SET NULL
);
GO

-- ============================================================
-- TABLE: approval_requests
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_requests')
CREATE TABLE approval_requests (
    id               INT            PRIMARY KEY IDENTITY(1,1),
    request_id       NVARCHAR(50)   NOT NULL UNIQUE,
    request_type     NVARCHAR(50)   NOT NULL,
    employee_id      INT            NOT NULL,
    employee_name    NVARCHAR(255)  NOT NULL,
    employee_code    NVARCHAR(20)   NOT NULL,
    department_id    INT            NULL,
    title            NVARCHAR(255)  NOT NULL,
    description      NVARCHAR(MAX)  NULL,
    start_date       DATE           NULL,
    end_date         DATE           NULL,
    current_level    INT            DEFAULT 1,
    [status]         NVARCHAR(50)   DEFAULT 'Pending',
    approved_by      INT            NULL,
    approved_by_name NVARCHAR(255)  NULL,
    approval_remarks NVARCHAR(MAX)  NULL,
    approved_at      DATETIME       NULL,
    created_at       DATETIME       DEFAULT GETDATE(),
    updated_at       DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_ar_emp     FOREIGN KEY (employee_id)  REFERENCES employees(id)   ON DELETE CASCADE,
    CONSTRAINT fk_ar_dept    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_ar_approver FOREIGN KEY (approved_by) REFERENCES users(id)       ON DELETE NO ACTION
);
GO

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_logs')
CREATE TABLE audit_logs (
    id          INT            PRIMARY KEY IDENTITY(1,1),
    user_id     INT            NULL,
    [action]    NVARCHAR(255)  NOT NULL,
    entity_name NVARCHAR(100)  NULL,
    entity_id   INT            NULL,
    details     NVARCHAR(MAX)  NULL,
    created_at  DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
GO

-- ============================================================
-- SEED DATA  (skip if already seeded)
-- ============================================================
IF NOT EXISTS (SELECT TOP 1 1 FROM roles)
BEGIN
    INSERT INTO roles (name) VALUES
        ('Promoter'), ('City Manager'), ('Regional Manager'),
        ('National Sales Manager'), ('Admin');

    INSERT INTO countries (name, code, phone_code) VALUES
        ('Pakistan',             'PK', '+92'),
        ('Saudi Arabia',         'SA', '+966'),
        ('United Arab Emirates', 'AE', '+971'),
        ('Qatar',                'QA', '+974'),
        ('Kuwait',               'KW', '+965');

    INSERT INTO regions (country_id, name, code) VALUES
        (1, 'Punjab',       'PJB'),
        (1, 'Sindh',        'SND'),
        (1, 'KPK',          'KPK'),
        (1, 'Balochistan',  'BLO'),
        (1, 'Islamabad',    'ISB'),
        (2, 'Central',      'CE'),
        (2, 'Western',      'WE'),
        (3, 'Dubai Region', 'DU');

    INSERT INTO cities (region_id, country_id, name, code) VALUES
        (1, 1, 'Lahore',     'LHR'),
        (1, 1, 'Faisalabad', 'FSD'),
        (1, 1, 'Multan',     'MUL'),
        (1, 1, 'Rawalpindi', 'RWP'),
        (2, 1, 'Karachi',    'KHI'),
        (2, 1, 'Hyderabad',  'HYD'),
        (3, 1, 'Peshawar',   'PEW'),
        (4, 1, 'Quetta',     'UET'),
        (5, 1, 'Islamabad',  'ISB'),
        (6, 2, 'Riyadh',     'RYD'),
        (7, 2, 'Jeddah',     'JED'),
        (8, 3, 'Dubai',      'DXB');

    -- Passwords (bcrypt cost=10):
    --   Admin@123, Nsm@123, Rm@123, Cm@123, Promoter@123
    INSERT INTO users (full_name, email, phone, password_hash, role_id, region_id, city_id, is_active) VALUES
        ('Ahmed Admin',    'admin@fieldforce.com',     '+92-300-0000001', '$2a$10$WOovlTSJqkBoStoHjEpjbe60tpkTpU3t5pY5aBPdH45MwnxW4g5V2', 5, 1, 1, 1),
        ('Muhammad NSM',   'nsm@fieldforce.com',       '+92-300-0000002', '$2a$10$Wtlax77ttXd/YiZoooCctO34UF.3vWEJT5sAh4PN3nsqHC7kJ1nim', 4, 1, 1, 1),
        ('Khalid RM',      'rm@fieldforce.com',        '+92-300-0000003', '$2a$10$g53mfmwhDmmLfUiNyImIVeB64qevIF/kK1uix9r/ojyq0.gIB8Vn.', 3, 1, 1, 1),
        ('Fahad CM',       'cm@fieldforce.com',        '+92-300-0000004', '$2a$10$kPCGz7P7KE/0NxNszy4GjetJJLSLQQhQMyZy9h3nUeesI6mExPMiO', 2, 1, 1, 1),
        ('Omar Promoter',  'promoter@fieldforce.com',  '+92-300-0000005', '$2a$10$h.V/QM3Nzu.UiEXQqH3OKuMvEZ4id6hHN7AisgesoXeLWmG4BaDF2', 1, 1, 1, 1),
        ('Saad Promoter',  'promoter2@fieldforce.com', '+92-300-0000006', '$2a$10$h.V/QM3Nzu.UiEXQqH3OKuMvEZ4id6hHN7AisgesoXeLWmG4BaDF2', 1, 2, 5, 1),
        ('Nawaf CM',       'cm2@fieldforce.com',       '+92-300-0000007', '$2a$10$kPCGz7P7KE/0NxNszy4GjetJJLSLQQhQMyZy9h3nUeesI6mExPMiO', 2, 2, 5, 0),
        ('Turki Promoter', 'promoter3@fieldforce.com', '+92-300-0000008', '$2a$10$h.V/QM3Nzu.UiEXQqH3OKuMvEZ4id6hHN7AisgesoXeLWmG4BaDF2', 1, 3, 7, 1);

    INSERT INTO shops (shop_name,shop_type,address,city_id,region_id,latitude,longitude,assigned_user_id,is_active) VALUES
        ('Al-Noor Electronics',    'Electronics','Mall Road, Lahore',         1,1,31.5204,74.3587,5,1),
        ('Hafeez Mobile',          'Mobile',     'Gulberg III, Lahore',        1,1,31.5117,74.3281,5,1),
        ('Karachi Digital Hub',    'Electronics','Tariq Road, Karachi',        5,2,24.8607,67.0011,6,1),
        ('Peshawar Tech Store',    'Digital',    'University Road, Peshawar',  7,3,34.0150,71.5249,8,1),
        ('Islamabad Smart Center', 'Electronics','Blue Area, Islamabad',       9,5,33.7294,73.0931,5,1),
        ('Faisalabad Electronics', 'Electronics','D Ground, Faisalabad',       2,1,31.4180,73.0790,5,0);

    INSERT INTO departments (name,code,description,head_user_id,is_active) VALUES
        ('Sales',         'SLS','Sales and Business Development',2,1),
        ('HR',            'HR', 'Human Resources',               1,1),
        ('Administration','ADM','Administrative Services',        1,1),
        ('Operations',    'OPS','Field Operations',               3,1),
        ('Finance',       'FIN','Finance and Accounting',         NULL,1);

    INSERT INTO designations (name,code,department_id,[level],description,is_active) VALUES
        ('Manager',   'MGR',1,4,'Department Manager',   1),
        ('Supervisor','SUP',1,3,'Team Supervisor',      1),
        ('Team Lead', 'TL', 1,2,'Team Leader',          1),
        ('Executive', 'EXE',1,1,'Sales Executive',      1),
        ('Staff',     'STF',1,0,'Support Staff',        1),
        ('HR Manager','HRM',2,4,'HR Department Manager',1),
        ('Admin',     'ADM',3,5,'System Administrator', 1);

    INSERT INTO employees (user_id,employee_code,full_name,email,phone,designation_id,department_id,reporting_manager_id,country_id,region_id,city_id,join_date,is_active) VALUES
        (1,'EMP001','Ahmed Admin',   'admin@fieldforce.com',    '+92-300-0000001',7,3,NULL,1,1,1,'2024-01-01',1),
        (2,'EMP002','Muhammad NSM',  'nsm@fieldforce.com',      '+92-300-0000002',1,1,1,  1,1,1,'2024-01-02',1),
        (3,'EMP003','Khalid RM',     'rm@fieldforce.com',       '+92-300-0000003',1,4,2,  1,1,1,'2024-01-03',1),
        (4,'EMP004','Fahad CM',      'cm@fieldforce.com',       '+92-300-0000004',2,1,3,  1,1,1,'2024-01-04',1),
        (5,'EMP005','Omar Promoter', 'promoter@fieldforce.com', '+92-300-0000005',4,1,4,  1,1,1,'2024-01-05',1),
        (6,'EMP006','Saad Promoter', 'promoter2@fieldforce.com','+92-300-0000006',4,1,4,  1,2,5,'2024-01-06',1),
        (8,'EMP007','Turki Promoter','promoter3@fieldforce.com','+92-300-0000008',4,1,4,  1,3,7,'2024-01-08',1);

    INSERT INTO attendance_config (office_start_time,office_end_time,grace_period_minutes,late_threshold_minutes,minimum_working_hours,half_day_hours,working_days)
        VALUES ('09:00','18:00',15,30,8.00,4.00,'0,1,2,3,4');

    PRINT '✅ Seed data inserted successfully';
END
ELSE
    PRINT 'ℹ️  Seed data already exists, skipped.';
GO

PRINT '✅ ffm_v4 database setup complete!';
PRINT '   Admin : admin@fieldforce.com    / Admin@123';
PRINT '   NSM   : nsm@fieldforce.com      / Nsm@123';
PRINT '   RM    : rm@fieldforce.com       / Rm@123';
PRINT '   CM    : cm@fieldforce.com       / Cm@123';
PRINT '   Field : promoter@fieldforce.com / Promoter@123';
GO
