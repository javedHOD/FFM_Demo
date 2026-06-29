/**
 * LocationManagementPage — single aggregate API for src/pages/admin/LocationManagementPage.tsx
 * GET /api/location/location-management-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const getCountries = async () => {
  const { recordset: rows } = await query('SELECT * FROM countries ORDER BY name');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    phoneCode: r.phone_code,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

const getRegions = async () => {
  const { recordset: rows } = await query(`
    SELECT r.*, c.name as country_name
    FROM regions r
    LEFT JOIN countries c ON r.country_id = c.id
    ORDER BY r.name
  `);
  return rows.map((r) => ({
    id: r.id,
    countryId: r.country_id,
    countryName: r.country_name,
    name: r.name,
    code: r.code,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

const getCities = async () => {
  const { recordset: rows } = await query(`
    SELECT c.*, r.name as region_name, co.name as country_name
    FROM cities c
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON c.country_id = co.id
    ORDER BY c.name
  `);
  return rows.map((c) => ({
    id: c.id,
    regionId: c.region_id,
    regionName: c.region_name,
    countryId: c.country_id,
    countryName: c.country_name,
    name: c.name,
    code: c.code,
    isActive: !!c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
};

// GET /api/location/location-management-page
router.get('/location-management-page', authenticate, async (_req, res) => {
  try {
    const [countries, regions, cities] = await Promise.all([
      getCountries(),
      getRegions(),
      getCities(),
    ]);

    res.json({
      success: true,
      data: { countries, regions, cities },
    });
  } catch (err) {
    console.error('location-management-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
