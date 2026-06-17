const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const {
  getOrderItems,
  formatOrderRow,
  syncOrderStatus,
  formatOrdersWithItems,
} = require('../lib/orderHelpers');

const orderQuery = `
  SELECT o.*, u.full_name as user_name, s.shop_name, ab.full_name as approved_by_name
  FROM orders o
  LEFT JOIN users u  ON o.user_id     = u.id
  LEFT JOIN shops s  ON o.shop_id     = s.id
  LEFT JOIN users ab ON o.approved_by = ab.id
`;

const normalizeItems = (body) => {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items
      .map(item => ({
        productName: String(item.productName || '').trim(),
        quantity: Number(item.quantity),
      }))
      .filter(item => item.productName && Number.isFinite(item.quantity) && item.quantity > 0);
  }

  if (body.productName && body.quantity) {
    return [{ productName: String(body.productName).trim(), quantity: Number(body.quantity) }];
  }

  return [];
};

// GET /api/orders/my
router.get('/my', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(orderQuery + ' WHERE o.user_id = ? ORDER BY o.created_at DESC', [req.user.id]);
    res.json({ success: true, data: await formatOrdersWithItems(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders/pending
router.get('/pending', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(
      orderQuery + ` WHERE EXISTS (
        SELECT 1 FROM order_items oi
        WHERE oi.order_id = o.id AND oi.status = 'Pending'
      ) ORDER BY o.created_at DESC`
    );
    res.json({ success: true, data: await formatOrdersWithItems(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(orderQuery + ' ORDER BY o.created_at DESC');
    res.json({ success: true, data: await formatOrdersWithItems(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/orders/:orderId/items/:itemId/status
router.put('/:orderId/items/:itemId/status', authenticate, async (req, res) => {
  try {
    const { status, approvedBy, approvalRemarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const { recordset: itemRows } = await query(
      'SELECT id, order_id, status FROM order_items WHERE id = ? AND order_id = ?',
      [req.params.itemId, req.params.orderId]
    );

    if (itemRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    if (itemRows[0].status && itemRows[0].status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'This item has already been processed' });
    }

    const approver = approvedBy || req.user.id;
    await query(
      `UPDATE order_items
       SET [status]=?, approved_by=?, approval_remarks=?, updated_at=GETDATE()
       WHERE id=?`,
      [status, approver, approvalRemarks || null, req.params.itemId]
    );

    await syncOrderStatus(req.params.orderId);

    const { recordset: rows } = await query(orderQuery + ' WHERE o.id = ?', [req.params.orderId]);
    const items = await getOrderItems(req.params.orderId);
    res.json({ success: true, data: formatOrderRow(rows[0], items) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(orderQuery + ' WHERE o.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    const items = await getOrderItems(req.params.id);
    res.json({ success: true, data: formatOrderRow(rows[0], items) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/orders
router.post('/', authenticate, async (req, res) => {
  try {
    const { userId, shopId, orderType, remarks } = req.body;
    const items = normalizeItems(req.body);

    if (!shopId || !orderType || items.length === 0) {
      return res.status(400).json({ success: false, message: 'shopId, orderType, and at least one valid item with quantity are required' });
    }

    const uid = userId || req.user.id;
    const productSummary = items.map(i => i.productName).join(', ');
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const { recordset } = await query(
      `INSERT INTO orders (user_id,shop_id,order_type,product_name,quantity,remarks,status)
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?,?)`,
      [uid, shopId, orderType, productSummary, totalQuantity, remarks || null, 'Pending']
    );

    const orderId = recordset[0].id;
    for (const item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_name, quantity, status) VALUES (?,?,?,?)',
        [orderId, item.productName, item.quantity, 'Pending']
      );
    }

    const { recordset: rows } = await query(orderQuery + ' WHERE o.id = ?', [orderId]);
    const orderItems = await getOrderItems(orderId);
    res.status(201).json({ success: true, data: formatOrderRow(rows[0], orderItems) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/orders/:id/status — legacy bulk action (updates all pending items)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, approvedBy, approvalRemarks } = req.body;

    const { recordset: existing } = await query('SELECT id FROM orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

    const approver = approvedBy || req.user.id;
    await query(
      `UPDATE order_items
       SET [status]=?, approved_by=?, approval_remarks=?, updated_at=GETDATE()
       WHERE order_id=? AND status='Pending'`,
      [status, approver, approvalRemarks || null, req.params.id]
    );

    await syncOrderStatus(req.params.id);

    const { recordset: rows } = await query(orderQuery + ' WHERE o.id = ?', [req.params.id]);
    const items = await getOrderItems(req.params.id);
    res.json({ success: true, data: formatOrderRow(rows[0], items) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
