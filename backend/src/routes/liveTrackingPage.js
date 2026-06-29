/**
 * LiveTrackingPage — single aggregate API for src/pages/tracking/LiveTrackingPage.tsx
 * GET /api/tracking/live-tracking-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const formatAttendance = (row) => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  checkInTime: row.check_in_time,
  checkOutTime: row.check_out_time || undefined,
  checkInLatitude: row.check_in_latitude ? parseFloat(row.check_in_latitude) : undefined,
  checkInLongitude: row.check_in_longitude ? parseFloat(row.check_in_longitude) : undefined,
  checkOutLatitude: row.check_out_latitude ? parseFloat(row.check_out_latitude) : undefined,
  checkOutLongitude: row.check_out_longitude ? parseFloat(row.check_out_longitude) : undefined,
  selfieUrl: row.selfie_url || undefined,
  status: row.status,
  createdAt: row.created_at,
});

const formatActiveVisit = (row) => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  shopId: row.shop_id,
  shopName: row.shop_name,
  visitStartTime: row.visit_start_time,
  visitEndTime: row.visit_end_time || undefined,
  latitude: row.latitude ? parseFloat(row.latitude) : undefined,
  longitude: row.longitude ? parseFloat(row.longitude) : undefined,
  durationMinutes: row.duration_minutes,
  remarks: row.remarks,
  status: row.status,
  photos: [],
  createdAt: row.created_at,
});

// GET /api/tracking/live-tracking-page
router.get('/live-tracking-page', authenticate, async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { recordset: fieldStaff } = await query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.role_id,
             r.name as role_name, reg.name as region_name, c.name as city_name
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      LEFT JOIN regions reg ON u.region_id = reg.id
      LEFT JOIN cities c ON u.city_id = c.id
      WHERE u.is_active = 1
        AND r.name IN ('Promoter', 'City Manager')
      ORDER BY u.full_name
    `);

    const { recordset: todayAttendance } = await query(`
      SELECT a.*, u.full_name as user_name
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE CAST(a.check_in_time AS DATE) = ?
    `, [today]);

    const { recordset: activeVisits } = await query(`
      SELECT v.id, v.user_id, v.shop_id, v.visit_start_time, v.visit_end_time,
             v.latitude, v.longitude, v.duration_minutes, v.remarks, v.status, v.created_at,
             u.full_name as user_name, s.shop_name
      FROM visits v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN shops s ON v.shop_id = s.id
      WHERE v.status = 'InProgress'
    `);

    const attendanceByUser = new Map(
      todayAttendance.map((row) => [row.user_id, formatAttendance(row)])
    );
    const visitByUser = new Map(
      activeVisits.map((row) => [row.user_id, formatActiveVisit(row)])
    );

    const lastUpdate = new Date().toISOString();
    const staffTracking = fieldStaff.map((row) => ({
      user: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        roleId: row.role_id,
        roleName: row.role_name,
        regionName: row.region_name,
        cityName: row.city_name,
      },
      attendance: attendanceByUser.get(row.id) || null,
      activeVisit: visitByUser.get(row.id) || null,
      lastUpdate,
    }));

    res.json({ success: true, data: { staffTracking } });
  } catch (err) {
    console.error('live-tracking-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
