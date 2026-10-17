// Profilul copilului (interese pentru AI, zonă de domiciliu, înălțător)

const express = require('express');
const db = require('../../db/db');
const { badRequest, forbidden, notFound, toInt, toNumber } = require('../utils/http');
const validate = require('../utils/validate');
const { interestLabels, validInterestSlugs, findArea } = require('../services/catalog');
const { claimRegistryEntry } = require('../services/registry');
const serialize = require('../services/serialize');

const router = express.Router();

async function ownChild(childId, userId) {
  const { rows: [child] } = await db.query('SELECT * FROM children WHERE child_id = $1', [childId]);
  if (!child) throw notFound('Copilul nu a fost găsit');
  if (child.parent_id !== userId) throw forbidden('Poți modifica doar profilul copiilor tăi');
  return child;
}

router.patch('/:id', async (req, res) => {
  const child = await ownChild(toInt(req.params.id, 'ID copil'), req.user.id);
  const b = req.body;
  const updates = {};

  if (b.bio !== undefined) updates.bio = validate.text(b.bio, 'Descrierea', { max: 500, required: false });
  if (b.needsBooster !== undefined) updates.needs_booster = Boolean(b.needsBooster);
  if (b.interests !== undefined) {
    if (!Array.isArray(b.interests)) throw badRequest('Interesele trebuie trimise ca listă');
    const { valid, invalid } = await validInterestSlugs(b.interests);
    if (invalid.length) throw badRequest(`Interese necunoscute: ${invalid.join(', ')}`);
    if (valid.length > 8) throw badRequest('Poți selecta cel mult 8 interese');
    updates.interests = JSON.stringify(valid);
  }
  if (b.homeArea !== undefined) {
    const area = await findArea(b.homeArea);
    if (!area) throw badRequest('Zona selectată nu există');
    updates.home_village_or_area = area.name;
    // Fără coordonate exacte, folosim centrul zonei
    if (b.homeLat === undefined) { updates.home_lat = area.lat; updates.home_lon = area.lon; }
    updates.is_social_beneficiary = area.is_rural;
  }
  if (b.homeAddress !== undefined) updates.home_address = validate.text(b.homeAddress, 'Adresa', { min: 3, max: 255, required: false });
  if (b.homeLat !== undefined && b.homeLat !== null) {
    updates.home_lat = toNumber(b.homeLat, 'Latitudine', { min: 46.5, max: 47.8 });
    updates.home_lon = toNumber(b.homeLon, 'Longitudine', { min: 26.8, max: 28.2 });
  }

  const cols = Object.keys(updates);
  if (!cols.length) throw badRequest('Nimic de actualizat');
  const values = cols.map((c) => updates[c]);
  values.push(child.child_id);
  const { rows: [updated] } = await db.query(
    `UPDATE children SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE child_id = $${values.length} RETURNING *`,
    values
  );
  res.json({ child: serialize.child(updated, await interestLabels()) });
});

// Adaugă încă un copil folosind ID-ul lui din catalogul școlii
router.post('/claim', async (req, res) => {
  const accountId = validate.accountId(req.body.schoolAccountId);
  const schoolId = toInt(req.body.schoolId, 'Școala', { min: 1 });
  const child = await db.withTransaction(async (client) => {
    const { rows: [user] } = await client.query('SELECT * FROM users WHERE user_id = $1', [req.user.id]);
    return claimRegistryEntry(client, user, schoolId, accountId);
  });
  res.status(201).json({ child: serialize.child(child, await interestLabels()) });
});

module.exports = router;
