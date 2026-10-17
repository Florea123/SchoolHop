// ==============================================================================
// SchoolHop - Resetare Bază de Date înainte de Demo (Node.js)
// Rulare: node db/reset.js
// Șterge toate tabelele existente și re-rulează schema.sql + seed.sql
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('[SchoolHop DB] Resetare completă a bazei de date...');

    // Ștergem schema public și o recreăm curată
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('[SchoolHop DB] Toate tabelele vechi au fost șterse.');

    // Rulăm schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('[SchoolHop DB] Schema recreată.');

    // Rulăm seed
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('[SchoolHop DB] Seed-ul pentru demo a fost încărcat din nou!');
  } catch (err) {
    console.error('[SchoolHop DB] Eroare la resetarea bazei de date:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;

