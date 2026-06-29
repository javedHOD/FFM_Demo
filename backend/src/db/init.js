const { getPool, query } = require('./connection');
const bcrypt = require('bcryptjs');

const createTables = async () => {
  // All 19 tables in a single network round-trip using IF NOT EXISTS guards
  const pool = await getPool();
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='roles')
    CREATE TABLE roles (
      id         INT           PRIMARY KEY IDENTITY(1,1),
      name       NVARCHAR(100) NOT NULL UNIQUE,
      created_at DATETIME      DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='countries')
    CREATE TABLE countries (
      id         INT           PRIMARY KEY IDENTITY(1,1),
      name       NVARCHAR(100) NOT NULL UNIQUE,
      code       NVARCHAR(10)  NOT NULL UNIQUE,
      phone_code NVARCHAR(20)  NULL,
      is_active  BIT           DEFAULT 1,
      created_at DATETIME      DEFAULT GETDATE(),
      updated_at DATETIME      DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='regions')
    CREATE TABLE regions (
      id         INT           PRIMARY KEY IDENTITY(1,1),
      country_id INT           NULL,
      name       NVARCHAR(100) NOT NULL,
      code       NVARCHAR(10)  NULL,
      is_active  BIT           DEFAULT 1,
      created_at DATETIME      DEFAULT GETDATE(),
      updated_at DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_regions_country      FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL,
      CONSTRAINT uq_region_country_name  UNIQUE (country_id, name)
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='cities')
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

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='users')
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

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='shops')
    CREATE TABLE shops (
      id               INT           PRIMARY KEY IDENTITY(1,1),
      shop_name        NVARCHAR(255) NOT NULL,
      shop_type        NVARCHAR(100) NULL,
      address          NVARCHAR(500) NULL,
      city_id          INT           NULL,
      region_id        INT           NULL,
      latitude         DECIMAL(10,8) NULL,
      longitude        DECIMAL(11,8) NULL,
      assigned_user_id INT           NULL,
      contact_person   NVARCHAR(255) NULL,
      contact_no       NVARCHAR(50)  NULL,
      contact_no_2     NVARCHAR(50)  NULL,
      ntn_no           NVARCHAR(100) NULL,
      is_active        BIT           DEFAULT 1,
      created_at       DATETIME      DEFAULT GETDATE(),
      updated_at       DATETIME      DEFAULT GETDATE(),
      CONSTRAINT uq_shops_shop_name UNIQUE (shop_name),
      CONSTRAINT fk_shops_city   FOREIGN KEY (city_id)          REFERENCES cities(id)  ON DELETE NO ACTION,
      CONSTRAINT fk_shops_region FOREIGN KEY (region_id)        REFERENCES regions(id) ON DELETE NO ACTION,
      CONSTRAINT fk_shops_user   FOREIGN KEY (assigned_user_id) REFERENCES users(id)   ON DELETE SET NULL
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='user_regions')
    CREATE TABLE user_regions (
      user_id    INT NOT NULL,
      region_id  INT NOT NULL,
      created_at DATETIME DEFAULT GETDATE(),
      CONSTRAINT pk_user_regions PRIMARY KEY (user_id, region_id),
      CONSTRAINT fk_user_regions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_regions_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='attendance')
    CREATE TABLE attendance (
      id                   INT           PRIMARY KEY IDENTITY(1,1),
      user_id              INT           NOT NULL,
      check_in_time        DATETIME      NOT NULL,
      check_out_time       DATETIME      NULL,
      check_in_latitude    DECIMAL(10,8) NULL,
      check_in_longitude   DECIMAL(11,8) NULL,
      check_out_latitude   DECIMAL(10,8) NULL,
      check_out_longitude  DECIMAL(11,8) NULL,
      selfie_url           NVARCHAR(MAX) NULL,
      status               NVARCHAR(50)  DEFAULT 'CheckedIn',
      created_at           DATETIME      DEFAULT GETDATE(),
      updated_at           DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='visits')
    CREATE TABLE visits (
      id               INT           PRIMARY KEY IDENTITY(1,1),
      user_id          INT           NOT NULL,
      shop_id          INT           NOT NULL,
      visit_start_time DATETIME      NOT NULL,
      visit_end_time   DATETIME      NULL,
      latitude         DECIMAL(10,8) NULL,
      longitude        DECIMAL(11,8) NULL,
      duration_minutes INT           NULL,
      remarks          NVARCHAR(MAX) NULL,
      status           NVARCHAR(50)  DEFAULT 'InProgress',
      created_at       DATETIME      DEFAULT GETDATE(),
      updated_at       DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_visits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_visits_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE NO ACTION
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='visit_photos')
    CREATE TABLE visit_photos (
      id         INT           PRIMARY KEY IDENTITY(1,1),
      visit_id   INT           NOT NULL,
      photo_type NVARCHAR(50)  NOT NULL,
      photo_url  NVARCHAR(MAX) NOT NULL,
      created_at DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_visit_photos_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='sales_entries')
    CREATE TABLE sales_entries (
      id           INT           PRIMARY KEY IDENTITY(1,1),
      user_id      INT           NOT NULL,
      shop_id      INT           NOT NULL,
      product_name NVARCHAR(255) NOT NULL,
      quantity     INT           NOT NULL,
      amount       DECIMAL(15,2) NOT NULL,
      remarks      NVARCHAR(MAX) NULL,
      created_at   DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_sales_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE NO ACTION
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='orders')
    CREATE TABLE orders (
      id               INT           PRIMARY KEY IDENTITY(1,1),
      user_id          INT           NOT NULL,
      shop_id          INT           NOT NULL,
      order_type       NVARCHAR(50)  NOT NULL,
      product_name     NVARCHAR(255) NOT NULL,
      quantity         INT           NOT NULL,
      remarks          NVARCHAR(MAX) NULL,
      status           NVARCHAR(50)  DEFAULT 'Pending',
      approved_by      INT           NULL,
      approval_remarks NVARCHAR(MAX) NULL,
      created_at       DATETIME      DEFAULT GETDATE(),
      updated_at       DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_orders_user     FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_orders_shop     FOREIGN KEY (shop_id)     REFERENCES shops(id) ON DELETE NO ACTION,
      CONSTRAINT fk_orders_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='order_items')
    CREATE TABLE order_items (
      id               INT           PRIMARY KEY IDENTITY(1,1),
      order_id         INT           NOT NULL,
      product_name     NVARCHAR(255) NOT NULL,
      quantity         INT           NOT NULL,
      status           NVARCHAR(50)  DEFAULT 'Pending',
      approved_by      INT           NULL,
      approval_remarks NVARCHAR(MAX) NULL,
      created_at       DATETIME      DEFAULT GETDATE(),
      updated_at       DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_order_items_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='departments')
    CREATE TABLE departments (
      id           INT           PRIMARY KEY IDENTITY(1,1),
      name         NVARCHAR(100) NOT NULL,
      code         NVARCHAR(10)  NULL,
      description  NVARCHAR(500) NULL,
      head_user_id INT           NULL,
      is_active    BIT           DEFAULT 1,
      created_at   DATETIME      DEFAULT GETDATE(),
      updated_at   DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_dept_head FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='designations')
    CREATE TABLE designations (
      id            INT           PRIMARY KEY IDENTITY(1,1),
      name          NVARCHAR(100) NOT NULL,
      code          NVARCHAR(10)  NULL,
      department_id INT           NULL,
      [level]       INT           DEFAULT 0,
      description   NVARCHAR(500) NULL,
      is_active     BIT           DEFAULT 1,
      created_at    DATETIME      DEFAULT GETDATE(),
      updated_at    DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_desig_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='employees')
    CREATE TABLE employees (
      id                   INT           PRIMARY KEY IDENTITY(1,1),
      user_id              INT           NULL,
      employee_code        NVARCHAR(20)  NOT NULL UNIQUE,
      full_name            NVARCHAR(255) NOT NULL,
      email                NVARCHAR(255) NOT NULL UNIQUE,
      phone                NVARCHAR(20)  NULL,
      designation_id       INT           NULL,
      department_id        INT           NULL,
      reporting_manager_id INT           NULL,
      country_id           INT           NULL,
      region_id            INT           NULL,
      city_id              INT           NULL,
      join_date            DATE          NOT NULL,
      is_active            BIT           DEFAULT 1,
      created_at           DATETIME      DEFAULT GETDATE(),
      updated_at           DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_emp_user    FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE SET NULL,
      CONSTRAINT fk_emp_desig   FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL,
      CONSTRAINT fk_emp_dept    FOREIGN KEY (department_id)  REFERENCES departments(id)  ON DELETE SET NULL,
      CONSTRAINT fk_emp_country FOREIGN KEY (country_id)     REFERENCES countries(id)    ON DELETE NO ACTION,
      CONSTRAINT fk_emp_region  FOREIGN KEY (region_id)      REFERENCES regions(id)      ON DELETE NO ACTION,
      CONSTRAINT fk_emp_city    FOREIGN KEY (city_id)        REFERENCES cities(id)       ON DELETE NO ACTION
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='employee_attendance')
    CREATE TABLE employee_attendance (
      id                   INT           PRIMARY KEY IDENTITY(1,1),
      employee_id          INT           NOT NULL,
      [date]               DATE          NOT NULL,
      check_in_time        DATETIME      NULL,
      check_out_time       DATETIME      NULL,
      check_in_latitude    DECIMAL(10,8) NULL,
      check_in_longitude   DECIMAL(11,8) NULL,
      check_out_latitude   DECIMAL(10,8) NULL,
      check_out_longitude  DECIMAL(11,8) NULL,
      working_hours        DECIMAL(5,2)  NULL,
      [status]             NVARCHAR(50)  DEFAULT 'Present',
      is_late              BIT           DEFAULT 0,
      late_minutes         INT           NULL,
      is_missing_check_in  BIT           DEFAULT 0,
      is_missing_check_out BIT           DEFAULT 0,
      remarks              NVARCHAR(MAX) NULL,
      selfie_url           NVARCHAR(MAX) NULL,
      created_at           DATETIME      DEFAULT GETDATE(),
      updated_at           DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_emp_att_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      CONSTRAINT uq_emp_date    UNIQUE (employee_id, [date])
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='attendance_config')
    CREATE TABLE attendance_config (
      id                     INT           PRIMARY KEY IDENTITY(1,1),
      office_start_time      NVARCHAR(10)  DEFAULT '09:00',
      office_end_time        NVARCHAR(10)  DEFAULT '18:00',
      grace_period_minutes   INT           DEFAULT 15,
      late_threshold_minutes INT           DEFAULT 30,
      minimum_working_hours  DECIMAL(5,2)  DEFAULT 8.00,
      half_day_hours         DECIMAL(5,2)  DEFAULT 4.00,
      is_flexible_timing     BIT           DEFAULT 0,
      working_days           NVARCHAR(50)  DEFAULT '0,1,2,3,4',
      created_at             DATETIME      DEFAULT GETDATE(),
      updated_at             DATETIME      DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='approval_hierarchies')
    CREATE TABLE approval_hierarchies (
      id                      INT           PRIMARY KEY IDENTITY(1,1),
      name                    NVARCHAR(100) NOT NULL,
      description             NVARCHAR(500) NULL,
      department_id           INT           NULL,
      [level]                 INT           NOT NULL,
      approver_designation_id INT           NULL,
      approver_user_id        INT           NULL,
      is_active               BIT           DEFAULT 1,
      created_at              DATETIME      DEFAULT GETDATE(),
      updated_at              DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_ah_dept  FOREIGN KEY (department_id)           REFERENCES departments(id)  ON DELETE SET NULL,
      CONSTRAINT fk_ah_desig FOREIGN KEY (approver_designation_id) REFERENCES designations(id) ON DELETE SET NULL,
      CONSTRAINT fk_ah_user  FOREIGN KEY (approver_user_id)        REFERENCES users(id)        ON DELETE SET NULL
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='approval_requests')
    CREATE TABLE approval_requests (
      id               INT           PRIMARY KEY IDENTITY(1,1),
      request_id       NVARCHAR(50)  NOT NULL UNIQUE,
      request_type     NVARCHAR(50)  NOT NULL,
      employee_id      INT           NOT NULL,
      employee_name    NVARCHAR(255) NOT NULL,
      employee_code    NVARCHAR(20)  NOT NULL,
      department_id    INT           NULL,
      title            NVARCHAR(255) NOT NULL,
      description      NVARCHAR(MAX) NULL,
      start_date       DATE          NULL,
      end_date         DATE          NULL,
      current_level    INT           DEFAULT 1,
      [status]         NVARCHAR(50)  DEFAULT 'Pending',
      approved_by      INT           NULL,
      approved_by_name NVARCHAR(255) NULL,
      approval_remarks NVARCHAR(MAX) NULL,
      approved_at      DATETIME      NULL,
      created_at       DATETIME      DEFAULT GETDATE(),
      updated_at       DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_ar_emp      FOREIGN KEY (employee_id)   REFERENCES employees(id)   ON DELETE CASCADE,
      CONSTRAINT fk_ar_dept     FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      CONSTRAINT fk_ar_approver FOREIGN KEY (approved_by)   REFERENCES users(id)       ON DELETE NO ACTION
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='shifts')
    CREATE TABLE shifts (
      id              INT           PRIMARY KEY IDENTITY(1,1),
      title           NVARCHAR(100) NOT NULL,
      start_time      NVARCHAR(10)  NOT NULL,
      late_start_time NVARCHAR(10)  NOT NULL,
      early_go_time   NVARCHAR(10)  NOT NULL,
      end_time        NVARCHAR(10)  NOT NULL,
      is_active       BIT           DEFAULT 1,
      created_at      DATETIME      DEFAULT GETDATE(),
      updated_at      DATETIME      DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='audit_logs')
    CREATE TABLE audit_logs (
      id          INT           PRIMARY KEY IDENTITY(1,1),
      user_id     INT           NULL,
      [action]    NVARCHAR(255) NOT NULL,
      entity_name NVARCHAR(100) NULL,
      entity_id   INT           NULL,
      details     NVARCHAR(MAX) NULL,
      created_at  DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  console.log('✅ All tables created/verified');
};

