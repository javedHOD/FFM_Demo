const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const shopQuery = `
  SELECT s.*, c.name as city_name, r.name as region_name, u.full_name as assigned_user_name
  FROM shops s
  LEFT JOIN cities c  ON s.city_id          = c.id
  LEFT JOIN regions r ON s.region_id        = r.id
  LEFT JOIN users u   ON s.assigned_user_id = u.id
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

const ensureUniqueShopName = async (shopName, excludeId = null) => {
  const params = [shopName.trim()];
  let sql = 'SELECT id FROM shops WHERE LOWER(LTRIM(RTRIM(shop_name))) = LOWER(LTRIM(RTRIM(?)))';
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const { recordset } = await query(sql, params);
  return recordset.length === 0;
};

// GET /api/shops
router.get('/', authenticate, async (req, res) => {
  try {
    const { userId } = req.query;
    let sql = shopQuery;
    const params = [];

    if (userId) {
      sql += `
        WHERE s.assigned_user_id = ?
           OR s.region_id = (SELECT TOP 1 region_id FROM users WHERE id = ?)
           OR s.region_id IN (SELECT ur.region_id FROM user_regions ur WHERE ur.user_id = ?)
      `;
      params.push(userId, userId, userId);
    }

    sql += ' ORDER BY s.created_at DESC';
    const { recordset: rows } = await query(sql, params);

    // Avoid duplicate rows if a shop is directly assigned and region-matched.
    const seen = new Set();
    const unique = rows.filter(row => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    res.json({ success: true, data: unique.map(formatShop) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/shops/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(shopQuery + ' WHERE s.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Shop not found' });
    res.json({ success: true, data: formatShop(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/shops
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      shopName, shopType, address, cityId, regionId, latitude, longitude,
      assignedUserId, contactPerson, contactNo, contactNo2, ntnNo, isActive
    } = req.body;

    if (!shopName || !shopName.trim() || !cityId) {
      return res.status(400).json({ success: false, message: 'shopName and cityId are required' });
    }

    if (!(await ensureUniqueShopName(shopName))) {
      return res.status(400).json({ success: false, message: 'Shop name already exists. Please use a unique shop name.' });
    }

    const { recordset } = await query(
      `INSERT INTO shops (
         shop_name, shop_type, address, city_id, region_id, latitude, longitude,
         assigned_user_id, contact_person, contact_no, contact_no_2, ntn_no, is_active
       )
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        shopName.trim(), shopType || null, address || null, cityId, regionId || null,
        latitude || null, longitude || null, assignedUserId || null,
        contactPerson || null, contactNo || null, contactNo2 || null, ntnNo || null,
        isActive !== false ? 1 : 0,
      ]
    );

    const { recordset: rows } = await query(shopQuery + ' WHERE s.id = ?', [recordset[0].id]);
    res.status(201).json({ success: true, data: formatShop(rows[0]) });
  } catch (err) {
    console.error(err);
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ success: false, message: 'Shop name already exists. Please use a unique shop name.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/shops/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      shopName, shopType, address, cityId, regionId, latitude, longitude,
      assignedUserId, contactPerson, contactNo, contactNo2, ntnNo, isActive
    } = req.body;

    if (shopName !== undefined) {
      if (!shopName.trim()) return res.status(400).json({ success: false, message: 'Shop name is required' });
      if (!(await ensureUniqueShopName(shopName, req.params.id))) {
        return res.status(400).json({ success: false, message: 'Shop name already exists. Please use a unique shop name.' });
      }
    }

    const updates = [];
    const values = [];
    if (shopName       !== undefined) { updates.push('shop_name = ?');        values.push(shopName.trim()); }
    if (shopType       !== undefined) { updates.push('shop_type = ?');        values.push(shopType); }
    if (address        !== undefined) { updates.push('address = ?');          values.push(address); }
    if (cityId         !== undefined) { updates.push('city_id = ?');          values.push(cityId); }
    if (regionId       !== undefined) { updates.push('region_id = ?');        values.push(regionId || null); }
    if (latitude       !== undefined) { updates.push('latitude = ?');         values.push(latitude || null); }
    if (longitude      !== undefined) { updates.push('longitude = ?');        values.push(longitude || null); }
    if (assignedUserId !== undefined) { updates.push('assigned_user_id = ?'); values.push(assignedUserId || null); }
    if (contactPerson  !== undefined) { updates.push('contact_person = ?');   values.push(contactPerson || null); }
    if (contactNo      !== undefined) { updates.push('contact_no = ?');       values.push(contactNo || null); }
    if (contactNo2     !== undefined) { updates.push('contact_no_2 = ?');     values.push(contactNo2 || null); }
    if (ntnNo          !== undefined) { updates.push('ntn_no = ?');           values.push(ntnNo || null); }
    if (isActive       !== undefined) { updates.push('is_active = ?');        values.push(isActive ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE shops SET ${updates.join(', ')} WHERE id = ?`, values);

    const { recordset: rows } = await query(shopQuery + ' WHERE s.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Shop not found' });
    res.json({ success: true, data: formatShop(rows[0]) });
  } catch (err) {
    console.error(err);
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ success: false, message: 'Shop name already exists. Please use a unique shop name.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/shops/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM shops WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Shop deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
