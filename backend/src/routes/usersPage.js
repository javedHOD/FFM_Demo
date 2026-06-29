/**
 * UsersPage — single aggregate API for src/pages/admin/UsersPage.tsx
 * GET /api/users/users-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const userQuery = `
  SELECT u.*, r.name as role_name, reg.name as region_name, c.name as city_name
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  LEFT JOIN regions reg ON u.region_id = reg.id
  LEFT JOIN cities c ON u.city_id = c.id
`;

const shopQuery = `
  SELECT s.*, c.name as city_name, r.name as region_name, u.full_name as assigned_user_name
  FROM shops s
  LEFT JOIN cities c ON s.city_id = c.id
  LEFT JOIN regions r ON s.region_id = r.id
  LEFT JOIN users u ON s.assigned_user_id = u.id
`;

const empQuery = `
  SELECT e.*,
    d.name as designation_name, dep.name as department_name,
    rm.full_name as reporting_manager_name,
    co.name as country_name, reg.name as region_name, ci.name as city_name,
    sh.title as shift_title
  FROM employees e
  LEFT JOIN designations d ON e.designation_id = d.id
  LEFT JOIN departments dep ON e.department_id = dep.id
  LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
  LEFT JOIN countries co ON e.country_id = co.id
  LEFT JOIN regions reg ON e.region_id = reg.id
  LEFT JOIN cities ci ON e.city_id = ci.id
  LEFT JOIN shifts sh ON e.shift_id = sh.id
`;

const getMultiRegions = async (userId) => {
  const { recordset } = await query(`
    SELECT ur.region_id, r.name as region_name
    FROM user_regions ur
    LEFT JOIN regions r ON ur.region_id = r.id
    WHERE ur.user_id = ?
    ORDER BY r.name
  `, [userId]);

  return {
    ids: recordset.map((r) => r.region_id),
    names: recordset.map((r) => r.region_name).filter(Boolean),
  };
};

const getAssignedShops = async (userId) => {
  const { recordset } = await query(`
    SELECT id, shop_name
    FROM shops
    WHERE assigned_user_id = ?
    ORDER BY shop_name
  `, [userId]);

  return {
    ids: recordset.map((s) => s.id),
    names: recordset.map((s) => s.shop_name).filter(Boolean),
  };
};

const formatUser = async (row) => {
  const multi = await getMultiRegions(row.id);
  const assignedShops = await getAssignedShops(row.id);
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    roleId: row.role_id,
    roleName: row.role_name,
    regionId: row.region_id,
    regionName: row.region_name,
    multiRegionIds: multi.ids,
    multiRegionNames: multi.names,
    assignedShopIds: assignedShops.ids,
    assignedShopNames: assignedShops.names,
    cityId: row.city_id,
    cityName: row.city_name,
    isActive: !!row.is_active,
    createdAt: row.created_at,
  };
};

const getUsers = async () => {
  const { recordset: rows } = await query(`${userQuery} ORDER BY u.created_at DESC`);
  const users = [];
  for (const row of rows) users.push(await formatUser(row));
  return users;
};

const getRegions = async () => {
  const { recordset: rows } = await query(`
    SELECT r.*, c.name as country_name
    FROM regions r
    LEFT JOIN countries c ON r.country_id = c.id
    WHERE r.is_active = 1
    ORDER BY r.name
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    countryId: r.country_id,
    countryName: r.country_name,
  }));
};

const getCities = async () => {
  const { recordset: rows } = await query(`
    SELECT c.*, r.name as region_name
    FROM cities c
    LEFT JOIN regions r ON c.region_id = r.id
    WHERE c.is_active = 1
    ORDER BY c.name
  `);
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    regionId: c.region_id,
    regionName: c.region_name,
  }));
};

const getEmployees = async () => {
  const { recordset: rows } = await query(`${empQuery} ORDER BY e.created_at DESC`);
  return rows.map((r) => ({
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
  }));
};

const getShops = async () => {
  const { recordset: rows } = await query(`${shopQuery} ORDER BY s.created_at DESC`);
  return rows.map((row) => ({
    id: row.id,
    shopName: row.shop_name,
    shopType: row.shop_type,
    address: row.address,
    cityId: row.city_id,
    cityName: row.city_name,
    regionId: row.region_id,
    regionName: row.region_name,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    assignedUserId: row.assigned_user_id,
    assignedUserName: row.assigned_user_name,
    contactPerson: row.contact_person,
    contactNo: row.contact_no,
    contactNo2: row.contact_no_2,
    ntnNo: row.ntn_no,
    isActive: !!row.is_active,
    createdAt: row.created_at,
  }));
};

// GET /api/users/users-page
router.get('/users-page', authenticate, async (_req, res) => {
  try {
    const [users, regions, cities, employees, shops] = await Promise.all([
      getUsers(),
      getRegions(),
      getCities(),
      getEmployees(),
      getShops(),
    ]);

    res.json({
      success: true,
      data: { users, regions, cities, employees, shops },
    });
  } catch (err) {
    console.error('users-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
