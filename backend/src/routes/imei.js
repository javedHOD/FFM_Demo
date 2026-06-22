const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const https = require('https');
const http = require('http');

const IMEI_API_URL = 'http://dist.siccotelmis.com/api/DistributorAppAPI/IMEIList';
const IMEI_API_TOKEN = 'A7K9X2M8P4Q1R6T3Y5U8W2N7Z4B1';

// Test IMEI numbers that return dummy data (for development/testing)
const DUMMY_IMEIS = new Set(['865901088912346', '356789112233445', '490154203237518']);

const DUMMY_DATA = {
  '865901088912346': {
    Region: 'Riyadh', City: 'Riyadh', ShopName: 'Ronin',
    CustomerName: 'Omar Al-Shamri', CompanyName: 'Siccotel',
    ProductName: 'Samsung Galaxy A15', ProductCategory: 'Mobile',
    IMEINo: '865901088912346', InvoiceNo: 'INV-1001', InvoiceDate: '2026-06-18',
  },
  '356789112233445': {
    Region: 'Eastern Region', City: 'Dammam', ShopName: 'SF Traders',
    CustomerName: 'Ahmed Saleh', CompanyName: 'Siccotel',
    ProductName: 'iPhone 13', ProductCategory: 'Mobile',
    IMEINo: '356789112233445', InvoiceNo: 'INV-1002', InvoiceDate: '2026-06-17',
  },
  '490154203237518': {
    Region: 'Makkah', City: 'Jeddah', ShopName: 'City Mobile Hub',
    CustomerName: 'Faisal Khan', CompanyName: 'Siccotel',
    ProductName: 'Infinix Note 40', ProductCategory: 'Mobile',
    IMEINo: '490154203237518', InvoiceNo: 'INV-1003', InvoiceDate: '2026-06-16',
  },
};

const generateLogId = () => {
  return 'IMEI-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
};

/**
 * Call external IMEI API
 */
