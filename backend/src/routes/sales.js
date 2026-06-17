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

const parseDateParam = (value) => {
  if (!value || typeof value !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
};

const buildDateFilter = (req) => {
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const conditions = [];
  const params = [];

  if (from) {
    conditions.push('CAST(se.created_at AS DATE) >= CAST(? AS DATE)');
    params.push(from);
  }
  if (to) {
    conditions.push('CAST(se.created_at AS DATE) <= CAST(? AS DATE)');
    params.push(to);
  }

  return { conditions, params };
};

const dateWhereClause = (conditions) =>
  conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

// GET /api/sales/my  (before generic /)
router.get('/my', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(salesQuery + ' WHERE se.user_id = ? ORDER BY se.created_at DESC', [req.user.id]);
    res.json({ success: true, data: rows.map(formatSales) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/sales/summary/by-user
router.get('/summary/by-user', authenticate, async (req, res) => {
  try {
    const { conditions, params } = buildDateFilter(req);
    const { recordset: rows } = await query(`
      SELECT u.id as user_id, u.full_name as user_name,
             SUM(se.amount) as total_amount, COUNT(*) as total_orders
      FROM sales_entries se
      LEFT JOIN users u ON se.user_id = u.id
      ${dateWhereClause(conditions)}
      GROUP BY se.user_id, u.id, u.full_name
      ORDER BY total_amount DESC
    `, params);
    res.json({ success: true, data: rows.map(r => ({ userId: r.user_id, userName: r.user_name, totalAmount: parseFloat(r.total_amount || 0), totalOrders: r.total_orders })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/sales
router.get('/', authenticate, async (req, res) => {
  try {
    const { conditions, params } = buildDateFilter(req);
    const { recordset: rows } = await query(
      salesQuery + dateWhereClause(conditions) + ' ORDER BY se.created_at DESC',
      params
    );
    res.json({ success: true, data: rows.map(formatSales) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/sales
router.post('/', authenticate, async (req, res) => {
  try {
    const { userId, shopId, productName, quantity, amount, remarks } = req.body;
    if (!shopId || !productName || !quantity || !amount) {
      return res.status(400).json({ success: false, message: 'shopId, productName, quantity, amount required' });
    }
    const uid = userId || req.user.id;

    const { recordset } = await query(
      `INSERT INTO sales_entries (user_id,shop_id,product_name,quantity,amount,remarks)
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?)`,
      [uid, shopId, productName, quantity, amount, remarks || null]
    );

    const { recordset: rows } = await query(salesQuery + ' WHERE se.id = ?', [recordset[0].id]);
    res.status(201).json({ success: true, data: formatSales(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
