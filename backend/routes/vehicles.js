// Mașinile părinților-șoferi

const express = require('express');
const db = require('../../db/db');
const { requireFields, toInt, notFound, badRequest } = require('../utils/http');
const validate = require('../utils/validate');
const serialize = require('../services/serialize');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM vehicles WHERE owner_id = $1 AND is_active ORDER BY created_at', [req.user.id]);
  res.json({ vehicles: rows.map(serialize.vehicle) });
});

router.post('/', async (req, res) => {
  requireFields(req.body, ['brand', 'model', 'color', 'licensePlate', 'childSeats']);
  const childSeats = toInt(req.body.childSeats, 'Locuri pentru copii', { min: 1, max: 7 });
  const boosterSeats = toInt(req.body.boosterSeats ?? 0, 'Înălțătoare', { min: 0, max: childSeats });
  const plate = validate.plate(req.body.licensePlate);
  const brand = validate.text(req.body.brand, 'Marca', { min: 2, max: 50 });
  const model = validate.text(req.body.model, 'Modelul', { min: 1, max: 50 });
  const color = validate.text(req.body.color, 'Culoarea', { min: 3, max: 30 });
  if (!/^[\p{L} -]+$/u.test(color)) throw badRequest('Culoarea poate conține doar litere');
  const { rows: [v] } = await db.query(
    `INSERT INTO vehicles (owner_id, brand, model, color, license_plate, child_seats, booster_seats)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, brand, model, color, plate, childSeats, boosterSeats]
  );
  res.status(201).json({ vehicle: serialize.vehicle(v) });
});

router.delete('/:id', async (req, res) => {
  const id = toInt(req.params.id, 'ID mașină');
  const { rows: [v] } = await db.query('SELECT * FROM vehicles WHERE vehicle_id = $1 AND owner_id = $2 AND is_active', [id, req.user.id]);
  if (!v) throw notFound('Mașina nu a fost găsită');
  const { rows: [{ n }] } = await db.query(
    "SELECT COUNT(*) AS n FROM rides WHERE vehicle_id = $1 AND ride_status IN ('scheduled', 'in_progress')", [id]
  );
  if (n > 0) throw badRequest('Mașina are curse programate. Anulează-le înainte de a o șterge.');
  await db.query('UPDATE vehicles SET is_active = false WHERE vehicle_id = $1', [id]);
  res.status(204).end();
});

module.exports = router;
