/**
 * HRManagementPage — single aggregate API for src/pages/admin/HRManagementPage.tsx
 * GET /api/hr/hr-management-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

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

const getEmployees = async () => {
  const { recordset: rows } = await query(`${empQuery} ORDER BY e.created_at DESC`);
  return rows.map(formatEmployee);
};

const getDesignations = async () => {
  const { recordset: rows } = await query(`
    SELECT d.*, dep.name as department_name
    FROM designations d
    LEFT JOIN departments dep ON d.department_id = dep.id
    ORDER BY d.[level] DESC, d.name
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    departmentId: r.department_id,
    departmentName: r.department_name,
    level: r.level,
    description: r.description,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

const getDepartments = async () => {
  const { recordset: rows } = await query(`
    SELECT d.*, u.full_name as head_user_name
    FROM departments d
    LEFT JOIN users u ON d.head_user_id = u.id
    ORDER BY d.name
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    headUserId: r.head_user_id,
    headUserName: r.head_user_name,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

const getShifts = async () => {
  const { recordset: rows } = await query('SELECT * FROM shifts ORDER BY title');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    startTime: r.start_time,
    lateStartTime: r.late_start_time,
    earlyGoTime: r.early_go_time,
    endTime: r.end_time,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

const getAttendanceRecords = async () => {
  const { recordset: rows } = await query(`
    SELECT ea.*, e.full_name as employee_name, e.employee_code, dep.name as department_name
    FROM employee_attendance ea
    LEFT JOIN employees e ON ea.employee_id = e.id
    LEFT JOIN departments dep ON e.department_id = dep.id
    ORDER BY ea.[date] DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    employeeCode: r.employee_code,
    departmentName: r.department_name,
    date: r.date,
    checkInTime: r.check_in_time,
    checkOutTime: r.check_out_time,
    workingHours: r.working_hours ? parseFloat(r.working_hours) : undefined,
    status: r.status,
    isLate: !!r.is_late,
    lateMinutes: r.late_minutes,
    isMissingCheckIn: !!r.is_missing_check_in,
    isMissingCheckOut: !!r.is_missing_check_out,
    remarks: r.remarks,
    createdAt: r.created_at,
  }));
};

const getApprovalRequests = async () => {
  const { recordset: rows } = await query(
    'SELECT * FROM approval_requests ORDER BY created_at DESC'
  );
  return rows.map((r) => ({
    id: r.id,
    requestId: r.request_id,
    requestType: r.request_type,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    employeeCode: r.employee_code,
    departmentId: r.department_id,
    title: r.title,
    description: r.description,
    startDate: r.start_date,
    endDate: r.end_date,
    currentLevel: r.current_level,
    status: r.status,
    approvedBy: r.approved_by,
    approvedByName: r.approved_by_name,
    approvalRemarks: r.approval_remarks,
    approvedAt: r.approved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

// GET /api/hr/hr-management-page
router.get('/hr-management-page', authenticate, async (_req, res) => {
  try {
    const [employees, designations, departments, shifts, attendanceRecords, approvalRequests] =
      await Promise.all([
        getEmployees(),
        getDesignations(),
        getDepartments(),
        getShifts(),
        getAttendanceRecords(),
        getApprovalRequests(),
      ]);

    res.json({
      success: true,
      data: {
        employees,
        designations,
        departments,
        shifts,
        attendanceRecords,
        approvalRequests,
      },
    });
  } catch (err) {
    console.error('hr-management-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
