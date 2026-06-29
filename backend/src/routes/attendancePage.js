/**
 * AttendancePage — single aggregate API for src/pages/attendance/AttendancePage.tsx
 * GET /api/attendance/attendance-page
 */
const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const attQuery = `
  SELECT a.*, u.full_name as user_name
  FROM attendance a
  LEFT JOIN users u ON a.user_id = u.id
`;

const formatRecord = (row) => ({
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

const getTodayStatus = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const { recordset: rows } = await query(
    attQuery + ' WHERE a.user_id = ? AND CAST(a.check_in_time AS DATE) = ? ORDER BY a.created_at DESC',
    [userId, today]
  );
  return rows.length > 0 ? formatRecord(rows[0]) : null;
};

const getMyHistory = async (userId) => {
  const { recordset: rows } = await query(
    attQuery + ' WHERE a.user_id = ? ORDER BY a.created_at DESC',
    [userId]
  );
  return rows.map(formatRecord);
};

router.get('/attendance-page', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const [todayAttendance, history] = await Promise.all([
      getTodayStatus(userId),
      getMyHistory(userId),
    ]);
    res.json({ success: true, data: { todayAttendance, history } });
  } catch (err) {
    console.error('attendance-page error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
