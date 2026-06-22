const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const https = require('https');
const http = require('http');

const IMEI_API_URL = process.env.IMEI_API_URL || 'http://dist.siccotelmis.com/api/DistributorAppAPI/IMEIList';
const IMEI_API_TOKEN = process.env.IMEI_API_TOKEN || 'A7K9X2M8P4Q1R6T3Y5U8W2N7Z4B1';

const generateLogId = () =>
  `IMEI-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

const pickField = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const parseApiResponse = (raw) => {
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
  if (Array.isArray(parsed?.data) && parsed.data.length > 0) return parsed.data[0];
  if (Array.isArray(parsed?.Result) && parsed.Result.length > 0) return parsed.Result[0];
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;

  return null;
};

const callExternalImeiApi = (imei) =>
  new Promise((resolve, reject) => {
    const postData = JSON.stringify({ Token: IMEI_API_TOKEN, IMEI: imei });
    const url = new URL(IMEI_API_URL);
    const clientLib = url.protocol === 'https:' ? https : http;

    const req = clientLib.request(
      url.href,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          Accept: 'application/json',
        },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            console.log(`[IMEI API] Response status: ${res.statusCode}`);
            if (data) console.log(`[IMEI API] Raw response: ${data.substring(0, 500)}`);
            resolve(parseApiResponse(data));
          } catch (err) {
            console.error('[IMEI API] JSON parse error:', err.message);
            resolve({ found: false, data: null, message: 'Invalid API response.', statusCode: null, raw: null });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('[IMEI API] Request error:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API request timed out'));
    });

    req.write(postData);
    req.end();
  });

const buildLogFilters = (req) => {
  const { dateFrom, dateTo, region, city, promoterId, shopId, imei, productCategory } = req.query;
  const params = [];
  let sql = ' WHERE l.IsDeleted = 0';

  if (dateFrom) { sql += ' AND CAST(l.ScanDatetime AS DATE) >= ?'; params.push(dateFrom); }
  if (dateTo) { sql += ' AND CAST(l.ScanDatetime AS DATE) <= ?'; params.push(dateTo); }
  if (region) { sql += ' AND l.Region = ?'; params.push(region); }
  if (city) { sql += ' AND l.City = ?'; params.push(city); }
  if (promoterId) { sql += ' AND l.PromoterUserId = ?'; params.push(Number(promoterId)); }
  if (shopId) { sql += ' AND l.ShopId = ?'; params.push(Number(shopId)); }
  if (imei) { sql += ' AND l.ScanIMEI LIKE ?'; params.push(`%${imei}%`); }
  if (productCategory) { sql += ' AND l.ProductCategory = ?'; params.push(productCategory); }

  if (req.user.roleName !== 'Admin') {
    sql += ' AND l.PromoterUserId = ?';
    params.push(req.user.id);
  }

  return { sql, params };
};

const getDuplicationCheckEnabled = async () => {
  const { recordset } = await query('SELECT TOP 1 duplication_check FROM admin_settings');
  if (!recordset.length) return false;
  return recordset[0].duplication_check === 1 || recordset[0].duplication_check === true;
};

const mapLogToApiResult = (row) => ({
  Region: row.Region,
  City: row.City,
  ShopName: row.ShopName,
  CustomerName: row.CustomerName,
  CompanyName: row.ApiCompanyName,
  ProductName: row.ProductName,
  ProductCategory: row.ProductCategory,
  IMEINo: row.ScanIMEI,
  InvoiceNo: row.InvoiceNo,
  InvoiceDate: row.InvoiceDate,
});

const mapLogRow = (row) => ({
  IMEIVerificationLogId: row.IMEIVerificationLogId,
  PromoterUserId: row.PromoterUserId,
  PromoterName: row.PromoterName,
  VisitId: row.VisitId,
  ShopId: row.ShopId,
  ShopName: row.ShopName || row.visit_shop_name,
  Region: row.Region,
  City: row.City,
  ScanIMEI: row.ScanIMEI,
  InvoiceNo: row.InvoiceNo,
  InvoiceDate: row.InvoiceDate,
  CustomerName: row.CustomerName,
  ApiCompanyName: row.ApiCompanyName,
  ProductName: row.ProductName,
  ProductCategory: row.ProductCategory,
  Lat: row.Lat,
  Long: row.Long,
  ScanDatetime: row.ScanDatetime,
  IsDummy: row.IsDummy === 1,
});

/**
 * POST /api/imei/verify
 * Body: { visitId, shopId, shopName, IMEI, Lat, Long }
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { visitId, shopId, shopName, IMEI, Lat, Long } = req.body;

    console.log(`[IMEI Verify] Request received - IMEI: ${IMEI}, VisitId: ${visitId}, ShopId: ${shopId}`);

    if (!IMEI || typeof IMEI !== 'string' || IMEI.trim().length === 0) {
      return res.status(400).json({ status: '0', message: 'IMEI is required' });
    }

    if (!visitId || !shopId) {
      return res.status(400).json({ status: '0', message: 'Visit ID and Shop ID are required' });
    }

    const trimmedImei = IMEI.trim();
    const allowDuplication = await getDuplicationCheckEnabled();

    if (allowDuplication) {
      const { recordset: existingUserLogs } = await query(
        `SELECT TOP 1 * FROM IMEIVerificationLog
         WHERE PromoterUserId = ? AND ScanIMEI = ? AND IsDeleted = 0
         ORDER BY ScanDatetime DESC`,
        [req.user.id, trimmedImei]
      );

      if (existingUserLogs.length > 0) {
        const existing = existingUserLogs[0];
        console.log(`[IMEI Verify] Returning cached result for user ${req.user.id}, IMEI: ${trimmedImei}`);
        return res.json({
          status: '1',
          message: 'IMEI verified successfully.',
          data: mapLogToApiResult(existing),
        });
      }
    } else {
      const { recordset: duplicates } = await query(
        `SELECT TOP 1 IMEIVerificationLogId FROM IMEIVerificationLog
         WHERE VisitId = ? AND ScanIMEI = ? AND IsDeleted = 0`,
        [visitId, trimmedImei]
      );

      if (duplicates.length > 0) {
        return res.json({
          status: '0',
          message: 'This IMEI has already been verified in this visit.',
        });
      }
    }

    let apiResult;
    try {
      console.log(`[IMEI Verify] Calling external API for IMEI: ${trimmedImei}`);
      apiResult = await callExternalImeiApi(trimmedImei);
    } catch (apiErr) {
      console.error('[IMEI Verify] External API call failed:', apiErr.message);
      return res.json({
        status: '0',
        message: 'Unable to verify IMEI. Please try again.',
      });
    }

    if (!apiResult?.found || !apiResult.data) {
      const notFoundMessage = apiResult?.message || 'No record found against this IMEI number.';
      console.log(`[IMEI Verify] No record found — StatusCode: ${apiResult?.statusCode ?? 'n/a'}, Message: ${notFoundMessage}`);
      return res.json({
        status: '0',
        message: notFoundMessage,
      });
    }

    const resultData = apiResult.data;

    const logId = generateLogId();
    const invoiceDateRaw = pickField(resultData, 'InvoiceDate', 'invoiceDate');
    const invoiceDate = invoiceDateRaw ? new Date(invoiceDateRaw) : null;

    await query(
      `INSERT INTO IMEIVerificationLog (
        IMEIVerificationLogId, CompanyId, PromoterUserId, PromoterName,
        VisitId, ShopId, ShopName, Region, City, ScanIMEI,
        InvoiceNo, InvoiceDate, CustomerName, ApiCompanyName,
        ProductName, ProductCategory, Lat, Long,
        ScanDatetime, ApiResponse, IsDummy, CreatedBy
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        logId,
        null,
        req.user.id,
        req.user.fullName,
        visitId,
        shopId,
        shopName || null,
        pickField(resultData, 'Region', 'region'),
        pickField(resultData, 'City', 'city'),
        trimmedImei,
        pickField(resultData, 'InvoiceNo', 'invoiceNo'),
        invoiceDate,
        pickField(resultData, 'CustomerName', 'customerName'),
        pickField(resultData, 'CompanyName', 'companyName'),
        pickField(resultData, 'ProductName', 'productName'),
        pickField(resultData, 'ProductCategory', 'productCategory'),
        Lat || null,
        Long || null,
        new Date(),
        JSON.stringify(apiResult.raw ?? resultData),
        0,
        req.user.fullName,
      ]
    );

    console.log('[IMEI Verify] Log saved successfully with ID:', logId);

    res.json({
      status: '1',
      message: 'IMEI verified successfully.',
      data: resultData,
    });
  } catch (err) {
    console.error('[IMEI Verify] Unexpected error:', err);
    res.status(500).json({ status: '0', message: 'Internal server error' });
  }
});

