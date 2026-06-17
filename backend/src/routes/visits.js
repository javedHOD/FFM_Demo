const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { saveBase64Image } = require('./uploads');

const PHOTO_CATEGORY_MAP = {
  OutsideShop:          'visit-outside',
  ShelfPhoto:           'visit-shelf',
  SelfieWithShopkeeper: 'visit-selfie',
};

const visitQuery = `
  SELECT v.*, u.full_name as user_name, s.shop_name
  FROM visits v
  LEFT JOIN users u ON v.user_id = u.id
  LEFT JOIN shops s ON v.shop_id = s.id
`;

const formatVisit = async (row, host = '') => {
  const { recordset: photos } = await query(
    'SELECT * FROM visit_photos WHERE visit_id = ? ORDER BY created_at',
    [row.id]
  );
  return {
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
    photos: photos.map(p => ({
      id: p.id,
      visitId: p.visit_id,
      photoType: p.photo_type,
      photoUrl: p.photo_url,
      createdAt: p.created_at,
    })),
    createdAt: row.created_at,
  };
};

const resolvePhotoUrl = (photoUrl, photoType, host) => {
  if (photoUrl && photoUrl.startsWith('data:')) {
    const category = PHOTO_CATEGORY_MAP[photoType] || 'visit-photo';
    const saved = saveBase64Image(photoUrl, category);
    return `${host}${saved.url}`;
  }
  return photoUrl;
};

// GET /api/visits/my  (must come before /:id)
router.get('/my', authenticate, async (req, res) => {
  try {
    const host = `${req.protocol}://${req.get('host')}`;
    const { recordset: rows } = await query(
      visitQuery + ' WHERE v.user_id = ? ORDER BY v.created_at DESC',
      [req.user.id]
    );
    const visits = await Promise.all(rows.map(r => formatVisit(r, host)));
    res.json({ success: true, data: visits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/visits/start  (must come before /:id)
router.post('/start', authenticate, async (req, res) => {
  try {
    const { userId, shopId, latitude, longitude } = req.body;
    if (!shopId) return res.status(400).json({ success: false, message: 'shopId is required' });

    const uid = userId || req.user.id;
    const host = `${req.protocol}://${req.get('host')}`;
    const now = new Date();

    const { recordset } = await query(
      `INSERT INTO visits (user_id,shop_id,visit_start_time,latitude,longitude,status)
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?)`,
      [uid, shopId, now, latitude || null, longitude || null, 'InProgress']
    );

    const { recordset: rows } = await query(visitQuery + ' WHERE v.id = ?', [recordset[0].id]);
    res.status(201).json({ success: true, data: await formatVisit(rows[0], host) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/visits
router.get('/', authenticate, async (req, res) => {
  try {
    const host = `${req.protocol}://${req.get('host')}`;
    const { recordset: rows } = await query(visitQuery + ' ORDER BY v.created_at DESC');
    const visits = await Promise.all(rows.map(r => formatVisit(r, host)));
    res.json({ success: true, data: visits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/visits/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const host = `${req.protocol}://${req.get('host')}`;
    const { recordset: rows } = await query(visitQuery + ' WHERE v.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Visit not found' });
    res.json({ success: true, data: await formatVisit(rows[0], host) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/visits/:id/complete
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const { remarks, photos } = req.body;
    const host = `${req.protocol}://${req.get('host')}`;

    const { recordset: existing } = await query('SELECT * FROM visits WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Visit not found' });

    const now = new Date();
    const startTime = new Date(existing[0].visit_start_time);
    const durationMinutes = Math.max(0, Math.round((now - startTime) / 60000));

    await query(
      'UPDATE visits SET [status]=?, visit_end_time=?, duration_minutes=?, remarks=?, updated_at=GETDATE() WHERE id=?',
      ['Completed', now, durationMinutes, remarks || null, req.params.id]
    );

    if (Array.isArray(photos) && photos.length > 0) {
      for (const photo of photos) {
        const finalUrl = resolvePhotoUrl(photo.photoUrl, photo.photoType, host);
        await query(
          'INSERT INTO visit_photos (visit_id,photo_type,photo_url) VALUES (?,?,?)',
          [req.params.id, photo.photoType, finalUrl]
        );
      }
    }

    const { recordset: rows } = await query(visitQuery + ' WHERE v.id = ?', [req.params.id]);
    res.json({ success: true, data: await formatVisit(rows[0], host) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/visits/:id/photos
router.post('/:id/photos', authenticate, async (req, res) => {
  try {
    const { photos } = req.body;
    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ success: false, message: 'photos array is required' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const inserted = [];
    for (const photo of photos) {
      const finalUrl = resolvePhotoUrl(photo.photoUrl, photo.photoType, host);
      const { recordset } = await query(
        'INSERT INTO visit_photos (visit_id,photo_type,photo_url) OUTPUT INSERTED.id VALUES (?,?,?)',
        [req.params.id, photo.photoType, finalUrl]
      );
      inserted.push({
        id: recordset[0].id,
        visitId: parseInt(req.params.id),
        photoType: photo.photoType,
        photoUrl: finalUrl,
        createdAt: new Date(),
      });
    }

    res.json({ success: true, data: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
