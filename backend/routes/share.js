/**
 * Share routes — public, no authentication required
 * GET /share/:token
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /share/:token  (public)
// Decodes a share JWT and returns public trip live info.
// ---------------------------------------------------------------------------
router.get('/:token', async (req, res, next) => {
  try {
    let decoded;
    try {
      decoded = jwt.verify(req.params.token, process.env.SHARE_SECRET);
    } catch {
      return res.status(401).json({ error: 'Link de partajare invalid sau expirat' });
    }

    const tripId = decoded.trip_id;

    const [posRes, tripRes] = await Promise.all([
      query(
        `SELECT lat, lng, speed, recorded_at
         FROM trip_positions
         WHERE trip_id = $1
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [tripId]
      ),
      query(
        `SELECT t.id, t.status, t.departure_at,
                r.polyline, r.start_label, r.end_label,
                u.full_name AS driver_name,
                v.make, v.model, v.color
         FROM trips t
         JOIN routes r  ON r.id = t.route_id
         JOIN users  u  ON u.id = r.driver_id
         JOIN vehicles v ON v.id = r.vehicle_id
         WHERE t.id = $1`,
        [tripId]
      ),
    ]);

    if (!tripRes.rows.length) {
      return res.status(404).json({ error: 'Cursă negăsită' });
    }

    const trip = tripRes.rows[0];

    return res.json({
      trip_id: tripId,
      status: trip.status,
      departure_at: trip.departure_at,
      driver_name: trip.driver_name,
      vehicle: { make: trip.make, model: trip.model, color: trip.color },
      route: {
        start_label: trip.start_label,
        end_label: trip.end_label,
        polyline: trip.polyline,
      },
      current_position: posRes.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
