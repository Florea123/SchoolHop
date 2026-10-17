// ==============================================================================
// TakeMe - Node.js PostgreSQL Connection Pool
// Folosește librăria standard 'pg' (node-postgres)
// ==============================================================================

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'takeme_db'}`;

const pool = new Pool({
  connectionString,
});

pool.on('error', (err) => {
  console.error('❌ Eroare neașteptată la clientul PostgreSQL idle:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
