// Verificarea în registrul școlii (catalog) și crearea profilului copilului

const { badRequest, conflict } = require('../utils/http');

function normalizeName(name) {
  return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function claimRegistryEntry(client, user, schoolId, accountId) {
  const { rows: [entry] } = await client.query(
    `SELECT r.*, s.account_prefix FROM school_registry r JOIN schools s ON s.school_id = r.school_id
     WHERE r.account_id = $1 FOR UPDATE OF r`,
    [accountId]
  );
  if (!entry || entry.school_id !== schoolId) {
    throw badRequest('Contul școlar nu a fost găsit în registrul școlii selectate. Verifică ID-ul primit de la secretariat.');
  }
  if (entry.claimed_by && entry.claimed_by !== user.user_id) {
    throw conflict('Acest cont școlar a fost deja activat de un alt utilizator. Contactează secretariatul.');
  }
  if (entry.claimed_by === user.user_id) throw conflict('Copilul este deja asociat contului tău');
  if (normalizeName(entry.parent_full_name) !== normalizeName(user.full_name)) {
    throw badRequest('Numele părintelui nu corespunde cu cel din registrul școlii pentru acest cont.');
  }

  await client.query('UPDATE school_registry SET claimed_by = $1 WHERE registry_id = $2', [user.user_id, entry.registry_id]);
  const { rows: [child] } = await client.query(
    `INSERT INTO children (parent_id, school_id, full_name, birth_date, grade, teacher)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [user.user_id, entry.school_id, entry.child_full_name, entry.child_birth_date, entry.grade, entry.teacher]
  );
  return child;
}

module.exports = { claimRegistryEntry, normalizeName };
