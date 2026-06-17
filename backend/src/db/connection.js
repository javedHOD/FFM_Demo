const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'ffm_v4',
  options: {
    encrypt:                process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort:       true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout:    30000,
};

let _pool = null;

const getPool = async () => {
  if (!_pool || !_pool.connected) {
    _pool = await sql.connect(config);
  }
  return _pool;
};

/** Infer an mssql type from a JS value (mirrors your working TypeScript script). */
const sqlTypeOf = (val) => {
  if (val === null || val === undefined) return sql.NVarChar(sql.MAX);
  if (val instanceof Date)               return sql.DateTime2;
  if (typeof val === 'boolean')          return sql.Bit;
  if (typeof val === 'number')           return Number.isInteger(val) ? sql.Int : sql.Float;
  return sql.NVarChar(sql.MAX);
};

/**
 * Execute any SQL statement.
 * Use standard `?` placeholders — they are renamed to @p0, @p1, ...
 * Returns the full mssql result object: { recordset, rowsAffected, ... }
 */
const query = async (sqlStr, params = []) => {
  const pool = await getPool();
  const req  = pool.request();
  let counter = 0;
  const sqlFixed = sqlStr.replace(/\?/g, () => `@p${counter++}`);
  params.forEach((val, i) => req.input(`p${i}`, sqlTypeOf(val), val ?? null));
  return req.query(sqlFixed);
};

const testConnection = async () => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ping');
    console.log('✅ MSSQL connection successful');
    console.log(`✅ Connected to "${process.env.DB_NAME}" on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    return true;
  } catch (error) {
    console.error('❌ MSSQL connection failed:', error.message);
    console.error('   Please check your .env DB credentials (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)');
    process.exit(1);
  }
};

const closePool = async () => {
  if (_pool) {
    await _pool.close();
    _pool = null;
  }
};

module.exports = { getPool, query, testConnection, closePool, sql };
