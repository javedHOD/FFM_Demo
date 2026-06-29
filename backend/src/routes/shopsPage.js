/**
 * ShopsPage — single aggregate API for src/pages/admin/ShopsPage.tsx
 * GET /api/shops/shops-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const shopQuery = `
  SELECT s.*, c.name as city_name, r.name as region_name, u.full_name as assigned_user_name
  FROM shops s
  LEFT JOIN cities c ON s.city_id = c.id
  LEFT JOIN regions r ON s.region_id = r.id
  LEFT JOIN users u ON s.assigned_user_id = u.id
`;

const formatShop = (row) => ({
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
});

const getShops = async () => {
  const { recordset: rows } = await query(`${shopQuery} ORDER BY s.created_at DESC`);
  return rows.map(formatShop);
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

const getAssignableUsers = async () => {
  const { recordset: rows } = await query(`
    SELECT u.id, u.full_name, r.name as role_name
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.is_active = 1
      AND r.name IN ('Promoter', 'City Manager')
    ORDER BY u.full_name
  `);
  return rows.map((u) => ({
    id: u.id,
    fullName: u.full_name,
    roleName: u.role_name,
  }));
};

// GET /api/shops/shops-page
router.get('/shops-page', authenticate, async (_req, res) => {
  try {
    const [shops, regions, cities, users] = await Promise.all([
      getShops(),
      getRegions(),
      getCities(),
      getAssignableUsers(),
    ]);

    res.json({
      success: true,
      data: { shops, regions, cities, users },
    });
  } catch (err) {
    console.error('shops-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
