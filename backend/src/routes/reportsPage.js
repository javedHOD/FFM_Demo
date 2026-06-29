/**
 * ReportsPage — single aggregate API for src/pages/reports/ReportsPage.tsx
 * GET /api/reports/reports-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { formatOrdersWithItems } = require('../lib/orderHelpers');

const formatVisitRow = async (row) => {
  const { recordset: photos } = await query(
    'SELECT * FROM visit_photos WHERE visit_id = ? ORDER BY created_at',
    [row.id]
  );
  return {
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
    remarks: row.remarks || null,
    status: row.status,
    photos: photos.map((p) => ({
      id: p.id,
      visitId: p.visit_id,
      photoType: p.photo_type,
      photoUrl: p.photo_url,
      createdAt: p.created_at,
    })),
    createdAt: row.created_at,
  };
};

const getVisitReport = async () => {
  const { recordset: rows } = await query(`
    SELECT v.*, u.full_name as user_name, s.shop_name
    FROM visits v
    LEFT JOIN users u ON v.user_id = u.id
    LEFT JOIN shops s ON v.shop_id = s.id
    ORDER BY v.created_at DESC
  `);
  return Promise.all(rows.map((r) => formatVisitRow(r)));
};

const getAttendanceReport = async () => {
  const { recordset: rows } = await query(`
    SELECT a.*, u.full_name as user_name
    FROM attendance a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name || null,
    checkInTime: r.check_in_time || null,
    checkOutTime: r.check_out_time || null,
    checkInLatitude: r.check_in_latitude ? parseFloat(r.check_in_latitude) : null,
    checkInLongitude: r.check_in_longitude ? parseFloat(r.check_in_longitude) : null,
    selfieUrl: r.selfie_url || null,
    status: r.status,
    createdAt: r.created_at,
  }));
};

const getSalesReport = async () => {
  const { recordset: rows } = await query(`
    SELECT se.*, u.full_name as user_name, s.shop_name
    FROM sales_entries se
    LEFT JOIN users u ON se.user_id = u.id
    LEFT JOIN shops s ON se.shop_id = s.id
    ORDER BY se.created_at DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name || null,
    shopId: r.shop_id,
    shopName: r.shop_name || null,
    productName: r.product_name || null,
    quantity: r.quantity,
    amount: parseFloat(r.amount) || 0,
    remarks: r.remarks || null,
    createdAt: r.created_at,
  }));
};

const getOrderReport = async () => {
  const { recordset: rows } = await query(`
    SELECT o.*, u.full_name as user_name, s.shop_name, ab.full_name as approved_by_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN shops s ON o.shop_id = s.id
    LEFT JOIN users ab ON o.approved_by = ab.id
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

// GET /api/reports/reports-page
router.get('/reports-page', authenticate, async (_req, res) => {
  try {
    const [visits, attendance, sales, orders, weeklyData, monthlyData] = await Promise.all([
      getVisitReport(),
      getAttendanceReport(),
      getSalesReport(),
      getOrderReport(),
      getWeeklyVisitData(),
      getMonthlySalesData(),
    ]);

    res.json({
      success: true,
      data: {
        visits,
        attendance,
        sales,
        orders,
        weeklyData,
        monthlyData,
      },
    });
  } catch (err) {
    console.error('reports-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
