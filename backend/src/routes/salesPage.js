/**
 * SalesPage — single aggregate API for src/pages/sales/SalesPage.tsx
 * GET /api/sales/sales-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const salesQuery = `
  SELECT se.*, u.full_name as user_name, s.shop_name
  FROM sales_entries se
  LEFT JOIN users u ON se.user_id = u.id
  LEFT JOIN shops s ON se.shop_id = s.id
`;

const shopQuery = `
  SELECT s.*, c.name as city_name, r.name as region_name, u.full_name as assigned_user_name
  FROM shops s
  LEFT JOIN cities c ON s.city_id = c.id
  LEFT JOIN regions r ON s.region_id = r.id
  LEFT JOIN users u ON s.assigned_user_id = u.id
`;

const formatSales = (row) => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  shopId: row.shop_id,
  shopName: row.shop_name,
  productName: row.product_name,
  quantity: row.quantity,
  amount: parseFloat(row.amount),
  remarks: row.remarks,
  createdAt: row.created_at,
});

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

const getMySales = async (userId) => {
  const { recordset: rows } = await query(
    salesQuery + ' WHERE se.user_id = ? ORDER BY se.created_at DESC',
    [userId]
  );
  return rows.map(formatSales);
};

const getShopsForUser = async (userId) => {
  const { recordset: rows } = await query(
    shopQuery + `
      WHERE s.assigned_user_id = ?
         OR s.region_id = (SELECT TOP 1 region_id FROM users WHERE id = ?)
         OR s.region_id IN (SELECT ur.region_id FROM user_regions ur WHERE ur.user_id = ?)
      ORDER BY s.created_at DESC
    `,
    [userId, userId, userId]
  );
  const seen = new Set();
  return rows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .map(formatShop);
};

router.get('/sales-page', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const [sales, shops] = await Promise.all([
      getMySales(userId),
      getShopsForUser(userId),
    ]);
    res.json({ success: true, data: { sales, shops } });
  } catch (err) {
    console.error('sales-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
