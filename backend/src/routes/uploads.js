const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

// ============================================================
// UPLOAD CATEGORY CONFIG
// ============================================================
// Category → subfolder mapping
const UPLOAD_CATEGORIES = {
  selfie: 'selfies',           // Attendance check-in selfies
  'visit-outside': 'visit-photos',  // Visit: outside shop photo
  'visit-shelf': 'visit-photos',    // Visit: shelf photo
  'visit-selfie': 'visit-photos',   // Visit: selfie with shopkeeper
  'visit-photo': 'visit-photos',    // Generic visit photo
  shop: 'shop-photos',         // Shop images
  profile: 'profiles',         // User profile photos
  temp: 'temp',                // Temporary / uncategorised
};

const UPLOADS_BASE = path.join(__dirname, '../../uploads');

// Ensure all upload directories exist on startup
const ensureUploadDirs = () => {
  const dirs = [
    'selfies',
    'visit-photos',
    'shop-photos',
    'profiles',
    'temp',
  ];
  dirs.forEach(dir => {
    const fullPath = path.join(UPLOADS_BASE, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created upload dir: uploads/${dir}`);
    }
  });
};

ensureUploadDirs();

// ============================================================
// MULTER STORAGE — disk storage with category-aware destination
// ============================================================
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const category = req.query.category || req.body.category || 'temp';
    const subdir = UPLOAD_CATEGORIES[category] || 'temp';
    const destPath = path.join(UPLOADS_BASE, subdir);
    // Ensure directory exists (safety net)
    fs.mkdirSync(destPath, { recursive: true });
    cb(null, destPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/i;
  const extOk = allowed.test(path.extname(file.originalname));
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// ============================================================
// HELPER: save Base64 string as a file
// ============================================================
const saveBase64Image = (base64String, category, customName = null) => {
  // Strip data URI prefix if present: "data:image/jpeg;base64,..."
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  let buffer;
  let ext = '.jpg';

  if (matches) {
    const mimeType = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
    ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/gif' ? '.gif' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  } else {
    // Plain base64 without prefix
    buffer = Buffer.from(base64String, 'base64');
  }

  const subdir = UPLOAD_CATEGORIES[category] || 'temp';
  const destPath = path.join(UPLOADS_BASE, subdir);
  fs.mkdirSync(destPath, { recursive: true });

  const filename = customName || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(destPath, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    filename,
    category,
    subfolder: subdir,
    url: `/uploads/${subdir}/${filename}`,
    fullUrl: `${process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/${subdir}/${filename}`,
    size: buffer.length,
  };
};

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /api/uploads/file
 * Upload one or more image files via multipart/form-data
 *
 * Query params:
 *   ?category=selfie|visit-outside|visit-shelf|visit-selfie|visit-photo|shop|profile|temp
 *
 * Form fields:
 *   file  — single file
 *   files — multiple files (up to 5)
 */
router.post('/file', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    // Also handle single "file" field
    let files = req.files || [];
    if (req.file) files = [req.file];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Use field name "files" (or "file").' });
    }

    const category = req.query.category || req.body.category || 'temp';
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const result = files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      category,
      subfolder: UPLOAD_CATEGORIES[category] || 'temp',
      url: `/uploads/${UPLOAD_CATEGORIES[category] || 'temp'}/${f.filename}`,
      fullUrl: `${baseUrl}/uploads/${UPLOAD_CATEGORIES[category] || 'temp'}/${f.filename}`,
      size: f.size,
      mimetype: f.mimetype,
    }));

    res.json({
      success: true,
      message: `${result.length} file(s) uploaded`,
      data: result.length === 1 ? result[0] : result,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

/**
 * POST /api/uploads/base64
 * Upload a Base64-encoded image (from camera capture / canvas)
 *
 * Body (JSON):
 *   {
 *     "image": "data:image/jpeg;base64,/9j/...",  ← full data URI or plain base64
 *     "category": "selfie",                        ← optional, defaults to "temp"
 *     "filename": "my-selfie.jpg"                  ← optional custom filename
 *   }
 */
router.post('/base64', authenticate, async (req, res) => {
  try {
    const { image, category = 'temp', filename } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: '"image" field is required (Base64 string or data URI)' });
    }

    const result = saveBase64Image(image, category, filename);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    result.fullUrl = `${baseUrl}${result.url}`;

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Base64 upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

/**
 * POST /api/uploads/base64/batch
 * Upload multiple Base64 images at once (e.g. all 3 visit photos)
 *
 * Body (JSON):
 *   {
 *     "images": [
 *       { "image": "data:image/jpeg;base64,...", "category": "visit-outside", "filename": "outside.jpg" },
 *       { "image": "data:image/jpeg;base64,...", "category": "visit-shelf" },
 *       { "image": "data:image/jpeg;base64,...", "category": "visit-selfie" }
 *     ]
 *   }
 */
router.post('/base64/batch', authenticate, async (req, res) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: '"images" array is required' });
    }
    if (images.length > 10) {
      return res.status(400).json({ success: false, message: 'Maximum 10 images per batch' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const results = images.map(({ image, category = 'temp', filename }) => {
      const result = saveBase64Image(image, category, filename);
      result.fullUrl = `${baseUrl}${result.url}`;
      return result;
    });

    res.json({ success: true, message: `${results.length} image(s) saved`, data: results });
  } catch (err) {
    console.error('Batch upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Batch upload failed' });
  }
});

/**
 * DELETE /api/uploads/file/:category/:filename
 * Delete an uploaded file
 */
router.delete('/file/:category/:filename', authenticate, async (req, res) => {
  try {
    const { category, filename } = req.params;
    const subdir = UPLOAD_CATEGORIES[category] || category;
    const filePath = path.join(UPLOADS_BASE, subdir, filename);

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(UPLOADS_BASE);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

/**
 * GET /api/uploads/info
 * Return category list and upload folder sizes (admin info)
 */
router.get('/info', authenticate, async (req, res) => {
  try {
    const info = Object.entries(UPLOAD_CATEGORIES).reduce((acc, [cat, subdir]) => {
      if (!acc[subdir]) {
        const folderPath = path.join(UPLOADS_BASE, subdir);
        let count = 0;
        try {
          count = fs.readdirSync(folderPath).length;
        } catch { /* folder may not exist yet */ }
        acc[subdir] = { subfolder: subdir, categories: [], fileCount: count };
      }
      acc[subdir].categories.push(cat);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        baseUrl: `/uploads`,
        categories: UPLOAD_CATEGORIES,
        folders: Object.values(info),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = { router, saveBase64Image };