const seedData = async () => {
  const { recordset: roleRows } = await query('SELECT COUNT(*) as count FROM roles');
  if (roleRows[0].count > 0) {
    console.log('ℹ️  Seed data already exists, skipping...');
    return;
  }

  console.log('🌱 Seeding demo data...');

  // Roles
  await query(`INSERT INTO roles (name) VALUES ('Promoter'), ('City Manager'), ('Regional Manager'), ('National Sales Manager'), ('Admin')`);

  // Countries
  await query(`
    INSERT INTO countries (name, code, phone_code) VALUES
    ('Pakistan',             'PK', '+92'),
    ('Saudi Arabia',         'SA', '+966'),
    ('United Arab Emirates', 'AE', '+971'),
    ('Qatar',                'QA', '+974'),
    ('Kuwait',               'KW', '+965')
  `);

  // Regions (Pakistan = id 1)
  await query(`
    INSERT INTO regions (country_id, name, code) VALUES
    (1, 'Punjab',      'PJB'),
    (1, 'Sindh',       'SND'),
    (1, 'KPK',         'KPK'),
    (1, 'Balochistan', 'BLO'),
    (1, 'Islamabad',   'ISB'),
    (2, 'Central',     'CE'),
    (2, 'Western',     'WE'),
    (3, 'Dubai Region','DU')
  `);

  // Cities
  await query(`
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
    (8, 3, 'Dubai',      'DXB')
  `);

  // Users (pre-hashed with bcrypt cost 10)
  const adminHash    = await bcrypt.hash('Admin@123',    10);
  const nsmHash      = await bcrypt.hash('Nsm@123',      10);
  const rmHash       = await bcrypt.hash('Rm@123',       10);
  const cmHash       = await bcrypt.hash('Cm@123',       10);
  const promoterHash = await bcrypt.hash('Promoter@123', 10);

  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Ahmed Admin',    'admin@fieldforce.com',     '+92-300-0000001', adminHash,    5, 1, 1, 1]);
  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Muhammad NSM',   'nsm@fieldforce.com',       '+92-300-0000002', nsmHash,      4, 1, 1, 1]);
  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Khalid RM',      'rm@fieldforce.com',        '+92-300-0000003', rmHash,       3, 1, 1, 1]);
  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Fahad CM',       'cm@fieldforce.com',        '+92-300-0000004', cmHash,       2, 1, 1, 1]);
  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Omar Promoter',  'promoter@fieldforce.com',  '+92-300-0000005', promoterHash, 1, 1, 1, 1]);
  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Saad Promoter',  'promoter2@fieldforce.com', '+92-300-0000006', promoterHash, 1, 2, 5, 1]);
  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Nawaf CM',       'cm2@fieldforce.com',       '+92-300-0000007', cmHash,       2, 2, 5, 0]);
  await query(`INSERT INTO users (full_name,email,phone,password_hash,role_id,region_id,city_id,is_active) VALUES (?,?,?,?,?,?,?,?)`, ['Turki Promoter', 'promoter3@fieldforce.com', '+92-300-0000008', promoterHash, 1, 3, 7, 1]);

  // Promoter multi-region assignments
  await query(`INSERT INTO user_regions (user_id, region_id) VALUES (5,1), (5,5), (6,2), (8,3)`);

  // Shops
  await query(`INSERT INTO shops (shop_name,shop_type,address,city_id,region_id,latitude,longitude,assigned_user_id,contact_person,contact_no,contact_no_2,ntn_no,is_active) VALUES
    ('Al-Noor Electronics',    'Electronics', 'Mall Road, Lahore',         1,1,31.5204,74.3587,5,'Ali Raza','0300-1111111','042-111111','NTN-001',1),
    ('Hafeez Mobile',          'Mobile',      'Gulberg III, Lahore',        1,1,31.5117,74.3281,5,'Hafeez Khan','0300-2222222',NULL,'NTN-002',1),
    ('Karachi Digital Hub',    'Electronics', 'Tariq Road, Karachi',        5,2,24.8607,67.0011,6,'Bilal Ahmed','0300-3333333',NULL,'NTN-003',1),
    ('Peshawar Tech Store',    'Digital',     'University Road, Peshawar',  7,3,34.0150,71.5249,8,'Hamza Khan','0300-4444444',NULL,'NTN-004',1),
    ('Islamabad Smart Center', 'Electronics', 'Blue Area, Islamabad',       9,5,33.7294,73.0931,5,'Usman Malik','0300-5555555',NULL,'NTN-005',1),
    ('Faisalabad Electronics', 'Electronics', 'D Ground, Faisalabad',       2,1,31.4180,73.0790,5,'Asad Ali','0300-6666666',NULL,'NTN-006',0)`);

  // Departments
  await query(`INSERT INTO departments (name,code,description,head_user_id,is_active) VALUES
    ('Sales',          'SLS', 'Sales and Business Development', 2, 1),
    ('HR',             'HR',  'Human Resources',                1, 1),
    ('Administration', 'ADM', 'Administrative Services',        1, 1),
    ('Operations',     'OPS', 'Field Operations',               3, 1),
    ('Finance',        'FIN', 'Finance and Accounting',         NULL, 1)`);

  // Designations
  await query(`INSERT INTO designations (name,code,department_id,[level],description,is_active) VALUES
    ('Manager',    'MGR', 1, 4, 'Department Manager',    1),
    ('Supervisor', 'SUP', 1, 3, 'Team Supervisor',       1),
    ('Team Lead',  'TL',  1, 2, 'Team Leader',           1),
    ('Executive',  'EXE', 1, 1, 'Sales Executive',       1),
    ('Staff',      'STF', 1, 0, 'Support Staff',         1),
    ('HR Manager', 'HRM', 2, 4, 'HR Department Manager', 1),
    ('Admin',      'ADM', 3, 5, 'System Administrator',  1)`);

  // Employees
  await query(`INSERT INTO employees (user_id,employee_code,full_name,email,phone,designation_id,department_id,reporting_manager_id,country_id,region_id,city_id,join_date,is_active) VALUES
    (1,'EMP001','Ahmed Admin',    'admin@fieldforce.com',     '+92-300-0000001',7,3,NULL,1,1,1,'2024-01-01',1),
    (2,'EMP002','Muhammad NSM',   'nsm@fieldforce.com',       '+92-300-0000002',1,1,1,   1,1,1,'2024-01-02',1),
    (3,'EMP003','Khalid RM',      'rm@fieldforce.com',        '+92-300-0000003',1,4,2,   1,1,1,'2024-01-03',1),
    (4,'EMP004','Fahad CM',       'cm@fieldforce.com',        '+92-300-0000004',2,1,3,   1,1,1,'2024-01-04',1),
    (5,'EMP005','Omar Promoter',  'promoter@fieldforce.com',  '+92-300-0000005',4,1,4,   1,1,1,'2024-01-05',1),
    (6,'EMP006','Saad Promoter',  'promoter2@fieldforce.com', '+92-300-0000006',4,1,4,   1,2,5,'2024-01-06',1),
    (8,'EMP007','Turki Promoter', 'promoter3@fieldforce.com', '+92-300-0000008',4,1,4,   1,3,7,'2024-01-08',1)`);

  // Attendance Config
  await query(`INSERT INTO attendance_config (office_start_time,office_end_time,grace_period_minutes,late_threshold_minutes,minimum_working_hours,half_day_hours,working_days)
    VALUES ('09:00','18:00',15,30,8.00,4.00,'0,1,2,3,4')`);

  console.log('✅ Demo data seeded successfully');
  console.log('   👤 Admin : admin@fieldforce.com    / Admin@123');
  console.log('   👤 NSM   : nsm@fieldforce.com      / Nsm@123');
  console.log('   👤 RM    : rm@fieldforce.com       / Rm@123');
  console.log('   👤 CM    : cm@fieldforce.com       / Cm@123');
  console.log('   👤 Field : promoter@fieldforce.com / Promoter@123');
};