/**
 * GET /api/imei/logs
 * Query: dateFrom, dateTo, region, city, promoterId, shopId, imei, productCategory
 */
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { sql: filterSql, params } = buildLogFilters(req);

    const { recordset: rows } = await query(
      `SELECT l.*,
              u.full_name as promoter_user_name,
              s.shop_name as visit_shop_name,
              v.visit_start_time
       FROM IMEIVerificationLog l
       LEFT JOIN users u ON l.PromoterUserId = u.id
       LEFT JOIN shops s ON l.ShopId = s.id
       LEFT JOIN visits v ON l.VisitId = v.id
       ${filterSql}
       ORDER BY l.ScanDatetime DESC`,
      params
    );

    res.json({ success: true, data: rows.map(mapLogRow) });
  } catch (err) {
    console.error('[IMEI Logs] Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/imei/logs/export
 * Same filters as /logs — returns CSV data
 */
router.get('/logs/export', authenticate, async (req, res) => {
  try {
    const { sql: filterSql, params } = buildLogFilters(req);

    const { recordset: rows } = await query(
      `SELECT l.PromoterName, l.ShopName, l.Region, l.City,
              l.ScanIMEI, l.InvoiceNo, l.InvoiceDate, l.CustomerName,
              l.ApiCompanyName, l.ProductName, l.ProductCategory,
              l.Lat, l.Long, l.ScanDatetime
       FROM IMEIVerificationLog l
       ${filterSql}
       ORDER BY l.ScanDatetime DESC`,
      params
    );

    const headers = [
      'Promoter Name', 'Shop Name', 'Region', 'City', 'Scan IMEI',
      'Invoice No', 'Invoice Date', 'Customer Name', 'Company Name',
      'Product Name', 'Product Category', 'Lat', 'Long', 'Scan Datetime',
    ];

    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => [
        escapeCsv(row.PromoterName),
        escapeCsv(row.ShopName),
        escapeCsv(row.Region),
        escapeCsv(row.City),
        escapeCsv(row.ScanIMEI),
        escapeCsv(row.InvoiceNo),
        escapeCsv(row.InvoiceDate),
        escapeCsv(row.CustomerName),
        escapeCsv(row.ApiCompanyName),
        escapeCsv(row.ProductName),
        escapeCsv(row.ProductCategory),
        row.Lat ?? '',
        row.Long ?? '',
        escapeCsv(row.ScanDatetime),
      ].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="imei_verification_log_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('[IMEI Export] Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/imei/settings
 * Admin only — returns duplication_check setting
 */
router.get('/settings', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const enabled = await getDuplicationCheckEnabled();
    res.json({ success: true, data: { duplicationCheck: enabled } });
  } catch (err) {
    console.error('[IMEI Settings] GET error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/imei/settings
 * Admin only — body: { duplicationCheck: boolean }
 */
router.put('/settings', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { duplicationCheck } = req.body;
    if (typeof duplicationCheck !== 'boolean') {
      return res.status(400).json({ success: false, message: 'duplicationCheck must be a boolean' });
    }

    const { recordset } = await query('SELECT TOP 1 id FROM admin_settings');
    if (recordset.length) {
      await query(
        'UPDATE admin_settings SET duplication_check = ?, updated_at = GETDATE(), updated_by = ? WHERE id = ?',
        [duplicationCheck ? 1 : 0, req.user.fullName, recordset[0].id]
      );
    } else {
      await query(
        'INSERT INTO admin_settings (duplication_check, updated_by) VALUES (?, ?)',
        [duplicationCheck ? 1 : 0, req.user.fullName]
      );
    }

    res.json({ success: true, data: { duplicationCheck }, message: 'Settings saved' });
  } catch (err) {
    console.error('[IMEI Settings] PUT error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
