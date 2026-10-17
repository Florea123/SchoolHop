// ==============================================================================
// SchoolHop - Node.js PostgreSQL Connection Pool
// Folosește librăria standard 'pg' (node-postgres)
// ==============================================================================

const { Pool, types } = require('pg');

// NUMERIC/DECIMAL și COUNT(*) ca numere JS (implicit pg le întoarce ca string)
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
// DATE rămâne string 'AAAA-LL-ZZ' (fără conversie de fus orar)
types.setTypeParser(1082, (v) => v);
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'takeme_db'}`;

const pool = new Pool({
  connectionString,
  // Toate datele calendaristice (zile de școală, ore de plecare) sunt în ora României
  options: `-c timezone=${process.env.APP_TIMEZONE || 'Europe/Bucharest'}`,
});

pool.on('error', (err) => {
  console.error('Eroare neașteptată la clientul PostgreSQL idle:', err);
});

// Rulează `fn(client)` într-o tranzacție; face ROLLBACK la orice eroare.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  withTransaction,
  pool,
};

