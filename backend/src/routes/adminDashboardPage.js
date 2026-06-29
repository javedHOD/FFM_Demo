/**
 * AdminDashboardPage — single aggregate API for src/pages/admin/AdminDashboardPage.tsx
 * GET /api/reports/admin-dashboard
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { formatOrdersWithItems } = require('../lib/orderHelpers');

const RECENT_VISITS_LIMIT = 6;
const PENDING_ORDERS_LIMIT = 5;

const getDashboardStats = async (uid) => {
  const today = new Date().toISOString().split('T')[0];

  const { recordset: [todayVisits] } = await query(
    "SELECT COUNT(*) as cnt FROM visits WHERE CAST(created_at AS DATE) = ?",
    [today]
  );
  const { recordset: [pendingVisits] } = await query(
    "SELECT COUNT(*) as cnt FROM visits WHERE [status] = 'InProgress'"
  );
  const { recordset: [completedVisits] } = await query(
    "SELECT COUNT(*) as cnt FROM visits WHERE [status] = 'Completed'"
  );
  const { recordset: [totalOrders] } = await query("SELECT COUNT(*) as cnt FROM orders");
  const { recordset: [pendingOrders] } = await query(`
    SELECT COUNT(DISTINCT o.id) as cnt
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
    WHERE oi.status = 'Pending'
  `);
  const { recordset: [salesAmt] } = await query(
    "SELECT COALESCE(SUM(amount), 0) as total FROM sales_entries"
  );
  const { recordset: [photosUploaded] } = await query(
    "SELECT COUNT(*) as cnt FROM visit_photos"
  );
  const { recordset: [totalUsers] } = await query(
    "SELECT COUNT(*) as cnt FROM users WHERE is_active = 1"
  );
  const { recordset: [totalShops] } = await query("SELECT COUNT(*) as cnt FROM shops");

  const { recordset: todayAtt } = await query(
    "SELECT * FROM attendance WHERE user_id = ? AND CAST(check_in_time AS DATE) = ?",
    [uid, today]
  );
  const attendanceStatus = todayAtt.length > 0
    ? (todayAtt[0].status === 'CheckedOut' ? 'CheckedOut' : 'Present')
    : 'Absent';

  return {
    todayVisits: todayVisits.cnt,
    pendingVisits: pendingVisits.cnt,
    completedVisits: completedVisits.cnt,
    attendanceStatus,
    totalOrders: totalOrders.cnt,
    pendingOrders: pendingOrders.cnt,
    salesAmount: parseFloat(salesAmt.total),
    photosUploaded: photosUploaded.cnt,
    gpsCompliance: 88,
    totalUsers: totalUsers.cnt,
    activeFieldStaff: totalUsers.cnt,
    pendingApprovals: pendingOrders.cnt,
    totalShops: totalShops.cnt,
  };
};

const getRecentVisits = async () => {
  const { recordset: rows } = await query(`
    SELECT TOP ${RECENT_VISITS_LIMIT}
      v.id, v.user_id, v.shop_id, v.status, v.created_at,
      u.full_name as user_name, s.shop_name
    FROM visits v
    LEFT JOIN users u ON v.user_id = u.id
    LEFT JOIN shops s ON v.shop_id = s.id
    ORDER BY v.created_at DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || null,
    shopId: row.shop_id,
    shopName: row.shop_name || null,
    status: row.status,
    createdAt: row.created_at,
    photos: [],
  }));
};

const getPendingOrders = async () => {
  const { recordset: rows } = await query(`
    SELECT TOP ${PENDING_ORDERS_LIMIT}
      o.*, u.full_name as user_name, s.shop_name, ab.full_name as approved_by_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN shops s ON o.shop_id = s.id
    LEFT JOIN users ab ON o.approved_by = ab.id
    WHERE EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.order_id = o.id AND oi.status = 'Pending'
    )
    ORDER BY o.created_at DESC
  `);

  return formatOrdersWithItems(rows);
};

const getWeeklyVisitData = async () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const { recordset: [total] } = await query(
      "SELECT COUNT(*) as cnt FROM visits WHERE CAST(created_at AS DATE) = ?",
      [dateStr]
    );
    const { recordset: [completed] } = await query(
      "SELECT COUNT(*) as cnt FROM visits WHERE CAST(created_at AS DATE) = ? AND [status] = 'Completed'",
      [dateStr]
    );
    days.push({ day: dayName, visits: total.cnt, completed: completed.cnt });
  }
  return days;
};

const getMonthlySalesData = async () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const { recordset: [result] } = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM sales_entries WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?",
      [year, month]
    );
    months.push({ month: monthName, amount: parseFloat(result.total) });
  }
  return months;
};

// GET /api/reports/admin-dashboard
router.get('/admin-dashboard', authenticate, async (req, res) => {
  try {
    const uid = req.query.userId || req.user.id;

    const [stats, recentVisits, pendingOrders, weeklyData, salesData] = await Promise.all([
      getDashboardStats(uid),
      getRecentVisits(),
      getPendingOrders(),
      getWeeklyVisitData(),
      getMonthlySalesData(),
    ]);

    res.json({
      success: true,
      data: {
        stats,
        recentVisits,
        pendingOrders,
        weeklyData,
        salesData,
      },
    });
  } catch (err) {
    console.error('admin-dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
