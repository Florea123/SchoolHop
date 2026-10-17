/**
 * Routes routes
 * POST /routes
 * GET  /routes/mine
 * POST /routes/:id/trips
 */

const express = require('express');
const auth = require('../middleware/auth');
const { query } = require('../db');
const { fetchRoute } = require('../services/osrm');

const router = express.Router();

router.use(auth);

// ---------------------------------------------------------------------------
// POST /routes
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      start_lat, start_lng, start_label,
      end_lat, end_lng, end_label,
      vehicle_id,
      departure_time,
      days_of_week,
      price_per_seat,
      price_cap,
      women_only,
      verified_only,
    } = req.body;

    if (!start_lat || !start_lng || !end_lat || !end_lng || !vehicle_id || !departure_time) {
      return res.status(400).json({
        error: 'start_lat, start_lng, end_lat, end_lng, vehicle_id și departure_time sunt obligatorii',
      });
    }

    // Verify vehicle belongs to user
    const vehicleRes = await query(
      'SELECT id FROM vehicles WHERE id = $1 AND owner_id = $2',
      [vehicle_id, req.user.id]
    );
    if (!vehicleRes.rows.length) {
      return res.status(403).json({ error: 'Vehicul negăsit sau nu vă aparține' });
    }

    // Fetch polyline from OSRM (with fallback)
    const polyline = await fetchRoute(
      parseFloat(start_lat),
      parseFloat(start_lng),
      parseFloat(end_lat),
      parseFloat(end_lng)
    );

    const result = await query(
      `INSERT INTO routes
         (driver_id, vehicle_id, name, start_lat, start_lng, start_label,
          end_lat, end_lng, end_label, polyline, departure_time,
          days_of_week, price_per_seat, price_cap, women_only, verified_only, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,true)
       RETURNING *`,
      [
        req.user.id,
        vehicle_id,
        name || null,
        parseFloat(start_lat),
        parseFloat(start_lng),
        start_label || null,
        parseFloat(end_lat),
        parseFloat(end_lng),
        end_label || null,
        JSON.stringify(polyline),
        departure_time,
        days_of_week || null,
        price_per_seat ? parseFloat(price_per_seat) : null,
        price_cap ? parseFloat(price_cap) : null,
        women_only === true || women_only === 'true',
        verified_only === true || verified_only === 'true',
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /routes/mine
// ---------------------------------------------------------------------------
router.get('/mine', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*,
              v.plate, v.make, v.model, v.color, v.seats_total
       FROM routes r
       JOIN vehicles v ON v.id = r.vehicle_id
       WHERE r.driver_id = $1
       ORDER BY r.id DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /routes/:id/trips
// ---------------------------------------------------------------------------
router.post('/:id/trips', async (req, res, next) => {
  try {
    const routeId = parseInt(req.params.id, 10);
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date este obligatoriu (YYYY-MM-DD)' });
    }

    // Verify ownership
    const routeRes = await query(
      `SELECT r.*, v.seats_total
       FROM routes r
       JOIN vehicles v ON v.id = r.vehicle_id
       WHERE r.id = $1 AND r.driver_id = $2`,
      [routeId, req.user.id]
    );

    if (!routeRes.rows.length) {
      return res.status(403).json({ error: 'Rută negăsită sau nu vă aparține' });
    }

    const route = routeRes.rows[0];

    // Build departure_at from date + departure_time
    // departure_time is stored as TIME (e.g. "07:30:00")
    const departureAt = new Date(`${date}T${route.departure_time}`);
    if (isNaN(departureAt.getTime())) {
      return res.status(400).json({ error: 'Data sau ora de plecare invalidă' });
    }

    const result = await query(
      `INSERT INTO trips (route_id, date, departure_at, status, seats_available)
       VALUES ($1, $2, $3, 'scheduled', $4)
       RETURNING *`,
      [routeId, date, departureAt, route.seats_total]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
