const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { saveBase64Image } = require('./uploads');

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

const attQuery = `
  SELECT a.*, u.full_name as user_name
  FROM attendance a
  LEFT JOIN users u ON a.user_id = u.id
`;

// GET /api/attendance
router.get('/', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(attQuery + ' ORDER BY a.created_at DESC');
    res.json({ success: true, data: rows.map(formatRecord) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attendance/my
router.get('/my', authenticate, async (req, res) => {
  try {
    const { recordset: rows } = await query(attQuery + ' WHERE a.user_id = ? ORDER BY a.created_at DESC', [req.user.id]);
    res.json({ success: true, data: rows.map(formatRecord) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attendance/today
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { recordset: rows } = await query(
      attQuery + ' WHERE a.user_id = ? AND CAST(a.check_in_time AS DATE) = ? ORDER BY a.created_at DESC',
      [req.user.id, today]
    );
    res.json({ success: true, data: rows.length > 0 ? formatRecord(rows[0]) : null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/check-in
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const { userId, latitude, longitude, selfieUrl } = req.body;
    const uid = userId || req.user.id;

    // Prevent duplicate check-in on same day
    const today = new Date().toISOString().split('T')[0];
    const { recordset: existing } = await query(
      'SELECT id FROM attendance WHERE user_id = ? AND CAST(check_in_time AS DATE) = ?',
      [uid, today]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Already checked in today' });
    }

    // Save selfie if Base64
    let finalSelfieUrl = selfieUrl || null;
    if (selfieUrl && selfieUrl.startsWith('data:')) {
      try {
        const saved = saveBase64Image(selfieUrl, 'selfie');
        finalSelfieUrl = `${req.protocol}://${req.get('host')}${saved.url}`;
      } catch (e) {
        console.warn('Selfie save warning:', e.message);
      }
    }

    const now = new Date();
    const { recordset } = await query(
      `INSERT INTO attendance (user_id,check_in_time,check_in_latitude,check_in_longitude,selfie_url,status)
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?)`,
      [uid, now, latitude || null, longitude || null, finalSelfieUrl, 'CheckedIn']
    );

    const { recordset: rows } = await query(attQuery + ' WHERE a.id = ?', [recordset[0].id]);
    res.status(201).json({ success: true, data: formatRecord(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const { attendanceId, latitude, longitude } = req.body;

    const { recordset: existing } = await query('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    if (existing[0].check_out_time) return res.status(400).json({ success: false, message: 'Already checked out' });

    const now = new Date();
    await query(
      'UPDATE attendance SET check_out_time=?, check_out_latitude=?, check_out_longitude=?, status=?, updated_at=GETDATE() WHERE id=?',
      [now, latitude || null, longitude || null, 'CheckedOut', attendanceId]
    );

    const { recordset: rows } = await query(attQuery + ' WHERE a.id = ?', [attendanceId]);
    res.json({ success: true, data: formatRecord(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
