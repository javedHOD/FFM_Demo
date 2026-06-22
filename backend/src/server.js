require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { testConnection } = require('./db/connection');
const { initDatabase } = require('./db/init');

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const shopsRoutes = require('./routes/shops');
const attendanceRoutes = require('./routes/attendance');
const visitsRoutes = require('./routes/visits');
const salesRoutes = require('./routes/sales');
const ordersRoutes = require('./routes/orders');
const reportsRoutes = require('./routes/reports');
const locationRoutes = require('./routes/location');
const hrRoutes = require('./routes/hr');
const { router: uploadsRouter } = require('./routes/uploads');
const imeiRoutes = require('./routes/imei');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// ENSURE UPLOAD DIRECTORIES EXIST ON STARTUP
// ============================================================
const UPLOADS_BASE = path.join(__dirname, '../uploads');
const UPLOAD_DIRS = ['selfies', 'visit-photos', 'shop-photos', 'profiles', 'temp'];

const ensureUploadDirs = () => {
  UPLOAD_DIRS.forEach(dir => {
    const fullPath = path.join(UPLOADS_BASE, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// ============================================================
// MIDDLEWARE — CORS (open: any frontend origin can call the API)
// ============================================================
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Large JSON limit to support Base64 image strings
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

// ============================================================
// STATIC FILE SERVING  — serve uploaded images publicly
// URL: http://localhost:5000/uploads/<category>/<filename>
// ============================================================
app.use('/uploads', express.static(UPLOADS_BASE, {
  maxAge: '7d',   // cache images for 7 days in browser
  etag: true,
}));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'FieldForce API is running',
    timestamp: new Date().toISOString(),
    uploads: {
      base: '/uploads',
      categories: {
        selfies:      '/uploads/selfies/',
        visitPhotos:  '/uploads/visit-photos/',
        shopPhotos:   '/uploads/shop-photos/',
        profiles:     '/uploads/profiles/',
        temp:         '/uploads/temp/',
      },
    },
  });
});

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth',       authRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/shops',      shopsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/visits',     visitsRoutes);
app.use('/api/sales',      salesRoutes);
app.use('/api/orders',     ordersRoutes);
app.use('/api/reports',    reportsRoutes);
app.use('/api/location',   locationRoutes);
app.use('/api/hr',         hrRoutes);
app.use('/api/uploads',    uploadsRouter);
app.use('/api/imei',       imeiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max size is 10 MB.' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ============================================================
// BOOTSTRAP
// ============================================================
const bootstrap = async () => {
  console.log('\n🚀 FieldForce Enterprise Backend');
  console.log('================================');
  console.log(`📡 Port:     ${PORT}`);
  console.log(`🌐 CORS:     open (all origins allowed)`);
  console.log(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT || 1433}/${process.env.DB_NAME}`);
  console.log('================================\n');

  ensureUploadDirs();
  await testConnection();
  await initDatabase();

  const server = app.listen(PORT, () => {
    console.log(`\n✅ Server running at  http://localhost:${PORT}`);
    console.log(`✅ API base URL       http://localhost:${PORT}/api`);
    console.log(`✅ Uploads served at  http://localhost:${PORT}/uploads`);
    console.log(`✅ Health check       http://localhost:${PORT}/api/health\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error(`   Run this to fix: npx kill-port ${PORT}`);
      console.error(`   Or set a different PORT in .env\n`);
    } else {
      console.error('❌ Server error:', err.message);
    }
    process.exit(1);
  });

  // Graceful shutdown — releases the port so nodemon can restart cleanly
  const shutdown = async (signal) => {
    console.log(`\n⏹  ${signal} received — shutting down...`);
    server.close(async () => {
      try {
        const { closePool } = require('./db/connection');
        await closePool();
      } catch (_) {}
      console.log('✅ Server closed cleanly.');
      process.exit(0);
    });
    // Force exit after 5 s if something hangs
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});