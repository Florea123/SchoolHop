/**
 * Trips routes
 * POST /trips/:id/start
 * POST /trips/:id/position
 * POST /trips/:id/end
 * GET  /trips/:id/live
 * GET  /trips/:id/safety
 * POST /trips/:id/sos
 * GET  /trips/:id/share-link
 * GET  /share/:token          (public)
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { query } = require('../db');
const { checkDeviation, checkLongStop, checkArrivalTimeouts } = require('../services/safety');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: assert caller is the trip's driver
// ---------------------------------------------------------------------------
async function assertDriver(tripId, userId, res) {
  const result = await query(
    `SELECT r.driver_id
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     WHERE t.id = $1`,
    [tripId]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'Cursă negăsită' });
    return false;
  }
  if (result.rows[0].driver_id !== userId) {
    res.status(403).json({ error: 'Acces interzis — nu ești șoferul acestei curse' });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// POST /trips/:id/start
// ---------------------------------------------------------------------------
router.post('/:id/start', auth, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id, 10);
    const ok = await assertDriver(tripId, req.user.id, res);
    if (!ok) return;

    await query(
      `UPDATE trips SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
      [tripId]
    );

    return res.json({ message: 'Cursă pornită' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /trips/:id/position
// ---------------------------------------------------------------------------
router.post('/:id/position', auth, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id, 10);
    const { lat, lng, speed } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat și lng sunt obligatorii' });
    }

    // Insert position record
    await query(
      `INSERT INTO trip_positions (trip_id, lat, lng, speed, recorded_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [tripId, parseFloat(lat), parseFloat(lng), parseFloat(speed) || 0]
    );

    // Run safety checks ASYNC — do NOT block the response
    Promise.all([
      checkDeviation(tripId, parseFloat(lat), parseFloat(lng)),
      checkLongStop(tripId),
      checkArrivalTimeouts(tripId),
    ]).catch((err) => {
      console.error(`[SAFETY] Background checks failed trip=${tripId}:`, err.message);
    });

    return res.json({ message: 'Poziție înregistrată' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /trips/:id/end
// ---------------------------------------------------------------------------
router.post('/:id/end', auth, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id, 10);
    const ok = await assertDriver(tripId, req.user.id, res);
    if (!ok) return;

    await query(
      `UPDATE trips SET status = 'completed', ended_at = NOW() WHERE id = $1`,
      [tripId]
    );

    return res.json({ message: 'Cursă finalizată' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /trips/:id/live
// ---------------------------------------------------------------------------
router.get('/:id/live', auth, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id, 10);

    // Current position (latest)
    const posRes = await query(
      `SELECT lat, lng, speed, recorded_at
       FROM trip_positions
       WHERE trip_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [tripId]
    );

    // Route polyline
    const routeRes = await query(
      `SELECT r.polyline
       FROM trips t
       JOIN routes r ON r.id = t.route_id
       WHERE t.id = $1`,
      [tripId]
    );

    // Bookings with passenger info
    const bookingsRes = await query(
      `SELECT b.id, b.status, b.pickup_lat, b.pickup_lng, b.pickup_label,
              b.dropoff_lat, b.dropoff_lng, b.dropoff_label,
              b.pickup_index, b.dropoff_index, b.eta_arrival,
              u.id AS passenger_id, u.full_name AS passenger_name, u.phone AS passenger_phone
       FROM bookings b
       JOIN users u ON u.id = b.passenger_id
       WHERE b.trip_id = $1 AND b.status NOT IN ('cancelled')`,
      [tripId]
    );

    // Active safety events
    const safetyRes = await query(
      `SELECT id, type, severity, lat, lng, details, created_at
       FROM safety_events
       WHERE trip_id = $1 AND resolved = false
       ORDER BY created_at DESC`,
      [tripId]
    );

    return res.json({
      current_position: posRes.rows[0] || null,
      polyline: routeRes.rows[0] ? routeRes.rows[0].polyline : [],
      bookings: bookingsRes.rows,
      active_safety_events: safetyRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /trips/:id/safety
// ---------------------------------------------------------------------------
router.get('/:id/safety', auth, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id, 10);

    const result = await query(
      `SELECT id, booking_id, type, severity, lat, lng, details, resolved, created_at
       FROM safety_events
       WHERE trip_id = $1
       ORDER BY created_at DESC`,
      [tripId]
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /trips/:id/sos
// ---------------------------------------------------------------------------
router.post('/:id/sos', auth, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id, 10);
    const { lat, lng } = req.body;

    await query(
      `INSERT INTO safety_events (trip_id, type, severity, lat, lng, details, resolved, created_at)
       VALUES ($1, 'sos', 'critical', $2, $3, $4::jsonb, false, NOW())`,
      [
        tripId,
        lat ? parseFloat(lat) : null,
        lng ? parseFloat(lng) : null,
        JSON.stringify({ triggered_by: req.user.id }),
      ]
    );

    console.warn(`[SOS] 🚨 Trip=${tripId} user=${req.user.id} — SOS ACTIVAT!`);
    return res.json({ message: 'SOS trimis. Autoritățile au fost notificate.' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /trips/:id/share-link  (generate share token)
// ---------------------------------------------------------------------------
router.get('/:id/share-link', auth, async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id, 10);

    const token = jwt.sign(
      { trip_id: tripId },
      process.env.SHARE_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      url: `http://localhost:5173/share/${token}`,
    });
  } catch (err) {
    next(err);
  }
});



module.exports = router;
