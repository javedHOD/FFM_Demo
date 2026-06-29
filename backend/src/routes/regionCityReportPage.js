/**
 * RegionCityReportPage — single aggregate API for src/pages/admin/RegionCityReportPage.tsx
 * GET /api/reports/region-city-report-page
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

const getMultiRegions = async (userId) => {
  const { recordset } = await query(`
    SELECT ur.region_id, r.name as region_name
    FROM user_regions ur
    LEFT JOIN regions r ON ur.region_id = r.id
    WHERE ur.user_id = ?
    ORDER BY r.name
  `, [userId]);

  return {
    ids: recordset.map((row) => row.region_id),
    names: recordset.map((row) => row.region_name).filter(Boolean),
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

// GET /api/reports/region-city-report-page
router.get('/region-city-report-page', authenticate, async (_req, res) => {
  try {
    const [users, shops, regions, cities] = await Promise.all([
      getUsers(),
      getShops(),
      getRegions(),
      getCities(),
    ]);

    res.json({
      success: true,
      data: { users, shops, regions, cities },
    });
  } catch (err) {
    console.error('region-city-report-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
