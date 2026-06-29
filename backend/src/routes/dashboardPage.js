/**
 * DashboardPage — aggregate APIs for src/pages/dashboard/DashboardPage.tsx
 * GET /api/reports/dashboard-page          — field staff (my visits & orders)
 * GET /api/reports/dashboard-page-manager  — National Sales Manager (org-wide)
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { formatOrdersWithItems } = require('../lib/orderHelpers');

const RECENT_VISITS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;

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

const formatVisitSummary = (row) => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name || null,
  shopId: row.shop_id,
  shopName: row.shop_name || null,
  visitStartTime: row.visit_start_time || null,
  visitEndTime: row.visit_end_time || null,
  latitude: row.latitude ? parseFloat(row.latitude) : null,
  longitude: row.longitude ? parseFloat(row.longitude) : null,
  durationMinutes: row.duration_minutes || null,
  status: row.status,
  createdAt: row.created_at,
  photos: [],
});

const getRecentVisits = async (userId = null) => {
  const userFilter = userId ? 'WHERE v.user_id = ?' : '';
  const params = userId ? [userId] : [];
  const { recordset: rows } = await query(`
    SELECT TOP ${RECENT_VISITS_LIMIT}
      v.id, v.user_id, v.shop_id, v.status, v.created_at,
      v.visit_start_time, v.visit_end_time, v.latitude, v.longitude, v.duration_minutes,
      u.full_name as user_name, s.shop_name
    FROM visits v
    LEFT JOIN users u ON v.user_id = u.id
    LEFT JOIN shops s ON v.shop_id = s.id
    ${userFilter}
    ORDER BY v.created_at DESC
  `, params);

  return rows.map(formatVisitSummary);
};

const getRecentOrders = async (userId = null) => {
  const userFilter = userId ? 'WHERE o.user_id = ?' : '';
  const params = userId ? [userId] : [];
  const { recordset: rows } = await query(`
    SELECT TOP ${RECENT_ORDERS_LIMIT}
      o.*, u.full_name as user_name, s.shop_name, ab.full_name as approved_by_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN shops s ON o.shop_id = s.id
    LEFT JOIN users ab ON o.approved_by = ab.id
    ${userFilter}
    ORDER BY o.created_at DESC
  `, params);

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

const getTodayAttendance = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const { recordset: rows } = await query(`
    SELECT TOP 1 a.*, u.full_name as user_name
    FROM attendance a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.user_id = ? AND CAST(a.check_in_time AS DATE) = ?
    ORDER BY a.created_at DESC
  `, [userId, today]);

  if (!rows.length) return null;

  const r = rows[0];
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    checkInTime: r.check_in_time,
    checkOutTime: r.check_out_time || undefined,
    status: r.status,
    createdAt: r.created_at,
  };
};

const buildDashboardPayload = async (userId, scope) => {
  const isField = scope === 'field';
  const [stats, recentVisits, recentOrders, weeklyData, salesData, todayAttendance] = await Promise.all([
    getDashboardStats(userId),
    getRecentVisits(isField ? userId : null),
    getRecentOrders(isField ? userId : null),
    getWeeklyVisitData(),
    getMonthlySalesData(),
    getTodayAttendance(userId),
  ]);

  return { stats, recentVisits, recentOrders, weeklyData, salesData, todayAttendance };
};

// GET /api/reports/dashboard-page — Promoter, City Manager, Regional Manager
router.get('/dashboard-page', authenticate, async (req, res) => {
  try {
    const allowed = ['Promoter', 'City Manager', 'Regional Manager'];
    if (!allowed.includes(req.user?.roleName)) {
      return res.status(403).json({ success: false, message: 'Use dashboard-page-manager for this role' });
    }

    const data = await buildDashboardPayload(req.user.id, 'field');
    res.json({ success: true, data });
  } catch (err) {
    console.error('dashboard-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/dashboard-page-manager — National Sales Manager
router.get('/dashboard-page-manager', authenticate, async (req, res) => {
  try {
    if (req.user?.roleName !== 'National Sales Manager') {
      return res.status(403).json({ success: false, message: 'Manager dashboard access required' });
    }

    const data = await buildDashboardPayload(req.user.id, 'manager');
    res.json({ success: true, data });
  } catch (err) {
    console.error('dashboard-page-manager error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
