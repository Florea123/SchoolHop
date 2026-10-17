// ==============================================================================
// SchoolHop - Inițializare Tabele și Seed în Node.js
// Rulare: node db/init.js
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('[SchoolHop DB] Conectat la PostgreSQL. Inițializăm tabelele...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('[SchoolHop DB] Tabelele și indecșii au fost create cu succes!');

    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('[SchoolHop DB] Datele de test (Seed Iași) au fost încărcate!');
  } catch (err) {
    console.error('[SchoolHop DB] Eroare la inițializarea bazei de date:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;

