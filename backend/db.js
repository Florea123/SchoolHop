/**
 * PostgreSQL connection pool
 * Reads DATABASE_URL from environment and exports a pool + query helper.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optional: tune pool size for production
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized SQL query.
 * @param {string} text  SQL string with $1, $2 ... placeholders
 * @param {Array}  params
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DB] query (${duration}ms) rows=${res.rowCount}`);
  }
  return res;
}

module.exports = { pool, query };
