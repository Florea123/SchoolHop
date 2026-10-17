// Date de referință folosite în mai multe rute (interese, zone)

const db = require('../../db/db');

let interestCache = null;

async function interestLabels() {
  if (!interestCache) {
    const { rows } = await db.query('SELECT slug, label FROM interests');
    interestCache = Object.fromEntries(rows.map((r) => [r.slug, r.label]));
  }
  return interestCache;
}

async function validInterestSlugs(slugs) {
  const labels = await interestLabels();
  const unique = [...new Set((slugs || []).map(String))];
  const invalid = unique.filter((s) => !labels[s]);
  return { valid: unique.filter((s) => labels[s]), invalid };
}

async function findArea(name) {
  const { rows } = await db.query('SELECT * FROM areas WHERE name = $1', [name]);
  return rows[0] || null;
}

module.exports = { interestLabels, validInterestSlugs, findArea };