const runMigrations = async () => {
  const pool = await getPool();

  // Add missing columns to existing tables (safe to run multiple times)
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('regions') AND name = 'country_id')
      ALTER TABLE regions ADD country_id INT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('regions') AND name = 'code')
      ALTER TABLE regions ADD code NVARCHAR(10) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('regions') AND name = 'is_active')
      ALTER TABLE regions ADD is_active BIT NOT NULL DEFAULT 1;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('regions') AND name = 'updated_at')
      ALTER TABLE regions ADD updated_at DATETIME DEFAULT GETDATE();

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cities') AND name = 'country_id')
      ALTER TABLE cities ADD country_id INT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cities') AND name = 'code')
      ALTER TABLE cities ADD code NVARCHAR(10) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cities') AND name = 'is_active')
      ALTER TABLE cities ADD is_active BIT NOT NULL DEFAULT 1;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cities') AND name = 'updated_at')
      ALTER TABLE cities ADD updated_at DATETIME DEFAULT GETDATE();

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'updated_at')
      ALTER TABLE users ADD updated_at DATETIME DEFAULT GETDATE();
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'updated_at')
      ALTER TABLE shops ADD updated_at DATETIME DEFAULT GETDATE();
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'contact_person')
      ALTER TABLE shops ADD contact_person NVARCHAR(255) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'contact_no')
      ALTER TABLE shops ADD contact_no NVARCHAR(50) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'contact_no_2')
      ALTER TABLE shops ADD contact_no_2 NVARCHAR(50) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'ntn_no')
      ALTER TABLE shops ADD ntn_no NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('attendance') AND name = 'updated_at')
      ALTER TABLE attendance ADD updated_at DATETIME DEFAULT GETDATE();
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('visits') AND name = 'updated_at')
      ALTER TABLE visits ADD updated_at DATETIME DEFAULT GETDATE();
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'updated_at')
      ALTER TABLE orders ADD updated_at DATETIME DEFAULT GETDATE();

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('employees') AND name = 'shift_id')
      ALTER TABLE employees ADD shift_id INT NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='user_regions')
    CREATE TABLE user_regions (
      user_id    INT NOT NULL,
      region_id  INT NOT NULL,
      created_at DATETIME DEFAULT GETDATE(),
      CONSTRAINT pk_user_regions PRIMARY KEY (user_id, region_id),
      CONSTRAINT fk_user_regions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_regions_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
    );

    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='order_items')
    CREATE TABLE order_items (
      id               INT           PRIMARY KEY IDENTITY(1,1),
      order_id         INT           NOT NULL,
      product_name     NVARCHAR(255) NOT NULL,
      quantity         INT           NOT NULL,
      status           NVARCHAR(50)  DEFAULT 'Pending',
      approved_by      INT           NULL,
      approval_remarks NVARCHAR(MAX) NULL,
      created_at       DATETIME      DEFAULT GETDATE(),
      updated_at       DATETIME      DEFAULT GETDATE(),
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_order_items_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION
    );
  `);

  // Fix any NULL is_active values from previous nullable column add
  await pool.request().batch(`
    UPDATE regions SET is_active = 1 WHERE is_active IS NULL;
    UPDATE cities  SET is_active = 1 WHERE is_active IS NULL;
  `);

  // Backfill order_items for existing single-line orders.
  await pool.request().batch(`
    INSERT INTO order_items (order_id, product_name, quantity)
    SELECT o.id, o.product_name, o.quantity
    FROM orders o
    WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
      AND o.product_name IS NOT NULL
      AND o.quantity IS NOT NULL;
  `);

  // Per-item approval columns for order_items (split batches — SQL Server validates column names at compile time)
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('order_items') AND name = 'status')
      ALTER TABLE order_items ADD status NVARCHAR(50) NOT NULL CONSTRAINT DF_order_items_status DEFAULT 'Pending';

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('order_items') AND name = 'approved_by')
      ALTER TABLE order_items ADD approved_by INT NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('order_items') AND name = 'approval_remarks')
      ALTER TABLE order_items ADD approval_remarks NVARCHAR(MAX) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('order_items') AND name = 'updated_at')
      ALTER TABLE order_items ADD updated_at DATETIME NULL CONSTRAINT DF_order_items_updated_at DEFAULT GETDATE();
  `);

  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_order_items_approver')
      ALTER TABLE order_items ADD CONSTRAINT fk_order_items_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION;
  `);

  await pool.request().batch(`
    UPDATE oi
    SET oi.status = o.status
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    WHERE o.status IN ('Approved', 'Rejected', 'Completed')
      AND oi.status = 'Pending';
  `);

  // Allow Partially Approved on orders.status (required for per-item approvals)
  await pool.request().batch(`
    IF EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CHK_orders_status' AND parent_object_id = OBJECT_ID('orders')
    )
      ALTER TABLE orders DROP CONSTRAINT CHK_orders_status;
  `);

  await pool.request().batch(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CHK_orders_status' AND parent_object_id = OBJECT_ID('orders')
    )
      ALTER TABLE orders ADD CONSTRAINT CHK_orders_status
        CHECK ([status] IN ('Pending', 'Approved', 'Rejected', 'Completed', 'Partially Approved'));
  `);

  await pool.request().batch(`
    IF EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CHK_order_items_status' AND parent_object_id = OBJECT_ID('order_items')
    )
      ALTER TABLE order_items DROP CONSTRAINT CHK_order_items_status;
  `);

  await pool.request().batch(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CHK_order_items_status' AND parent_object_id = OBJECT_ID('order_items')
    )
      ALTER TABLE order_items ADD CONSTRAINT CHK_order_items_status
        CHECK ([status] IN ('Pending', 'Approved', 'Rejected'));
  `);

  // Add unique shop-name validation at DB level when existing data allows it.
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_shops_shop_name' AND object_id = OBJECT_ID('shops'))
       AND NOT EXISTS (SELECT shop_name FROM shops GROUP BY shop_name HAVING COUNT(*) > 1)
      CREATE UNIQUE INDEX UX_shops_shop_name ON shops(shop_name);
  `);

  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='admin_settings')
    CREATE TABLE admin_settings (
      id                INT           PRIMARY KEY IDENTITY(1,1),
      duplication_check BIT           NOT NULL DEFAULT 0,
      updated_at        DATETIME      DEFAULT GETDATE(),
      updated_by        NVARCHAR(255) NULL
    );

    IF NOT EXISTS (SELECT 1 FROM admin_settings)
      INSERT INTO admin_settings (duplication_check) VALUES (0);
  `);


















  // ──────────────────────────────────────────────────────────
  // Phase 2.4 — Categories master + MIS sync support
  // ──────────────────────────────────────────────────────────
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='categories')
    CREATE TABLE categories (
      id              INT           PRIMARY KEY IDENTITY(1,1),
      mis_id          NVARCHAR(100) NULL,                   -- MIS Sync Primary Key (kept separate from local id)
      name            NVARCHAR(255) NOT NULL,
      code            NVARCHAR(100) NULL,
      description     NVARCHAR(1000) NULL,
      is_active       BIT           DEFAULT 1,
      is_discontinued BIT           DEFAULT 0,
      discontinued_at DATETIME      NULL,
      source          NVARCHAR(20)  DEFAULT 'MANUAL',       -- MANUAL | MIS
      synced_at       DATETIME      NULL,
      created_at      DATETIME      DEFAULT GETDATE(),
      updated_at      DATETIME      DEFAULT GETDATE(),
      CONSTRAINT uq_categories_name UNIQUE (name)
    );
  `);
  // mis_id: filtered unique index — allows many NULLs (manual rows), enforces uniqueness for MIS sync keys only
  await pool.request().batch(`
    IF EXISTS (
      SELECT 1 FROM sys.key_constraints
      WHERE name = 'uq_categories_mis_id' AND parent_object_id = OBJECT_ID('categories')
    )
      ALTER TABLE categories DROP CONSTRAINT uq_categories_mis_id;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_categories_mis_id' AND object_id = OBJECT_ID('categories'))
      CREATE UNIQUE INDEX UX_categories_mis_id ON categories(mis_id) WHERE mis_id IS NOT NULL;
  `);
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_categories_mis_id' AND object_id=OBJECT_ID('categories'))
      CREATE INDEX IX_categories_mis_id ON categories(mis_id);
  `);

  // ──────────────────────────────────────────────────────────
  // Phase 2.5 — Products master + MIS sync support
  // ──────────────────────────────────────────────────────────
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='products')
    CREATE TABLE products (
      id              INT           PRIMARY KEY IDENTITY(1,1),
      mis_id          NVARCHAR(100) NULL,                    -- MIS Sync Primary Key (kept separate from local id)
      name            NVARCHAR(255) NOT NULL,
      code            NVARCHAR(100) NULL,
      description     NVARCHAR(1000) NULL,
      unit_price      DECIMAL(18,2) NULL,
      uom             NVARCHAR(50)  NULL,
      category_id     INT           NOT NULL,
      category_mis_id NVARCHAR(100) NULL,                    -- captured at sync time for traceability
      is_active       BIT           DEFAULT 1,
      is_discontinued BIT           DEFAULT 0,
      discontinued_at DATETIME      NULL,
      source          NVARCHAR(20)  DEFAULT 'MANUAL',        -- MANUAL | MIS
      synced_at       DATETIME      NULL,
      created_at      DATETIME      DEFAULT GETDATE(),
      updated_at      DATETIME      DEFAULT GETDATE(),
      CONSTRAINT uq_products_cat_name UNIQUE (category_id, name),
      CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE NO ACTION
    );
  `);
  await pool.request().batch(`
    IF EXISTS (
      SELECT 1 FROM sys.key_constraints
      WHERE name = 'uq_products_mis_id' AND parent_object_id = OBJECT_ID('products')
    )
      ALTER TABLE products DROP CONSTRAINT uq_products_mis_id;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_products_mis_id' AND object_id = OBJECT_ID('products'))
      CREATE UNIQUE INDEX UX_products_mis_id ON products(mis_id) WHERE mis_id IS NOT NULL;
  `);
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_products_mis_id' AND object_id=OBJECT_ID('products'))
      CREATE INDEX IX_products_mis_id ON products(mis_id);
  `);
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_products_category' AND object_id=OBJECT_ID('products'))
      CREATE INDEX IX_products_category ON products(category_id, is_active, is_discontinued);
  `);

  // Seed countries if table is empty
  const { recordset: [cntRow] } = await pool.request().query('SELECT COUNT(*) as cnt FROM countries');
  if (cntRow.cnt === 0) {
    await pool.request().batch(`
      SET IDENTITY_INSERT [countries] ON;
      INSERT INTO [countries]([id],[name],[code],[phone_code],[is_active]) VALUES(1,'Pakistan','PK','+92',1);
      INSERT INTO [countries]([id],[name],[code],[phone_code],[is_active]) VALUES(2,'Saudi Arabia','SA','+966',1);
      INSERT INTO [countries]([id],[name],[code],[phone_code],[is_active]) VALUES(3,'United Arab Emirates','UAE','+971',1);
      INSERT INTO [countries]([id],[name],[code],[phone_code],[is_active]) VALUES(4,'Qatar','QA','+974',1);
      INSERT INTO [countries]([id],[name],[code],[phone_code],[is_active]) VALUES(5,'Kuwait','KW','+965',1);
      SET IDENTITY_INSERT [countries] OFF;
    `);
    console.log('✅ Countries seeded');
  }

  console.log('✅ Schema migrations applied');
};

const initDatabase = async () => {
  await createTables();
  await runMigrations();
  await seedData();
};

module.exports = { initDatabase };
