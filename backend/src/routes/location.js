const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

// ============ COUNTRIES ============

router.get('/countries', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query('SELECT * FROM countries ORDER BY name');
    res.json({ success: true, data: rows.map(r => ({ id: r.id, name: r.name, code: r.code, phoneCode: r.phone_code, isActive: !!r.is_active, createdAt: r.created_at, updatedAt: r.updated_at })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/countries/:id', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query('SELECT * FROM countries WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Country not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, name: r.name, code: r.code, phoneCode: r.phone_code, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/countries', authenticate, async (req, res) => {
  try {
    const { name, phoneCode, isActive } = req.body;
    let { code } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    // Auto-generate a 2-3 letter code from the name if not provided
    if (!code) code = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'XXX';

    const { recordset } = await query(
      'INSERT INTO countries (name,code,phone_code,is_active) OUTPUT INSERTED.id VALUES (?,?,?,?)',
      [name, code.toUpperCase(), phoneCode || null, isActive !== false ? 1 : 0]
    );

    const { recordset: rows } = await query('SELECT * FROM countries WHERE id = ?', [recordset[0].id]);
    const r = rows[0];
    res.status(201).json({ success: true, data: { id: r.id, name: r.name, code: r.code, phoneCode: r.phone_code, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(400).json({ success: false, message: 'Country name or code already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/countries/:id', authenticate, async (req, res) => {
  try {
    const { name, code, phoneCode, isActive } = req.body;
    const updates = [];
    const values = [];
    if (name      !== undefined) { updates.push('name = ?');       values.push(name); }
    if (code      !== undefined) { updates.push('code = ?');       values.push(code.toUpperCase()); }
    if (phoneCode !== undefined) { updates.push('phone_code = ?'); values.push(phoneCode); }
    if (isActive  !== undefined) { updates.push('is_active = ?');  values.push(isActive ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE countries SET ${updates.join(', ')} WHERE id = ?`, values);
    const { recordset: rows } = await query('SELECT * FROM countries WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Country not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, name: r.name, code: r.code, phoneCode: r.phone_code, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(400).json({ success: false, message: 'Country name or code already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/countries/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM countries WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Country deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ REGIONS ============

router.get('/regions', authenticate, async (req, res) => {
  try {
    const { countryId } = req.query;
    let sql = 'SELECT r.*, c.name as country_name FROM regions r LEFT JOIN countries c ON r.country_id = c.id';
    const params = [];
    if (countryId) { sql += ' WHERE r.country_id = ?'; params.push(countryId); }
    sql += ' ORDER BY r.name';
    const { recordset: rows } = await query(sql, params);
    res.json({
      success: true,
      data: rows.map(r => ({ id: r.id, countryId: r.country_id, countryName: r.country_name, name: r.name, code: r.code, isActive: !!r.is_active, createdAt: r.created_at, updatedAt: r.updated_at }))
    });
  } catch (err) {
    console.error('GET /regions error:', err.message, err.number);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.post('/regions', authenticate, async (req, res) => {
  try {
    const { name, code, countryId, isActive } = req.body;
    if (!name || !countryId) return res.status(400).json({ success: false, message: 'name and countryId are required' });

    const { recordset } = await query(
      'INSERT INTO regions (country_id,name,code,is_active) OUTPUT INSERTED.id VALUES (?,?,?,?)',
      [countryId, name, code || null, isActive !== false ? 1 : 0]
    );

    const { recordset: rows } = await query('SELECT r.*, c.name as country_name FROM regions r LEFT JOIN countries c ON r.country_id = c.id WHERE r.id = ?', [recordset[0].id]);
    const r = rows[0];
    res.status(201).json({ success: true, data: { id: r.id, countryId: r.country_id, countryName: r.country_name, name: r.name, code: r.code, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(400).json({ success: false, message: 'Region already exists in this country' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/regions/:id', authenticate, async (req, res) => {
  try {
    const { name, code, countryId, isActive } = req.body;
    const updates = [];
    const values = [];
    if (name      !== undefined) { updates.push('name = ?');       values.push(name); }
    if (code      !== undefined) { updates.push('code = ?');       values.push(code); }
    if (countryId !== undefined) { updates.push('country_id = ?'); values.push(countryId); }
    if (isActive  !== undefined) { updates.push('is_active = ?');  values.push(isActive ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE regions SET ${updates.join(', ')} WHERE id = ?`, values);
    const { recordset: rows } = await query('SELECT r.*, c.name as country_name FROM regions r LEFT JOIN countries c ON r.country_id = c.id WHERE r.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Region not found' });
    const r = rows[0];
    res.json({ success: true, data: { id: r.id, countryId: r.country_id, countryName: r.country_name, name: r.name, code: r.code, isActive: !!r.is_active, createdAt: r.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/regions/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM regions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Region deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ CITIES ============

router.get('/cities', authenticate, async (req, res) => {
  try {
    const { regionId, countryId } = req.query;
    let sql = `SELECT c.*, r.name as region_name, co.name as country_name
               FROM cities c
               LEFT JOIN regions r  ON c.region_id  = r.id
               LEFT JOIN countries co ON c.country_id = co.id`;
    const params = [];
    const where = [];
    if (regionId)  { where.push('c.region_id = ?');  params.push(regionId); }
    if (countryId) { where.push('c.country_id = ?'); params.push(countryId); }
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY c.name';
    const { recordset: rows } = await query(sql, params);
    res.json({
      success: true,
      data: rows.map(c => ({ id: c.id, regionId: c.region_id, regionName: c.region_name, countryId: c.country_id, countryName: c.country_name, name: c.name, code: c.code, isActive: !!c.is_active, createdAt: c.created_at, updatedAt: c.updated_at }))
    });
  } catch (err) {
    console.error('GET /cities error:', err.message, err.number);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.post('/cities', authenticate, async (req, res) => {
  try {
    const { name, code, regionId, countryId, isActive } = req.body;
    if (!name || !regionId) return res.status(400).json({ success: false, message: 'name and regionId are required' });

    let resolvedCountryId = countryId;
    if (!resolvedCountryId) {
      const { recordset: regRows } = await query('SELECT country_id FROM regions WHERE id = ?', [regionId]);
      if (regRows.length > 0) resolvedCountryId = regRows[0].country_id;
    }

    const { recordset } = await query(
      'INSERT INTO cities (region_id,country_id,name,code,is_active) OUTPUT INSERTED.id VALUES (?,?,?,?,?)',
      [regionId, resolvedCountryId || null, name, code || null, isActive !== false ? 1 : 0]
    );

    const { recordset: rows } = await query(`SELECT c.*, r.name as region_name, co.name as country_name FROM cities c LEFT JOIN regions r ON c.region_id = r.id LEFT JOIN countries co ON c.country_id = co.id WHERE c.id = ?`, [recordset[0].id]);
    const c = rows[0];
    res.status(201).json({ success: true, data: { id: c.id, regionId: c.region_id, regionName: c.region_name, countryId: c.country_id, countryName: c.country_name, name: c.name, code: c.code, isActive: !!c.is_active, createdAt: c.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/cities/:id', authenticate, async (req, res) => {
  try {
    const { name, code, regionId, countryId, isActive } = req.body;
    const updates = [];
    const values = [];
    if (name      !== undefined) { updates.push('name = ?');       values.push(name); }
    if (code      !== undefined) { updates.push('code = ?');       values.push(code); }
    if (regionId  !== undefined) { updates.push('region_id = ?');  values.push(regionId); }
    if (countryId !== undefined) { updates.push('country_id = ?'); values.push(countryId || null); }
    if (isActive  !== undefined) { updates.push('is_active = ?');  values.push(isActive ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE cities SET ${updates.join(', ')} WHERE id = ?`, values);
    const { recordset: rows } = await query(`SELECT c.*, r.name as region_name, co.name as country_name FROM cities c LEFT JOIN regions r ON c.region_id = r.id LEFT JOIN countries co ON c.country_id = co.id WHERE c.id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'City not found' });
    const c = rows[0];
    res.json({ success: true, data: { id: c.id, regionId: c.region_id, regionName: c.region_name, countryId: c.country_id, countryName: c.country_name, name: c.name, code: c.code, isActive: !!c.is_active, createdAt: c.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/cities/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM cities WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'City deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/location/hierarchy
router.get('/hierarchy', authenticate, async (req, res) => {
  try {
    const { recordset: countries } = await query('SELECT * FROM countries WHERE is_active = 1');
    const { recordset: regions }   = await query('SELECT * FROM regions WHERE is_active = 1');
    const { recordset: cities }    = await query('SELECT * FROM cities WHERE is_active = 1');

    const hierarchy = countries.map(country => ({
      countryId: country.id,
      countryName: country.name,
      regions: regions.filter(r => r.country_id === country.id).map(region => ({
        regionId: region.id,
        regionName: region.name,
        cities: cities.filter(c => c.region_id === region.id).map(city => ({
          cityId: city.id,
          cityName: city.name,
        })),
      })),
    }));

    res.json({ success: true, data: hierarchy });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
