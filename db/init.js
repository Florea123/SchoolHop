// ==============================================================================
// SchoolHop - Inițializare Tabele și Seed în Node.js
// Rulare: node db/init.js
// Sigur de rulat oricând: creează tabelele care lipsesc și încarcă datele demo
// DOAR dacă baza e goală. Nu șterge niciun cont. (Pentru ștergere: db/reset.js)
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

    const { rows: [{ n }] } = await client.query('SELECT COUNT(*)::int AS n FROM users');
    if (n > 0) {
      console.log(`[SchoolHop DB] Baza conține deja ${n} conturi; datele existente au fost păstrate (seed sărit).`);
      return;
    }
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('[SchoolHop DB] Datele demo (Seed Iași) au fost încărcate!');
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

