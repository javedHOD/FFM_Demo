const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

// ============ UTILITY ============

const generateEmployeeCode = async () => {
  const { recordset: rows } = await query("SELECT TOP 1 employee_code FROM employees ORDER BY id DESC");
  if (rows.length === 0) return 'EMP001';
  const last = rows[0].employee_code;
  const match = last.match(/EMP(\d+)/);
  if (match) {
    const next = parseInt(match[1]) + 1;
    return `EMP${String(next).padStart(3, '0')}`;
  }
  return 'EMP001';
};

const isEmployeeCodeUnique = async (code, excludeId = null) => {
  let sqlStr = 'SELECT id FROM employees WHERE employee_code = ?';
  const params = [code];
  if (excludeId) { sqlStr += ' AND id != ?'; params.push(excludeId); }
  const { recordset: rows } = await query(sqlStr, params);
  return rows.length === 0;
};

// ============ SHIFTS ============

router.get('/shifts', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query('SELECT * FROM shifts ORDER BY title');
    res.json({ success: true, data: rows.map(r => ({ id: r.id, title: r.title, startTime: r.start_time, lateStartTime: r.late_start_time, earlyGoTime: r.early_go_time, endTime: r.end_time, isActive: !!r.is_active, createdAt: r.created_at, updatedAt: r.updated_at })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/shifts', authenticate, async (req, res) => {
  try {
    const { title, startTime, lateStartTime, earlyGoTime, endTime, isActive } = req.body;
    if (!title || !startTime || !lateStartTime || !earlyGoTime || !endTime) {
      return res.status(400).json({ success: false, message: 'title, startTime, lateStartTime, earlyGoTime and endTime are required' });
    }
    const { recordset } = await query(
      'INSERT INTO shifts (title, start_time, late_start_time, early_go_time, end_time, is_active) OUTPUT INSERTED.id VALUES (?,?,?,?,?,?)',
      [title, startTime, lateStartTime, earlyGoTime, endTime, isActive !== false ? 1 : 0]
    );
    const { recordset: rows } = await query('SELECT * FROM shifts WHERE id = ?', [recordset[0].id]);
    const r = rows[0];
    res.status(201).json({ success: true, data: { id: r.id, title: r.title, startTime: r.start_time, lateStartTime: r.late_start_time, earlyGoTime: r.early_go_time, endTime: r.end_time, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/shifts/:id', authenticate, async (req, res) => {
  try {
    const { title, startTime, lateStartTime, earlyGoTime, endTime, isActive } = req.body;
    const updates = [];
    const values = [];
    if (title         !== undefined) { updates.push('title = ?');           values.push(title); }
    if (startTime     !== undefined) { updates.push('start_time = ?');      values.push(startTime); }
    if (lateStartTime !== undefined) { updates.push('late_start_time = ?'); values.push(lateStartTime); }
    if (earlyGoTime   !== undefined) { updates.push('early_go_time = ?');   values.push(earlyGoTime); }
    if (endTime       !== undefined) { updates.push('end_time = ?');        values.push(endTime); }
    if (isActive      !== undefined) { updates.push('is_active = ?');       values.push(isActive ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE shifts SET ${updates.join(', ')} WHERE id = ?`, values);
    const { recordset: rows } = await query('SELECT * FROM shifts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Shift not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, title: r.title, startTime: r.start_time, lateStartTime: r.late_start_time, earlyGoTime: r.early_go_time, endTime: r.end_time, isActive: !!r.is_active, createdAt: r.created_at, updatedAt: r.updated_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/shifts/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM shifts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Shift deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ DEPARTMENTS ============

router.get('/departments', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(`
      SELECT d.*, u.full_name as head_user_name
      FROM departments d
      LEFT JOIN users u ON d.head_user_id = u.id
      ORDER BY d.name
    `);
    res.json({ success: true, data: rows.map(r => ({ id: r.id, name: r.name, code: r.code, description: r.description, headUserId: r.head_user_id, headUserName: r.head_user_name, isActive: !!r.is_active, createdAt: r.created_at, updatedAt: r.updated_at })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/departments', authenticate, async (req, res) => {
  try {
    const { name, code, description, headUserId, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const { recordset } = await query(
      'INSERT INTO departments (name,code,description,head_user_id,is_active) OUTPUT INSERTED.id VALUES (?,?,?,?,?)',
      [name, code || null, description || null, headUserId || null, isActive !== false ? 1 : 0]
    );

    const { recordset: rows } = await query('SELECT d.*, u.full_name as head_user_name FROM departments d LEFT JOIN users u ON d.head_user_id = u.id WHERE d.id = ?', [recordset[0].id]);
    const r = rows[0];
    res.status(201).json({ success: true, data: { id: r.id, name: r.name, code: r.code, description: r.description, headUserId: r.head_user_id, headUserName: r.head_user_name, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/departments/:id', authenticate, async (req, res) => {
  try {
    const { name, code, description, headUserId, isActive } = req.body;
    const updates = [];
    const values = [];
    if (name        !== undefined) { updates.push('name = ?');         values.push(name); }
    if (code        !== undefined) { updates.push('code = ?');         values.push(code); }
    if (description !== undefined) { updates.push('description = ?');  values.push(description); }
    if (headUserId  !== undefined) { updates.push('head_user_id = ?'); values.push(headUserId || null); }
    if (isActive    !== undefined) { updates.push('is_active = ?');    values.push(isActive ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, values);
    const { recordset: rows } = await query('SELECT d.*, u.full_name as head_user_name FROM departments d LEFT JOIN users u ON d.head_user_id = u.id WHERE d.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Department not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, name: r.name, code: r.code, description: r.description, headUserId: r.head_user_id, headUserName: r.head_user_name, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/departments/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ DESIGNATIONS ============

router.get('/designations', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.query;
    let sql = 'SELECT d.*, dep.name as department_name FROM designations d LEFT JOIN departments dep ON d.department_id = dep.id';
    const params = [];
    if (departmentId) { sql += ' WHERE d.department_id = ?'; params.push(departmentId); }
    sql += ' ORDER BY d.[level] DESC, d.name';
    const { recordset: rows } = await query(sql, params);
    res.json({ success: true, data: rows.map(r => ({ id: r.id, name: r.name, code: r.code, departmentId: r.department_id, departmentName: r.department_name, level: r.level, description: r.description, isActive: !!r.is_active, createdAt: r.created_at, updatedAt: r.updated_at })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/designations', authenticate, async (req, res) => {
  try {
    const { name, code, departmentId, level, description, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const { recordset } = await query(
      'INSERT INTO designations (name,code,department_id,[level],description,is_active) OUTPUT INSERTED.id VALUES (?,?,?,?,?,?)',
      [name, code || null, departmentId || null, level || 0, description || null, isActive !== false ? 1 : 0]
    );

    const { recordset: rows } = await query('SELECT d.*, dep.name as department_name FROM designations d LEFT JOIN departments dep ON d.department_id = dep.id WHERE d.id = ?', [recordset[0].id]);
    const r = rows[0];
    res.status(201).json({ success: true, data: { id: r.id, name: r.name, code: r.code, departmentId: r.department_id, departmentName: r.department_name, level: r.level, description: r.description, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/designations/:id', authenticate, async (req, res) => {
  try {
    const { name, code, departmentId, level, description, isActive } = req.body;
    const updates = [];
    const values = [];
    if (name         !== undefined) { updates.push('name = ?');          values.push(name); }
    if (code         !== undefined) { updates.push('code = ?');          values.push(code); }
    if (departmentId !== undefined) { updates.push('department_id = ?'); values.push(departmentId || null); }
    if (level        !== undefined) { updates.push('[level] = ?');       values.push(level); }
    if (description  !== undefined) { updates.push('description = ?');   values.push(description); }
    if (isActive     !== undefined) { updates.push('is_active = ?');     values.push(isActive ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE designations SET ${updates.join(', ')} WHERE id = ?`, values);
    const { recordset: rows } = await query('SELECT d.*, dep.name as department_name FROM designations d LEFT JOIN departments dep ON d.department_id = dep.id WHERE d.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Designation not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, name: r.name, code: r.code, departmentId: r.department_id, departmentName: r.department_name, level: r.level, description: r.description, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/designations/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM designations WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Designation deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ EMPLOYEES ============

const empQuery = `
  SELECT e.*,
    d.name as designation_name, dep.name as department_name,
    rm.full_name as reporting_manager_name, rm.employee_code as reporting_manager_code,
    co.name as country_name, reg.name as region_name, ci.name as city_name,
    sh.title as shift_title
  FROM employees e
  LEFT JOIN designations d ON e.designation_id = d.id
  LEFT JOIN departments dep ON e.department_id = dep.id
  LEFT JOIN employees rm   ON e.reporting_manager_id = rm.id
  LEFT JOIN countries co   ON e.country_id  = co.id
  LEFT JOIN regions reg    ON e.region_id   = reg.id
  LEFT JOIN cities ci      ON e.city_id     = ci.id
  LEFT JOIN shifts sh      ON e.shift_id    = sh.id
`;

const formatEmployee = (r) => ({
  id: r.id,
  userId: r.user_id,
  employeeCode: r.employee_code,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone,
  designationId: r.designation_id,
  designationName: r.designation_name,
  departmentId: r.department_id,
  departmentName: r.department_name,
  reportingManagerId: r.reporting_manager_id,
  reportingManagerName: r.reporting_manager_name,
  countryId: r.country_id,
  countryName: r.country_name,
  regionId: r.region_id,
  regionName: r.region_name,
  cityId: r.city_id,
  cityName: r.city_name,
  shiftId: r.shift_id,
  shiftTitle: r.shift_title,
  joinDate: r.join_date,
  isActive: !!r.is_active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// GET /api/hr/employees/next-code  — MUST come before /employees/:id
router.get('/employees/next-code', authenticate, async (req, res) => {
  try {
    const code = await generateEmployeeCode();
    res.json({ success: true, data: { code } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/hr/employees
router.get('/employees', authenticate, async (req, res) => {
  try {
    const { departmentId, designationId } = req.query;
    let sql = empQuery;
    const params = [];
    const where = [];
    if (departmentId)  { where.push('e.department_id = ?');  params.push(departmentId); }
    if (designationId) { where.push('e.designation_id = ?'); params.push(designationId); }
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY e.created_at DESC';
    const { recordset: rows } = await query(sql, params);
    res.json({ success: true, data: rows.map(formatEmployee) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/hr/employees
router.post('/employees', authenticate, async (req, res) => {
  try {
    const { userId, employeeCode, fullName, email, phone, designationId, departmentId, reportingManagerId, countryId, regionId, cityId, shiftId, joinDate, isActive } = req.body;
    if (!fullName || !email || !joinDate) {
      return res.status(400).json({ success: false, message: 'fullName, email, and joinDate are required' });
    }

    let finalCode = employeeCode;
    if (!finalCode) finalCode = await generateEmployeeCode();

    let unique = await isEmployeeCodeUnique(finalCode);
    if (!unique) {
      let code = await generateEmployeeCode();
      let attempts = 0;
      while (!(await isEmployeeCodeUnique(code)) && attempts < 100) {
        const num = parseInt(code.replace('EMP', '')) + 1;
        code = `EMP${String(num).padStart(3, '0')}`;
        attempts++;
      }
      finalCode = code;
    }

    const { recordset: emailCheck } = await query('SELECT id FROM employees WHERE email = ?', [email]);
    if (emailCheck.length > 0) {
      return res.status(400).json({ success: false, message: 'Employee email already exists' });
    }

    const { recordset } = await query(
      `INSERT INTO employees (user_id,employee_code,full_name,email,phone,designation_id,department_id,reporting_manager_id,country_id,region_id,city_id,shift_id,join_date,is_active)
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [userId || null, finalCode, fullName, email, phone || null, designationId || null, departmentId || null, reportingManagerId || null, countryId || null, regionId || null, cityId || null, shiftId || null, joinDate, isActive !== false ? 1 : 0]
    );

    const { recordset: rows } = await query(empQuery + ' WHERE e.id = ?', [recordset[0].id]);
    res.status(201).json({ success: true, data: formatEmployee(rows[0]) });
  } catch (err) {
    console.error(err);
    if (err.number === 2627 || err.number === 2601) return res.status(400).json({ success: false, message: 'Employee code or email already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/hr/employees/:id
router.put('/employees/:id', authenticate, async (req, res) => {
  try {
    const { employeeCode, fullName, email, phone, designationId, departmentId, reportingManagerId, countryId, regionId, cityId, shiftId, joinDate, isActive } = req.body;

    if (employeeCode) {
      const unique = await isEmployeeCodeUnique(employeeCode, req.params.id);
      if (!unique) return res.status(400).json({ success: false, message: 'Employee code already exists' });
    }

    if (email) {
      const { recordset: emailCheck } = await query('SELECT id FROM employees WHERE email = ? AND id != ?', [email, req.params.id]);
      if (emailCheck.length > 0) return res.status(400).json({ success: false, message: 'Employee email already exists' });
    }

    const updates = [];
    const values = [];
    if (employeeCode       !== undefined) { updates.push('employee_code = ?');        values.push(employeeCode); }
    if (fullName           !== undefined) { updates.push('full_name = ?');            values.push(fullName); }
    if (email              !== undefined) { updates.push('email = ?');                values.push(email); }
    if (phone              !== undefined) { updates.push('phone = ?');                values.push(phone); }
    if (designationId      !== undefined) { updates.push('designation_id = ?');       values.push(designationId || null); }
    if (departmentId       !== undefined) { updates.push('department_id = ?');        values.push(departmentId || null); }
    if (reportingManagerId !== undefined) { updates.push('reporting_manager_id = ?'); values.push(reportingManagerId || null); }
    if (countryId          !== undefined) { updates.push('country_id = ?');           values.push(countryId || null); }
    if (regionId           !== undefined) { updates.push('region_id = ?');            values.push(regionId || null); }
    if (cityId             !== undefined) { updates.push('city_id = ?');              values.push(cityId || null); }
    if (shiftId            !== undefined) { updates.push('shift_id = ?');             values.push(shiftId || null); }
    if (joinDate           !== undefined) { updates.push('join_date = ?');            values.push(joinDate); }
    if (isActive           !== undefined) { updates.push('is_active = ?');            values.push(isActive ? 1 : 0); }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, values);

    const { recordset: rows } = await query(empQuery + ' WHERE e.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: formatEmployee(rows[0]) });
  } catch (err) {
    console.error(err);
    if (err.number === 2627 || err.number === 2601) return res.status(400).json({ success: false, message: 'Employee code already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/hr/employees/:id
router.delete('/employees/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ ATTENDANCE CONFIG ============

router.get('/attendance-config', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query('SELECT TOP 1 * FROM attendance_config');
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Config not found' });
    const r = rows[0];
    res.json({
      success: true,
      data: {
        id: r.id,
        officeStartTime: r.office_start_time,
        officeEndTime: r.office_end_time,
        gracePeriodMinutes: r.grace_period_minutes,
        lateThresholdMinutes: r.late_threshold_minutes,
        minimumWorkingHours: parseFloat(r.minimum_working_hours),
        halfDayHours: parseFloat(r.half_day_hours),
        isFlexibleTiming: !!r.is_flexible_timing,
        workingDays: r.working_days.split(',').map(Number),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/attendance-config', authenticate, async (req, res) => {
  try {
    const { officeStartTime, officeEndTime, gracePeriodMinutes, lateThresholdMinutes, minimumWorkingHours, halfDayHours, isFlexibleTiming, workingDays } = req.body;
    const updates = [];
    const values = [];
    if (officeStartTime     !== undefined) { updates.push('office_start_time = ?');      values.push(officeStartTime); }
    if (officeEndTime       !== undefined) { updates.push('office_end_time = ?');        values.push(officeEndTime); }
    if (gracePeriodMinutes  !== undefined) { updates.push('grace_period_minutes = ?');   values.push(gracePeriodMinutes); }
    if (lateThresholdMinutes !== undefined) { updates.push('late_threshold_minutes = ?'); values.push(lateThresholdMinutes); }
    if (minimumWorkingHours !== undefined) { updates.push('minimum_working_hours = ?'); values.push(minimumWorkingHours); }
    if (halfDayHours        !== undefined) { updates.push('half_day_hours = ?');        values.push(halfDayHours); }
    if (isFlexibleTiming    !== undefined) { updates.push('is_flexible_timing = ?');    values.push(isFlexibleTiming ? 1 : 0); }
    if (workingDays         !== undefined) { updates.push('working_days = ?');           values.push(Array.isArray(workingDays) ? workingDays.join(',') : workingDays); }
    if (updates.length > 0) {
      updates.push('updated_at = GETDATE()');
      values.push(1);
      await query(`UPDATE attendance_config SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    const { recordset: rows } = await query('SELECT TOP 1 * FROM attendance_config');
    const r = rows[0];
    res.json({
      success: true,
      data: { id: r.id, officeStartTime: r.office_start_time, officeEndTime: r.office_end_time, gracePeriodMinutes: r.grace_period_minutes, lateThresholdMinutes: r.late_threshold_minutes, minimumWorkingHours: parseFloat(r.minimum_working_hours), halfDayHours: parseFloat(r.half_day_hours), isFlexibleTiming: !!r.is_flexible_timing, workingDays: r.working_days.split(',').map(Number), createdAt: r.created_at, updatedAt: r.updated_at }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ EMPLOYEE ATTENDANCE ============

router.post('/attendance/check-in', authenticate, async (req, res) => {
  try {
    const { employeeId, latitude, longitude, selfieUrl } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId is required' });

    const today = new Date().toISOString().split('T')[0];
    const { recordset: existing } = await query(
      'SELECT id FROM employee_attendance WHERE employee_id = ? AND [date] = ?',
      [employeeId, today]
    );
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'Already checked in today' });

    const { recordset: config } = await query('SELECT TOP 1 * FROM attendance_config');
    const now = new Date();
    let isLate = false;
    let lateMinutes = 0;
    if (config.length > 0) {
      const [h, m] = config[0].office_start_time.split(':').map(Number);
      const grace = config[0].grace_period_minutes || 0;
      const startMs = new Date(today).setHours(h, m + grace, 0, 0);
      if (now.getTime() > startMs) {
        isLate = true;
        lateMinutes = Math.round((now.getTime() - startMs) / 60000);
      }
    }

    const { recordset: emp } = await query('SELECT full_name, employee_code, department_id FROM employees WHERE id = ?', [employeeId]);
    const { recordset } = await query(
      `INSERT INTO employee_attendance (employee_id,[date],check_in_time,check_in_latitude,check_in_longitude,selfie_url,[status],is_late,late_minutes)
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [employeeId, today, now, latitude || null, longitude || null, selfieUrl || null, isLate ? 'Late' : 'Present', isLate ? 1 : 0, lateMinutes || null]
    );

    res.status(201).json({ success: true, data: { id: recordset[0].id, employeeId, employeeName: emp[0]?.full_name, employeeCode: emp[0]?.employee_code, date: today, checkInTime: now, status: isLate ? 'Late' : 'Present', isLate, lateMinutes, isMissingCheckIn: false, isMissingCheckOut: false, createdAt: now } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/attendance/check-out', authenticate, async (req, res) => {
  try {
    const { attendanceId, latitude, longitude } = req.body;
    const { recordset: existing } = await query('SELECT * FROM employee_attendance WHERE id = ?', [attendanceId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Attendance record not found' });

    const now = new Date();
    const checkIn = new Date(existing[0].check_in_time);
    const workingHours = Math.round(((now - checkIn) / 3600000) * 10) / 10;

    await query(
      'UPDATE employee_attendance SET check_out_time=?,check_out_latitude=?,check_out_longitude=?,working_hours=?,updated_at=GETDATE() WHERE id=?',
      [now, latitude || null, longitude || null, workingHours, attendanceId]
    );

    const { recordset: rows } = await query('SELECT * FROM employee_attendance WHERE id = ?', [attendanceId]);
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, employeeId: r.employee_id, date: r.date, checkInTime: r.check_in_time, checkOutTime: r.check_out_time, workingHours: r.working_hours ? parseFloat(r.working_hours) : undefined, status: r.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/attendance', authenticate, async (req, res) => {
  try {
    const { employeeId, dateFrom, dateTo } = req.query;
    let sql = `
      SELECT ea.*, e.full_name as employee_name, e.employee_code, dep.name as department_name
      FROM employee_attendance ea
      LEFT JOIN employees e   ON ea.employee_id   = e.id
      LEFT JOIN departments dep ON e.department_id = dep.id
    `;
    const where = [];
    const params = [];
    if (employeeId) { where.push('ea.employee_id = ?'); params.push(employeeId); }
    if (dateFrom)   { where.push('ea.[date] >= ?');     params.push(dateFrom); }
    if (dateTo)     { where.push('ea.[date] <= ?');     params.push(dateTo); }
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY ea.[date] DESC';
    const { recordset: rows } = await query(sql, params);
    res.json({ success: true, data: rows.map(r => ({ id: r.id, employeeId: r.employee_id, employeeName: r.employee_name, employeeCode: r.employee_code, departmentName: r.department_name, date: r.date, checkInTime: r.check_in_time, checkOutTime: r.check_out_time, workingHours: r.working_hours ? parseFloat(r.working_hours) : undefined, status: r.status, isLate: !!r.is_late, lateMinutes: r.late_minutes, isMissingCheckIn: !!r.is_missing_check_in, isMissingCheckOut: !!r.is_missing_check_out, remarks: r.remarks, createdAt: r.created_at })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/hr/attendance-summary
router.get('/attendance-summary', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(`
      SELECT e.id as employee_id, e.full_name as employee_name, e.employee_code,
             dep.name as department_name,
             COUNT(ea.id) as total_days,
             SUM(CASE WHEN ea.[status] IN ('Present','Late') THEN 1 ELSE 0 END) as present_days,
             SUM(CASE WHEN ea.[status] = 'Absent'   THEN 1 ELSE 0 END) as absent_days,
             SUM(CASE WHEN ea.is_late = 1            THEN 1 ELSE 0 END) as late_days,
             SUM(CASE WHEN ea.[status] = 'OnLeave'  THEN 1 ELSE 0 END) as leave_days,
             SUM(CASE WHEN ea.[status] = 'HalfDay'  THEN 1 ELSE 0 END) as half_day_days,
             SUM(COALESCE(ea.working_hours, 0)) as total_working_hours
      FROM employees e
      LEFT JOIN departments dep ON e.department_id = dep.id
      LEFT JOIN employee_attendance ea ON e.id = ea.employee_id
      WHERE e.is_active = 1
      GROUP BY e.id, e.full_name, e.employee_code, dep.name
    `);
    res.json({ success: true, data: rows.map(r => ({ employeeId: r.employee_id, employeeName: r.employee_name, employeeCode: r.employee_code, departmentName: r.department_name, totalDays: r.total_days || 0, presentDays: r.present_days || 0, absentDays: r.absent_days || 0, lateDays: r.late_days || 0, leaveDays: r.leave_days || 0, halfDayDays: r.half_day_days || 0, attendancePercentage: r.total_days > 0 ? Math.round((r.present_days / r.total_days) * 100) : 0, totalWorkingHours: parseFloat(r.total_working_hours || 0), averageWorkingHours: r.total_days > 0 ? Math.round((r.total_working_hours / r.total_days) * 10) / 10 : 0 })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/hr/attendance-stats
router.get('/attendance-stats', authenticate, async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const { recordset: [total] } = await query('SELECT COUNT(*) as cnt FROM employees WHERE is_active = 1');
    const { recordset: [stats] } = await query(`
      SELECT
        SUM(CASE WHEN [status] = 'Present'  THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN [status] = 'Absent'   THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN [status] = 'Late'     THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN [status] = 'OnLeave'  THEN 1 ELSE 0 END) as on_leave,
        SUM(CASE WHEN [status] = 'HalfDay'  THEN 1 ELSE 0 END) as half_day,
        COUNT(*) as recorded
      FROM employee_attendance WHERE [date] = ?
    `, [targetDate]);
    const tot = total.cnt;
    res.json({ success: true, data: { date: targetDate, totalEmployees: tot, present: stats.present || 0, absent: stats.absent || 0, late: stats.late || 0, onLeave: stats.on_leave || 0, halfDay: stats.half_day || 0, attendancePercentage: tot > 0 ? Math.round((stats.recorded / tot) * 100) : 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ APPROVAL REQUESTS ============

router.get('/approval-requests', authenticate, async (req, res) => {
  try {
    const { status, requestType } = req.query;
    let sql = 'SELECT * FROM approval_requests';
    const where = [];
    const params = [];
    if (status)      { where.push('[status] = ?');      params.push(status); }
    if (requestType) { where.push('request_type = ?');  params.push(requestType); }
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const { recordset: rows } = await query(sql, params);
    res.json({ success: true, data: rows.map(r => ({ id: r.id, requestId: r.request_id, requestType: r.request_type, employeeId: r.employee_id, employeeName: r.employee_name, employeeCode: r.employee_code, departmentId: r.department_id, title: r.title, description: r.description, startDate: r.start_date, endDate: r.end_date, currentLevel: r.current_level, status: r.status, approvedBy: r.approved_by, approvedByName: r.approved_by_name, approvalRemarks: r.approval_remarks, approvedAt: r.approved_at, createdAt: r.created_at, updatedAt: r.updated_at })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/approval-requests', authenticate, async (req, res) => {
  try {
    const { requestType, employeeId, employeeName, employeeCode, departmentId, title, description, startDate, endDate } = req.body;
    if (!employeeId || !title) return res.status(400).json({ success: false, message: 'employeeId and title are required' });

    const { recordset: [countRow] } = await query('SELECT COUNT(*) as cnt FROM approval_requests');
    const reqId = `REQ-${new Date().getFullYear()}-${String(parseInt(countRow.cnt) + 1).padStart(3, '0')}`;

    const { recordset } = await query(
      `INSERT INTO approval_requests (request_id,request_type,employee_id,employee_name,employee_code,department_id,title,description,start_date,end_date,current_level,[status])
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [reqId, requestType || 'Other', employeeId, employeeName || '', employeeCode || '', departmentId || null, title, description || '', startDate || null, endDate || null, 1, 'Pending']
    );

    const { recordset: rows } = await query('SELECT * FROM approval_requests WHERE id = ?', [recordset[0].id]);
    const r = rows[0];
    res.status(201).json({ success: true, data: { id: r.id, requestId: r.request_id, requestType: r.request_type, employeeId: r.employee_id, employeeName: r.employee_name, employeeCode: r.employee_code, title: r.title, description: r.description, status: r.status, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/approval-requests/:id/approve', authenticate, async (req, res) => {
  try {
    const { remarks } = req.body;
    await query(
      "UPDATE approval_requests SET [status]='Approved', approved_by=?, approved_by_name=?, approval_remarks=?, approved_at=GETDATE(), updated_at=GETDATE() WHERE id=?",
      [req.user.id, req.user.fullName || req.user.email, remarks || null, req.params.id]
    );
    const { recordset: rows } = await query('SELECT * FROM approval_requests WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, requestId: r.request_id, status: r.status, approvedBy: r.approved_by, approvalRemarks: r.approval_remarks } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/approval-requests/:id/reject', authenticate, async (req, res) => {
  try {
    const { remarks } = req.body;
    await query(
      "UPDATE approval_requests SET [status]='Rejected', approved_by=?, approved_by_name=?, approval_remarks=?, approved_at=GETDATE(), updated_at=GETDATE() WHERE id=?",
      [req.user.id, req.user.fullName || req.user.email, remarks || null, req.params.id]
    );
    const { recordset: rows } = await query('SELECT * FROM approval_requests WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, requestId: r.request_id, status: r.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ APPROVAL HIERARCHIES ============

router.get('/approval-hierarchies', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(`
      SELECT ah.*, dep.name as department_name, des.name as approver_designation_name
      FROM approval_hierarchies ah
      LEFT JOIN departments dep  ON ah.department_id           = dep.id
      LEFT JOIN designations des ON ah.approver_designation_id = des.id
      ORDER BY ah.[level]
    `);
    res.json({ success: true, data: rows.map(r => ({ id: r.id, name: r.name, description: r.description, departmentId: r.department_id, departmentName: r.department_name, level: r.level, approverDesignationId: r.approver_designation_id, approverDesignationName: r.approver_designation_name, isActive: !!r.is_active, createdAt: r.created_at })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
