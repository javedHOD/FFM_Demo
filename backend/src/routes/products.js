// ============================================================
// FieldForce Enterprise — Phase 2.5
// Products Management + MIS Sync (with Category pre-check)
// ============================================================
const express = require('express');
const router  = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const baseQuery = `
  SELECT p.id, p.mis_id, p.name, p.code, p.description,
         p.unit_price, p.uom,
         p.category_id, p.category_mis_id,
         c.name AS category_name,
         p.is_active, p.is_discontinued, p.discontinued_at,
         p.source, p.synced_at, p.created_at, p.updated_at
  FROM   products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

const formatProduct = (row) => ({
  id:              row.id,
  misId:           row.mis_id,                 // MIS Sync Primary Key (kept separate)
  name:            row.name,
  code:            row.code,
  description:     row.description,
  unitPrice:       row.unit_price != null ? Number(row.unit_price) : null,
  uom:             row.uom,
  categoryId:      row.category_id,
  categoryMisId:   row.category_mis_id,
  categoryName:    row.category_name,
  isActive:        !!row.is_active,
  isDiscontinued:  !!row.is_discontinued,
  discontinuedAt:  row.discontinued_at,
  source:          row.source,                 // MANUAL | MIS
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
// GET /api/products
// ------------------------------------------------------------
router.get('/', authenticate, async (_req, res) => {
  try {
    const { recordset } = await query(baseQuery + ' ORDER BY p.created_at DESC', []);
    res.json({ success: true, data: recordset.map(formatProduct) });
  } catch (err) {
    console.error('products.get:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// GET /api/products/:id
// ------------------------------------------------------------
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { recordset } = await query(baseQuery + ' WHERE p.id = ?', [req.params.id]);
    if (!recordset.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: formatProduct(recordset[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// POST /api/products  — Admin create
// ------------------------------------------------------------
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, code, description, unitPrice, uom, categoryId, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    // Verify category exists and isn't discontinued
    const { recordset: catRows } = await query(
      'SELECT id, is_discontinued FROM categories WHERE id = ?', [categoryId]
    );
    if (!catRows.length) {
      return res.status(400).json({ success: false, message: 'Selected category does not exist' });
    }
    if (catRows[0].is_discontinued) {
      return res.status(400).json({ success: false, message: 'Selected category is discontinued' });
    }

    // Uniqueness — product name must be unique within a category
    const { recordset: dup } = await query(
      `SELECT id FROM products
        WHERE category_id = ?
          AND LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))`,
      [categoryId, name.trim()]
    );
    if (dup.length) {
      return res.status(400).json({ success: false, message: 'Product name already exists in this category' });
    }

    const { recordset } = await query(
      `INSERT INTO products (
         name, code, description, unit_price, uom,
         category_id, is_active, source
       )
       OUTPUT INSERTED.id
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        name.trim(),
        code || null,
        description || null,
        unitPrice != null && unitPrice !== '' ? unitPrice : null,
        uom || null,
        categoryId,
        isActive !== false ? 1 : 0,
        'MANUAL',
      ]
    );

    const { recordset: rows } = await query(baseQuery + ' WHERE p.id = ?', [recordset[0].id]);
    res.status(201).json({ success: true, data: formatProduct(rows[0]) });
  } catch (err) {
    console.error('products.create:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// PUT /api/products/:id  — Admin update
// ------------------------------------------------------------
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, code, description, unitPrice, uom, categoryId, isActive } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name cannot be empty' });
    }

    if (categoryId !== undefined) {
      const { recordset: catRows } = await query(
        'SELECT id, is_discontinued FROM categories WHERE id = ?', [categoryId]
      );
      if (!catRows.length) {
        return res.status(400).json({ success: false, message: 'Selected category does not exist' });
      }
    }

    // If renaming or moving category, re-check uniqueness within the (new) category
    if (name !== undefined || categoryId !== undefined) {
      const { recordset: current } = await query(
        'SELECT name, category_id FROM products WHERE id = ?', [req.params.id]
      );
      if (!current.length) return res.status(404).json({ success: false, message: 'Product not found' });

      const checkName = (name        !== undefined ? name.trim() : current[0].name).toLowerCase();
      const checkCat  =  categoryId  !== undefined ? categoryId  : current[0].category_id;

      const { recordset: dup } = await query(
        `SELECT id FROM products
          WHERE category_id = ?
            AND LOWER(LTRIM(RTRIM(name))) = ?
            AND id != ?`,
        [checkCat, checkName, req.params.id]
      );
      if (dup.length) {
        return res.status(400).json({ success: false, message: 'Another product with this name already exists in the category' });
      }
    }

    const updates = [];
    const values  = [];
    if (name        !== undefined) { updates.push('name = ?');        values.push(name.trim()); }
    if (code        !== undefined) { updates.push('code = ?');        values.push(code || null); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
    if (unitPrice   !== undefined) { updates.push('unit_price = ?');  values.push(unitPrice === '' ? null : unitPrice); }
    if (uom         !== undefined) { updates.push('uom = ?');         values.push(uom || null); }
    if (categoryId  !== undefined) { updates.push('category_id = ?'); values.push(categoryId); }
    if (isActive    !== undefined) { updates.push('is_active = ?');   values.push(isActive ? 1 : 0); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });

    updates.push('updated_at = GETDATE()');
    values.push(req.params.id);
    await query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);

    const { recordset: rows } = await query(baseQuery + ' WHERE p.id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: formatProduct(rows[0]) });
  } catch (err) {
    console.error('products.update:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// PATCH /api/products/:id/discontinue
// ------------------------------------------------------------
router.patch('/:id/discontinue', authenticate, adminOnly, async (req, res) => {
  try {
    await query(
      `UPDATE products
         SET is_discontinued = 1,
             is_active       = 0,
             discontinued_at = GETDATE(),
             updated_at      = GETDATE()
       WHERE id = ?`,
      [req.params.id]
    );
    const { recordset: rows } = await query(baseQuery + ' WHERE p.id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: formatProduct(rows[0]), message: 'Product discontinued' });
  } catch (err) {
    console.error('products.discontinue:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------------------------------------------------
// PATCH /api/products/:id/reactivate
// ------------------------------------------------------------
router.patch('/:id/reactivate', authenticate, adminOnly, async (req, res) => {
  try {
    await query(
      `UPDATE products
         SET is_discontinued = 0,
             is_active       = 1,
             discontinued_at = NULL,
             updated_at      = GETDATE()
       WHERE id = ?`,
      [req.params.id]
    );
    const { recordset: rows } = await query(baseQuery + ' WHERE p.id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: formatProduct(rows[0]), message: 'Product reactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// POST /api/products/sync  — Admin: pull products from MIS
// ------------------------------------------------------------
// Phase 2.5 behaviour:
//
//   PRE-CHECK PHASE
//     • Fetch product list from external MIS.
//     • For every incoming product, read its MIS category id.
//     • Look those up in `categories.mis_id` (the Sync PK column).
//     • If ANY of them is missing  →  HALT the sync, return:
//          { success: false,
//            code:    'CATEGORIES_NOT_SYNCED',
//            message: 'Kindly sync category first.',
//            report:  { missingCategories: [...] }
//          }
//
//   IMPORT PHASE  (only if every category is present)
//     • For each incoming product:
//         - if products.mis_id already exists → UPDATE that row
//         - else                              → INSERT a new row
//     • Tag inserts/updates with source='MIS', synced_at=GETDATE().
//     • Build a report with full lists of inserted vs. updated rows.
//
//   Response:
//     { success: true,
//       message: '... saved, ... updated, ... skipped',
//       report: { totalReceived, inserted, updated, skipped,
//                 insertedRecords: [...], updatedRecords: [...],
//                 skippedRecords:  [...] }
//     }
// ============================================================
router.post('/sync', authenticate, adminOnly, async (req, res) => {
  try {
    const apiUrl = (req.body && req.body.apiUrl) || process.env.MIS_PRODUCT_API_URL;
    if (!apiUrl) {
      return res.status(400).json({
        success: false,
        message: 'MIS_PRODUCT_API_URL is not configured. Set it in backend/.env or pass apiUrl in the request body.',
      });
    }

    // -------- Step 1: Fetch from MIS --------
    let misRecords;
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(process.env.MIS_API_KEY ? { Authorization: `Bearer ${process.env.MIS_API_KEY}` } : {}),
        },
      });
      if (!response.ok) {
        return res.status(502).json({
          success: false,
          message: `MIS API responded ${response.status} ${response.statusText}`,
        });
      }
      const payload = await response.json();
      misRecords = Array.isArray(payload)         ? payload
                 : Array.isArray(payload?.data)   ? payload.data
                 : Array.isArray(payload?.items)  ? payload.items
                 : Array.isArray(payload?.result) ? payload.result
                 : [];
    } catch (fetchErr) {
      console.error('MIS product fetch failed:', fetchErr);
      return res.status(502).json({ success: false, message: `Unable to reach MIS API: ${fetchErr.message}` });
    }

    if (!Array.isArray(misRecords) || misRecords.length === 0) {
      return res.json({
        success: true,
        message: 'MIS returned no records.',
        report: {
          totalReceived: 0, inserted: 0, updated: 0, skipped: 0,
          insertedRecords: [], updatedRecords: [], skippedRecords: [],
        },
      });
    }

    // -------- Step 2: Normalise + PRE-CHECK categories --------
    const norm = (r) => {
      const misId       = r.mis_id ?? r.misId ?? r.id ?? r.ID ?? r.Id ?? r.productId ?? r.ProductID ?? r.code;
      const name        = r.name ?? r.product_name ?? r.productName ?? r.ProductName ?? r.title ?? '';
      const code        = r.code ?? r.product_code ?? r.productCode ?? null;
      const description = r.description ?? r.desc ?? null;
      const unitPrice   = r.unit_price ?? r.unitPrice ?? r.price ?? null;
      const uom         = r.uom ?? r.unit ?? null;
      const categoryMisId =
        r.category_mis_id ?? r.categoryMisId ??
        r.category_id     ?? r.categoryId    ??
        r.CategoryID      ?? r.CategoryId    ??
        r.category        ?? null;
      return { misId, name, code, description, unitPrice, uom, categoryMisId, raw: r };
    };

    const incoming = misRecords.map(norm);

    // Pull every category mis_id from DB once
    const { recordset: catRows } = await query(
      'SELECT id, mis_id, is_discontinued FROM categories WHERE mis_id IS NOT NULL', []
    );
    const catMap = new Map(); // mis_id (string) → { id, isDiscontinued }
    for (const c of catRows) {
      catMap.set(String(c.mis_id), { id: c.id, isDiscontinued: !!c.is_discontinued });
    }

    // Find products whose category_mis_id is NOT in our categories table
    const missingMap = new Map(); // categoryMisId → count
    for (const p of incoming) {
      if (p.categoryMisId === undefined || p.categoryMisId === null || String(p.categoryMisId).trim() === '') {
        continue; // handled in import phase as a skip with reason
      }
      const key = String(p.categoryMisId).trim();
      if (!catMap.has(key)) {
        missingMap.set(key, (missingMap.get(key) || 0) + 1);
      }
    }

    if (missingMap.size > 0) {
      const missingCategories = Array.from(missingMap.entries()).map(([catMisId, productCount]) => ({
        categoryMisId: catMisId,
        productCount,
      }));
      return res.status(409).json({
        success: false,
        code:    'CATEGORIES_NOT_SYNCED',
        message: 'Kindly sync category first. Some products reference MIS categories that are not in our database yet.',
        report: {
          totalReceived: incoming.length,
          missingCategoryCount: missingCategories.length,
          missingCategories,   // ← list of new categories that must be synced first
        },
      });
    }

    // -------- Step 3: IMPORT — upsert each product --------
    // Pull all existing product mis_ids in one query (fast lookup)
    const { recordset: existingProdRows } = await query(
      'SELECT id, mis_id FROM products WHERE mis_id IS NOT NULL', []
    );
    const existingProdMap = new Map(); // mis_id → local id
    for (const r of existingProdRows) existingProdMap.set(String(r.mis_id), r.id);

    const insertedRecords = [];
    const updatedRecords  = [];
    const skippedRecords  = [];

    for (const p of incoming) {
      // Validate row
      if (p.misId === undefined || p.misId === null || String(p.misId).trim() === '') {
        skippedRecords.push({ misId: null, name: p.name, reason: 'Missing MIS primary key in source record' });
        continue;
      }
      if (!p.name || !String(p.name).trim()) {
        skippedRecords.push({ misId: String(p.misId), name: '', reason: 'Missing product name in source record' });
        continue;
      }
      if (p.categoryMisId === undefined || p.categoryMisId === null || String(p.categoryMisId).trim() === '') {
        skippedRecords.push({ misId: String(p.misId), name: String(p.name), reason: 'Missing category id in source record' });
        continue;
      }

      const misIdStr  = String(p.misId).trim();
      const catMisStr = String(p.categoryMisId).trim();
      const catEntry  = catMap.get(catMisStr);
      if (!catEntry) {
        // Shouldn't reach here (pre-check would have aborted), but guard anyway
        skippedRecords.push({ misId: misIdStr, name: String(p.name), reason: `Category MIS id ${catMisStr} not in DB` });
        continue;
      }

      const params = [
        String(p.name).trim(),
        p.code || null,
        p.description || null,
        p.unitPrice != null && p.unitPrice !== '' ? p.unitPrice : null,
        p.uom || null,
        catEntry.id,
        catMisStr,
      ];

      try {
        if (existingProdMap.has(misIdStr)) {
          // UPDATE
          const localId = existingProdMap.get(misIdStr);
          await query(
            `UPDATE products
                SET name            = ?,
                    code            = ?,
                    description     = ?,
                    unit_price      = ?,
                    uom             = ?,
                    category_id     = ?,
                    category_mis_id = ?,
                    source          = 'MIS',
                    synced_at       = GETDATE(),
                    updated_at      = GETDATE()
              WHERE id = ?`,
            [...params, localId]
          );
          updatedRecords.push({ id: localId, misId: misIdStr, name: String(p.name).trim(), categoryMisId: catMisStr });
        } else {
          // INSERT
          const { recordset } = await query(
            `INSERT INTO products
               (name, code, description, unit_price, uom, category_id, category_mis_id,
                mis_id, is_active, source, synced_at)
             OUTPUT INSERTED.id
             VALUES (?,?,?,?,?,?,?,?,?,?, GETDATE())`,
            [...params, misIdStr, 1, 'MIS']
          );
          existingProdMap.set(misIdStr, recordset[0].id);
          insertedRecords.push({ id: recordset[0].id, misId: misIdStr, name: String(p.name).trim(), categoryMisId: catMisStr });
        }
      } catch (dbErr) {
        skippedRecords.push({
          misId:  misIdStr,
          name:   String(p.name).trim(),
          reason:
            dbErr.number === 2627 || dbErr.number === 2601
              ? 'Unique constraint conflict (duplicate name in category)'
              : `DB error: ${dbErr.message}`,
        });
      }
    }

    return res.json({
      success: true,
      message: `Sync complete — ${insertedRecords.length} inserted, ${updatedRecords.length} updated, ${skippedRecords.length} skipped.`,
      report: {
        totalReceived:   incoming.length,
        inserted:        insertedRecords.length,
        updated:         updatedRecords.length,
        skipped:         skippedRecords.length,
        insertedRecords,
        updatedRecords,
        skippedRecords,
      },
    });
  } catch (err) {
    console.error('products.sync:', err);
    res.status(500).json({ success: false, message: err.message || 'Sync failed' });
  }
});

module.exports = router;
