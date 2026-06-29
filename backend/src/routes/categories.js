// ============================================================
// FieldForce Enterprise — Phase 2.4
// Categories Management + MIS Sync
// ============================================================
const express = require('express');
const router  = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const baseQuery = `
  SELECT id, mis_id, name, code, description,
         is_active, is_discontinued, discontinued_at,
         source, synced_at, created_at, updated_at
  FROM   categories
`;

const formatCategory = (row) => ({
  id:              row.id,
  misId:           row.mis_id,            // MIS Sync Primary Key (kept separate)
  name:            row.name,
  code:            row.code,
  description:     row.description,
  isActive:        !!row.is_active,
  isDiscontinued:  !!row.is_discontinued,
  discontinuedAt:  row.discontinued_at,
  source:          row.source,            // MANUAL | MIS
  syncedAt:        row.synced_at,
  createdAt:       row.created_at,
  updatedAt:       row.updated_at,
});

const adminOnly = (req, res, next) => {
  if (req.user?.roleName !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ------------------------------------------------------------
// GET /api/categories
// ------------------------------------------------------------
router.get('/', authenticate, async (_req, res) => {
  try {
    const { recordset } = await query(baseQuery + ' ORDER BY created_at DESC', []);
    res.json({ success: true, data: recordset.map(formatCategory) });
  } catch (err) {
    console.error('categories.get:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// GET /api/categories/:id
// ------------------------------------------------------------
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { recordset } = await query(baseQuery + ' WHERE id = ?', [req.params.id]);
    if (!recordset.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: formatCategory(recordset[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// POST /api/categories  — Admin create
// ------------------------------------------------------------
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Uniqueness check
    const { recordset: dup } = await query(
      'SELECT id FROM categories WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))',
      [name.trim()]
    );
    if (dup.length) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }

    const { recordset } = await query(
      `INSERT INTO categories (name, code, description, is_active, source)
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?)`,
      [name.trim(), code || null, description || null, isActive !== false ? 1 : 0, 'MANUAL']
    );

    const { recordset: rows } = await query(baseQuery + ' WHERE id = ?', [recordset[0].id]);
    res.status(201).json({ success: true, data: formatCategory(rows[0]) });
  } catch (err) {
    console.error('categories.create:', err);
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// PUT /api/categories/:id  — Admin update
// ------------------------------------------------------------
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name cannot be empty' });
    }
    if (name !== undefined) {
      const { recordset: dup } = await query(
        'SELECT id FROM categories WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?))) AND id != ?',
        [name.trim(), req.params.id]
      );
      if (dup.length) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
    }

    const updates = [];
    const values  = [];
    if (name        !== undefined) { updates.push('name = ?');        values.push(name.trim()); }
    if (code        !== undefined) { updates.push('code = ?');        values.push(code || null); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
    if (isActive    !== undefined) { updates.push('is_active = ?');   values.push(isActive ? 1 : 0); }

    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });

    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);

    const { recordset: rows } = await query(baseQuery + ' WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: formatCategory(rows[0]) });
  } catch (err) {
    console.error('categories.update:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// PATCH /api/categories/:id/discontinue  — Admin discontinue
// (soft-disable; record is preserved for history)
// ------------------------------------------------------------
router.patch('/:id/discontinue', authenticate, adminOnly, async (req, res) => {
  try {
    await query(
      `UPDATE categories
         SET is_discontinued = 1,
             is_active       = 0,
             discontinued_at = GETDATE(),
             updated_at      = GETDATE()
       WHERE id = ?`,
      [req.params.id]
    );
    const { recordset: rows } = await query(baseQuery + ' WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: formatCategory(rows[0]), message: 'Category discontinued' });
  } catch (err) {
    console.error('categories.discontinue:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// PATCH /api/categories/:id/reactivate
// ------------------------------------------------------------
router.patch('/:id/reactivate', authenticate, adminOnly, async (req, res) => {
  try {
    await query(
      `UPDATE categories
         SET is_discontinued = 0,
             is_active       = 1,
             discontinued_at = NULL,
             updated_at      = GETDATE()
       WHERE id = ?`,
      [req.params.id]
    );
    const { recordset: rows } = await query(baseQuery + ' WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: formatCategory(rows[0]), message: 'Category reactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// POST /api/categories/sync   — Admin: pull from MIS
// ------------------------------------------------------------
// Behaviour (Phase 2.4 spec):
//  1. Fetch list of categories from external MIS API.
//  2. For every incoming record, look up our `mis_id` column.
//     - If a row already exists with the same MIS primary key
//       => SKIP that record (do not overwrite, do not duplicate).
//     - Otherwise => INSERT it as a new local category.
//  3. Respond with a full report:
//        { totalReceived, saved, skipped,
//          savedRecords:   [...],
//          skippedRecords: [...] }    ← shown by the UI at end of sync.
// ============================================================
router.post('/sync', authenticate, adminOnly, async (req, res) => {
  try {
    // Allow the caller (or .env) to specify the MIS endpoint.
    const apiUrl = (req.body && req.body.apiUrl) || process.env.MIS_CATEGORY_API_URL;
    if (!apiUrl) {
      return res.status(400).json({
        success: false,
        message: 'MIS_CATEGORY_API_URL is not configured. Set it in backend/.env or pass apiUrl in the request body.',
      });
    }

    // ----- Step 1: Pull data from MIS -----
    let misRecords;
    try {
      const response = await fetch(apiUrl, {
        method:  'GET',
        headers: {
          'Accept':       'application/json',
          ...(process.env.MIS_API_KEY ? { 'Authorization': `Bearer ${process.env.MIS_API_KEY}` } : {}),
        },
      });
      if (!response.ok) {
        return res.status(502).json({
          success: false,
          message: `MIS API responded ${response.status} ${response.statusText}`,
        });
      }
      const payload = await response.json();
      // Be permissive about MIS response shape
      misRecords = Array.isArray(payload)        ? payload
                 : Array.isArray(payload?.data)  ? payload.data
                 : Array.isArray(payload?.items) ? payload.items
                 : Array.isArray(payload?.result)? payload.result
                 : [];
    } catch (fetchErr) {
      console.error('MIS fetch failed:', fetchErr);
      return res.status(502).json({ success: false, message: `Unable to reach MIS API: ${fetchErr.message}` });
    }

    if (!Array.isArray(misRecords) || misRecords.length === 0) {
      return res.json({
        success: true,
        message: 'MIS returned no records.',
        report: { totalReceived: 0, saved: 0, skipped: 0, savedRecords: [], skippedRecords: [] },
      });
    }

    // ----- Step 2: Get all existing mis_ids in one query -----
    const { recordset: existingRows } = await query(
      'SELECT mis_id FROM categories WHERE mis_id IS NOT NULL', []
    );
    const existingMisIds = new Set(existingRows.map(r => String(r.mis_id)));

    // ----- Step 3: Iterate, skip duplicates, insert the rest -----
    const savedRecords   = [];
    const skippedRecords = [];

    for (const r of misRecords) {
      // Normalise incoming shape — accept several common field names
      const incomingMisId =
        r.mis_id ?? r.misId ?? r.id ?? r.ID ?? r.Id ?? r.categoryId ?? r.CategoryID ?? r.code;
      const incomingName =
        r.name ?? r.category_name ?? r.categoryName ?? r.CategoryName ?? r.title ?? '';
      const incomingCode =
        r.code ?? r.category_code ?? r.categoryCode ?? null;
      const incomingDesc =
        r.description ?? r.desc ?? null;

      if (incomingMisId === undefined || incomingMisId === null || String(incomingMisId).trim() === '') {
        skippedRecords.push({
          misId:  null,
          name:   incomingName,
          reason: 'Missing MIS primary key in source record',
        });
        continue;
      }

      const misIdStr = String(incomingMisId).trim();

      // === Phase 2.4 rule: if MIS PK is already in our Sync PK column → skip ===
      if (existingMisIds.has(misIdStr)) {
        skippedRecords.push({
          misId:  misIdStr,
          name:   incomingName,
          reason: 'MIS primary key already exists in categories (sync key column)',
        });
        continue;
      }

      if (!incomingName || !String(incomingName).trim()) {
        skippedRecords.push({
          misId:  misIdStr,
          name:   '',
          reason: 'Missing category name in source record',
        });
        continue;
      }

      try {
        const { recordset } = await query(
          `INSERT INTO categories (mis_id, name, code, description, is_active, source, synced_at)
           OUTPUT INSERTED.id
           VALUES (?,?,?,?,?,?, GETDATE())`,
          [misIdStr, String(incomingName).trim(), incomingCode, incomingDesc, 1, 'MIS']
        );
        existingMisIds.add(misIdStr); // guard against duplicates inside same payload
        savedRecords.push({
          id:    recordset[0].id,
          misId: misIdStr,
          name:  String(incomingName).trim(),
        });
      } catch (insertErr) {
        // Most likely a unique-name collision with an existing manual entry
        skippedRecords.push({
          misId:  misIdStr,
          name:   String(incomingName).trim(),
          reason:
            insertErr.number === 2627 || insertErr.number === 2601
              ? 'Category name already exists locally'
              : `DB error: ${insertErr.message}`,
        });
      }
    }

    return res.json({
      success: true,
      message: `Sync complete — ${savedRecords.length} saved, ${skippedRecords.length} skipped.`,
      report: {
        totalReceived: misRecords.length,
        saved:         savedRecords.length,
        skipped:       skippedRecords.length,
        savedRecords,
        skippedRecords,
      },
    });
  } catch (err) {
    console.error('categories.sync:', err);
    res.status(500).json({ success: false, message: err.message || 'Sync failed' });
  }
});

module.exports = router;