const callExternalImeiApi = async (imei) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ Token: IMEI_API_TOKEN, IMEI: imei });
    const url = new URL(IMEI_API_URL);
    const clientLib = url.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
      },
      timeout: 15000,
    };

    const req = clientLib.request(url.href, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          console.log(`[IMEI API] Response status: ${res.statusCode}`);
          console.log(`[IMEI API] Raw response: ${data.substring(0, 500)}`);
          
          const parsed = JSON.parse(data);
          
          // Handle different response formats
          let result;
          if (Array.isArray(parsed) && parsed.length > 0) {
            result = parsed[0];
          } else if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
            result = parsed.data[0];
          } else if (parsed.Result && Array.isArray(parsed.Result) && parsed.Result.length > 0) {
            result = parsed.Result[0];
          } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            result = parsed;
          }
          
          resolve(result || null);
        } catch (err) {
          console.error(`[IMEI API] JSON parse error:`, err.message);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[IMEI API] Request error:`, err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API request timed out'));
    });

    req.write(postData);
    req.end();
  });
};

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

    // Check for duplicate within same visit
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

    let resultData;
    let isDummy = false;

    // Check if it's a dummy/test IMEI
    if (DUMMY_IMEIS.has(trimmedImei)) {
      console.log('[IMEI Verify] Using dummy data for test IMEI');
      resultData = DUMMY_DATA[trimmedImei];
      isDummy = true;
    } else {
      // Call live external API
      console.log(`[IMEI Verify] Calling external API for IMEI: ${trimmedImei}`);
      try {
        resultData = await callExternalImeiApi(trimmedImei);
      } catch (apiErr) {
        console.error('[IMEI Verify] External API call failed:', apiErr.message);
        return res.json({
          status: '0',
          message: 'Unable to verify IMEI. Please try again.',
        });
      }
    }

    if (!resultData) {
      console.log('[IMEI Verify] No record found');
      return res.json({
        status: '0',
        message: 'No record found against this IMEI number.',
      });
    }

    console.log('[IMEI Verify] Record found, saving to database...');

    // Save verification log to database
    const logId = generateLogId();
    const invoiceDate = resultData.InvoiceDate ? new Date(resultData.InvoiceDate) : null;

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
        resultData.Region || resultData.region || null,
        resultData.City || resultData.city || null,
        trimmedImei,
        resultData.InvoiceNo || resultData.invoiceNo || null,
        invoiceDate,
        resultData.CustomerName || resultData.customerName || null,
        resultData.CompanyName || resultData.companyName || null,
        resultData.ProductName || resultData.productName || null,
        resultData.ProductCategory || resultData.productCategory || null,
        Lat || null,
        Long || null,
        new Date(),
        JSON.stringify(resultData),
        isDummy ? 1 : 0,
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
    const { dateFrom, dateTo, region, city, promoterId, shopId, imei, productCategory } = req.query;

    let sql = `
      SELECT l.*,
             u.full_name as promoter_user_name,
             s.shop_name as visit_shop_name,
             v.visit_start_time
      FROM IMEIVerificationLog l
      LEFT JOIN users u ON l.PromoterUserId = u.id
      LEFT JOIN shops s ON l.ShopId = s.id
      LEFT JOIN visits v ON l.VisitId = v.id
      WHERE l.IsDeleted = 0
    `;
    const params = [];

    if (dateFrom) { sql += ' AND CAST(l.ScanDatetime AS DATE) >= ?'; params.push(dateFrom); }
    if (dateTo) { sql += ' AND CAST(l.ScanDatetime AS DATE) <= ?'; params.push(dateTo); }
    if (region) { sql += ' AND l.Region = ?'; params.push(region); }
    if (city) { sql += ' AND l.City = ?'; params.push(city); }
    if (promoterId) { sql += ' AND l.PromoterUserId = ?'; params.push(Number(promoterId)); }
    if (shopId) { sql += ' AND l.ShopId = ?'; params.push(Number(shopId)); }
    if (imei) { sql += ' AND l.ScanIMEI LIKE ?'; params.push(`%${imei}%`); }
    if (productCategory) { sql += ' AND l.ProductCategory = ?'; params.push(productCategory); }

    // Non-admin users can only see their own logs
    if (req.user.roleName !== 'Admin') {
      sql += ' AND l.PromoterUserId = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY l.ScanDatetime DESC';

    const { recordset: rows } = await query(sql, params);

    const logs = rows.map(row => ({
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
    }));

    res.json({ success: true, data: logs });
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
    const { dateFrom, dateTo, region, city, promoterId, shopId, imei, productCategory } = req.query;

    let sql = `
      SELECT l.PromoterName, l.ShopName, l.Region, l.City,
             l.ScanIMEI, l.InvoiceNo, l.InvoiceDate, l.CustomerName,
             l.ApiCompanyName, l.ProductName, l.ProductCategory,
             l.Lat, l.Long, l.ScanDatetime
      FROM IMEIVerificationLog l
      WHERE l.IsDeleted = 0
    `;
    const params = [];

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

    sql += ' ORDER BY l.ScanDatetime DESC';

    const { recordset: rows } = await query(sql, params);

    const headers = ['Promoter Name', 'Shop Name', 'Region', 'City', 'Scan IMEI', 'Invoice No', 'Invoice Date', 'Customer Name', 'Company Name', 'Product Name', 'Product Category', 'Lat', 'Long', 'Scan Datetime'];
    const csvRows = [headers.join(',')];

    rows.forEach(row => {
      const values = [
        `"${row.PromoterName || ''}"`,
        `"${row.ShopName || ''}"`,
        `"${row.Region || ''}"`,
        `"${row.City || ''}"`,
        `"${row.ScanIMEI || ''}"`,
        `"${row.InvoiceNo || ''}"`,
        `"${row.InvoiceDate || ''}"`,
        `"${row.CustomerName || ''}"`,
        `"${row.ApiCompanyName || ''}"`,
        `"${row.ProductName || ''}"`,
        `"${row.ProductCategory || ''}"`,
        row.Lat || '',
        row.Long || '',
        `"${row.ScanDatetime || ''}"`,
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="imei_verification_log_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('[IMEI Export] Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
