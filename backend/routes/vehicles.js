/**
 * Vehicles routes
 * POST /vehicles
 * GET  /vehicles/mine
 */

const express = require('express');
const auth = require('../middleware/auth');
const { query } = require('../db');

const router = express.Router();

router.use(auth);

// ---------------------------------------------------------------------------
// POST /vehicles
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { plate, make, model, color, seats_total } = req.body;

    if (!plate || !make || !model || !color || !seats_total) {
      return res.status(400).json({ error: 'plate, make, model, color și seats_total sunt obligatorii' });
    }

    const result = await query(
      `INSERT INTO vehicles (owner_id, plate, make, model, color, seats_total)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, plate, make, model, color, seats_total`,
      [req.user.id, plate.toUpperCase(), make, model, color, parseInt(seats_total, 10)]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /vehicles/mine
// ---------------------------------------------------------------------------
router.get('/mine', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, plate, make, model, color, seats_total
       FROM vehicles
       WHERE owner_id = $1
       ORDER BY id DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
