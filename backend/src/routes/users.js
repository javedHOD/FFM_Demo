const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const userQuery = `
  SELECT u.*, r.name as role_name, reg.name as region_name, c.name as city_name
  FROM users u
  LEFT JOIN roles r   ON u.role_id   = r.id
  LEFT JOIN regions reg ON u.region_id = reg.id
  LEFT JOIN cities c  ON u.city_id   = c.id
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
    ids: recordset.map(r => r.region_id),
    names: recordset.map(r => r.region_name).filter(Boolean),
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
    ids: recordset.map(s => s.id),
    names: recordset.map(s => s.shop_name).filter(Boolean),
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

const formatUsers = async (rows) => {
  const users = [];
  for (const row of rows) users.push(await formatUser(row));
  return users;
};

const syncUserRegions = async (userId, regionIds) => {
  if (!Array.isArray(regionIds)) return;

  const cleaned = [...new Set(regionIds.map(Number).filter(Boolean))];
  await query('DELETE FROM user_regions WHERE user_id = ?', [userId]);
  for (const regionId of cleaned) {
    await query('INSERT INTO user_regions (user_id, region_id) VALUES (?, ?)', [userId, regionId]);
  }
};

const syncAssignedShops = async (userId, shopIds) => {
  if (!Array.isArray(shopIds)) return;

  const cleaned = [...new Set(shopIds.map(Number).filter(Boolean))];
  await query('UPDATE shops SET assigned_user_id = NULL, updated_at = GETDATE() WHERE assigned_user_id = ?', [userId]);
  for (const shopId of cleaned) {
    await query('UPDATE shops SET assigned_user_id = ?, updated_at = GETDATE() WHERE id = ?', [userId, shopId]);
  }
};

// ===== IMPORTANT: Specific routes MUST come before /:id =====

// GET /api/users/meta/roles
router.get('/meta/roles', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, data: rows.map(r => ({ id: r.id, name: r.name })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/meta/regions
router.get('/meta/regions', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(`
      SELECT r.*, c.name as country_name
      FROM regions r
      LEFT JOIN countries c ON r.country_id = c.id
      WHERE r.is_active = 1
      ORDER BY r.name
    `);
    res.json({
      success: true,
      data: rows.map(r => ({ id: r.id, name: r.name, countryId: r.country_id, countryName: r.country_name }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/meta/cities
router.get('/meta/cities', authenticate, async (req, res) => {
  try {
    const { regionId } = req.query;
    let sql = `
      SELECT c.*, r.name as region_name
      FROM cities c
      LEFT JOIN regions r ON c.region_id = r.id
      WHERE c.is_active = 1
    `;
    const params = [];
    if (regionId) { sql += ' AND c.region_id = ?'; params.push(regionId); }
    sql += ' ORDER BY c.name';
    const { recordset: rows } = await query(sql, params);
    res.json({
      success: true,
      data: rows.map(c => ({ id: c.id, name: c.name, regionId: c.region_id, regionName: c.region_name }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users
router.get('/', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(userQuery + ' ORDER BY u.created_at DESC');
    res.json({ success: true, data: await formatUsers(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(userQuery + ' WHERE u.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: await formatUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/users
router.post('/', authenticate, async (req, res) => {
  try {
    const { fullName, email, phone, roleId, regionId, regionIds, cityId, assignedShopIds, isActive, password, employeeId } = req.body;
    if (!fullName || !email || !roleId) {
      return res.status(400).json({ success: false, message: 'fullName, email, and roleId are required' });
    }

    const { recordset: existing } = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const primaryRegionId = regionId || (Array.isArray(regionIds) && regionIds.length ? Number(regionIds[0]) : null);
    const rawPass = password || 'FieldForce@123';
    const hash = await bcrypt.hash(rawPass, 10);

    const { recordset } = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, region_id, city_id, is_active)
       OUTPUT INSERTED.id
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone || null, hash, roleId, primaryRegionId || null, cityId || null, isActive !== false ? 1 : 0]
    );

    const newId = recordset[0].id;
    await syncUserRegions(newId, regionIds || (primaryRegionId ? [primaryRegionId] : []));
    await syncAssignedShops(newId, assignedShopIds);

    // Link HR employee record to the newly created user if provided
    if (employeeId) {
      await query(
        'UPDATE employees SET user_id = ?, updated_at = GETDATE() WHERE id = ?',
        [newId, employeeId]
      );
    }

    const { recordset: rows } = await query(userQuery + ' WHERE u.id = ?', [newId]);
    res.status(201).json({ success: true, data: await formatUser(rows[0]) });
  } catch (err) {
    console.error(err);
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { fullName, email, phone, roleId, regionId, regionIds, cityId, assignedShopIds, isActive, password } = req.body;

    const { recordset: existing } = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    if (email) {
      const { recordset: emailCheck } = await query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
      if (emailCheck.length > 0) return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const primaryRegionId = regionId !== undefined
      ? (regionId || null)
      : (Array.isArray(regionIds) && regionIds.length ? Number(regionIds[0]) : undefined);

    const updates = [];
    const values = [];
    if (fullName  !== undefined) { updates.push('full_name = ?');    values.push(fullName); }
    if (email     !== undefined) { updates.push('email = ?');        values.push(email); }
    if (phone     !== undefined) { updates.push('phone = ?');        values.push(phone); }
    if (roleId    !== undefined) { updates.push('role_id = ?');      values.push(roleId); }
    if (primaryRegionId !== undefined) { updates.push('region_id = ?'); values.push(primaryRegionId || null); }
    if (cityId    !== undefined) { updates.push('city_id = ?');      values.push(cityId || null); }
    if (isActive  !== undefined) { updates.push('is_active = ?');    values.push(isActive ? 1 : 0); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(hash);
    }

    if (updates.length > 0) {
      updates.push('updated_at = GETDATE()');
      values.push(req.params.id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (Array.isArray(regionIds)) {
      await syncUserRegions(req.params.id, regionIds);
    }
    if (Array.isArray(assignedShopIds)) {
      await syncAssignedShops(req.params.id, assignedShopIds);
    }

    const { recordset: rows } = await query(userQuery + ' WHERE u.id = ?', [req.params.id]);
    res.json({ success: true, data: await formatUser(rows[0]) });
  } catch (err) {
    console.error(err);
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { recordset: existing } = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
