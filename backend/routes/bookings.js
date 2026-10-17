/**
 * Bookings routes
 * POST /bookings
 * GET  /bookings/mine
 * POST /bookings/:id/cancel
 * POST /bookings/:id/arrive
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { query } = require('../db');
const { scoreTrip } = require('../services/matching');
const { distanceAlongPolyline } = require('../services/matching');
const { haversine } = require('../services/haversine');

const router = express.Router();

router.use(auth);

// ---------------------------------------------------------------------------
// POST /bookings
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const {
      trip_id,
      pickup_lat, pickup_lng, pickup_label,
      dropoff_lat, dropoff_lng, dropoff_label,
      seat_pref,
    } = req.body;

    if (!trip_id || pickup_lat === undefined || dropoff_lat === undefined) {
      return res.status(400).json({ error: 'trip_id, pickup_lat/lng și dropoff_lat/lng sunt obligatorii' });
    }

    // Fetch trip + route info for matching
    const tripRes = await query(
      `SELECT t.id AS trip_id, t.departure_at, t.seats_available,
              r.polyline, r.price_per_seat, r.price_cap, r.women_only, r.verified_only,
              u.rating_avg
       FROM trips t
       JOIN routes r ON r.id = t.route_id
       JOIN users u ON u.id = r.driver_id
       WHERE t.id = $1 AND t.status = 'scheduled'`,
      [trip_id]
    );

    if (!tripRes.rows.length) {
      return res.status(404).json({ error: 'Cursă negăsită sau nu mai este disponibilă' });
    }

    const trip = tripRes.rows[0];

    if (trip.seats_available <= 0) {
      return res.status(409).json({ error: 'Nu mai sunt locuri disponibile' });
    }

    // Run matching to get indices, price, ETA
    const scored = scoreTrip(
      trip,
      parseFloat(pickup_lat),
      parseFloat(pickup_lng),
      parseFloat(dropoff_lat),
      parseFloat(dropoff_lng),
      null, // time filter not critical for booking
      { women_only: false, verified_only: false }
    );

    if (!scored) {
      return res.status(422).json({ error: 'Locul de preluare sau destinație este prea departe de traseu' });
    }

    // ETA at arrival = eta at pickup + travel time from pickup to dropoff
    const polyline = trip.polyline;
    const pickupDist = distanceAlongPolyline(polyline, scored.pickupIndex);
    const dropoffDist = distanceAlongPolyline(polyline, scored.dropoffIndex);
    const segmentDist = dropoffDist - pickupDist;
    const AVG_SPEED_MPS = 30000 / 3600;
    const travelSec = segmentDist / AVG_SPEED_MPS;
    const etaArrival = new Date(scored.etaAtPickup.getTime() + travelSec * 1000);

    // Insert booking + decrement seats in a transaction
    await query('BEGIN', []);
    try {
      const bookingRes = await query(
        `INSERT INTO bookings
           (trip_id, passenger_id, pickup_lat, pickup_lng, pickup_label,
            pickup_index, dropoff_lat, dropoff_lng, dropoff_label, dropoff_index,
            seat_pref, price, status, eta_arrival, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'confirmed',$13,NOW())
         RETURNING *`,
        [
          trip_id,
          req.user.id,
          parseFloat(pickup_lat),
          parseFloat(pickup_lng),
          pickup_label || null,
          scored.pickupIndex,
          parseFloat(dropoff_lat),
          parseFloat(dropoff_lng),
          dropoff_label || null,
          scored.dropoffIndex,
          seat_pref || null,
          scored.price,
          etaArrival,
        ]
      );

      await query(
        'UPDATE trips SET seats_available = seats_available - 1 WHERE id = $1',
        [trip_id]
      );

      await query('COMMIT', []);
      return res.status(201).json(bookingRes.rows[0]);
    } catch (txErr) {
      await query('ROLLBACK', []);
      throw txErr;
    }
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /bookings/mine
// ---------------------------------------------------------------------------
router.get('/mine', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*,
              t.departure_at, t.status AS trip_status, t.date AS trip_date,
              r.name AS route_name, r.start_label, r.end_label,
              u.id AS driver_id, u.full_name AS driver_name, u.phone AS driver_phone,
              u.rating_avg AS driver_rating
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN routes r ON r.id = t.route_id
       JOIN users u ON u.id = r.driver_id
       WHERE b.passenger_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /bookings/:id/cancel
// ---------------------------------------------------------------------------
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id, 10);

    // Verify ownership
    const bookingRes = await query(
      'SELECT id, trip_id, passenger_id, status FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (!bookingRes.rows.length) {
      return res.status(404).json({ error: 'Rezervare negăsită' });
    }
    const booking = bookingRes.rows[0];

    if (booking.passenger_id !== req.user.id) {
      return res.status(403).json({ error: 'Nu ești pasagerul acestei rezervări' });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({ error: 'Rezervarea este deja anulată' });
    }

    await query('BEGIN', []);
    try {
      await query(
        "UPDATE bookings SET status = 'cancelled' WHERE id = $1",
        [bookingId]
      );
      await query(
        'UPDATE trips SET seats_available = seats_available + 1 WHERE id = $1',
        [booking.trip_id]
      );
      await query('COMMIT', []);
    } catch (txErr) {
      await query('ROLLBACK', []);
      throw txErr;
    }

    return res.json({ message: 'Rezervare anulată' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /bookings/:id/arrive
// ---------------------------------------------------------------------------
router.post('/:id/arrive', async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Codul de sosire este obligatoriu' });
    }

    // Fetch booking + passenger's code hashes
    const result = await query(
      `SELECT b.id, b.trip_id, b.passenger_id, b.status,
              b.dropoff_lat, b.dropoff_lng, b.dropoff_index,
              t.route_id,
              r.polyline,
              u.arrival_code_hash, u.duress_code_hash
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN routes r ON r.id = t.route_id
       JOIN users u ON u.id = b.passenger_id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Rezervare negăsită' });
    }

    const booking = result.rows[0];

    if (booking.passenger_id !== req.user.id) {
      return res.status(403).json({ error: 'Nu ești pasagerul acestei rezervări' });
    }

    // Estimate trip distance for CO2 calculation
    const polyline = booking.polyline || [];
    let distanceKm = 0;
    if (polyline.length > 1 && booking.dropoff_index) {
      const totalDist = distanceAlongPolyline(polyline, parseInt(booking.dropoff_index, 10));
      distanceKm = totalDist / 1000;
    } else {
      distanceKm = 15; // fallback average
    }
    const co2Kg = Math.round(distanceKm * 0.12 * 100) / 100;

    // -- Check arrival code first --
    const isArrivalCode =
      booking.arrival_code_hash
        ? await bcrypt.compare(code, booking.arrival_code_hash)
        : false;

    if (isArrivalCode) {
      // Normal arrival flow
      await query('BEGIN', []);
      try {
        await query(
          `UPDATE bookings SET status = 'arrived', arrival_confirmed_at = NOW() WHERE id = $1`,
          [bookingId]
        );

        // Get driver_id
        const driverRes = await query(
          'SELECT driver_id FROM routes WHERE id = $1',
          [booking.route_id]
        );
        const driverId = driverRes.rows[0].driver_id;

        // Add 10 points to driver and passenger
        await query(
          'UPDATE users SET points = points + 10 WHERE id = $1',
          [driverId]
        );
        await query(
          'UPDATE users SET points = points + 10 WHERE id = $1',
          [booking.passenger_id]
        );

        // Points ledger entries
        await query(
          `INSERT INTO points_ledger (user_id, delta, reason, created_at)
           VALUES ($1, 10, 'Cursă finalizată', NOW()), ($2, 10, 'Cursă finalizată', NOW())`,
          [driverId, booking.passenger_id]
        );

        // CO2 ledger entry for driver
        await query(
          `INSERT INTO points_ledger (user_id, delta, reason, created_at)
           VALUES ($1, 0, $2, NOW())`,
          [driverId, `CO₂ salvat: ${co2Kg} kg`]
        );

        await query('COMMIT', []);
      } catch (txErr) {
        await query('ROLLBACK', []);
        throw txErr;
      }

      return res.json({ message: 'Cursă încheiată cu succes', points: 10 });
    }

    // -- Check duress code --
    const isDuressCode =
      booking.duress_code_hash
        ? await bcrypt.compare(code, booking.duress_code_hash)
        : false;

    if (isDuressCode) {
      // Silently mark as arrived but ALSO insert a critical safety event
      await query('BEGIN', []);
      try {
        await query(
          `UPDATE bookings SET status = 'arrived', arrival_confirmed_at = NOW() WHERE id = $1`,
          [bookingId]
        );

        const driverRes = await query(
          'SELECT driver_id FROM routes WHERE id = $1',
          [booking.route_id]
        );
        const driverId = driverRes.rows[0].driver_id;

        await query(
          'UPDATE users SET points = points + 10 WHERE id = $1',
          [driverId]
        );
        await query(
          'UPDATE users SET points = points + 10 WHERE id = $1',
          [booking.passenger_id]
        );

        await query(
          `INSERT INTO points_ledger (user_id, delta, reason, created_at)
           VALUES ($1, 10, 'Cursă finalizată', NOW()), ($2, 10, 'Cursă finalizată', NOW())`,
          [driverId, booking.passenger_id]
        );

        // Silent duress event
        await query(
          `INSERT INTO safety_events
             (trip_id, booking_id, type, severity, lat, lng, details, resolved, created_at)
           VALUES ($1, $2, 'duress_code', 'critical', $3, $4, $5::jsonb, false, NOW())`,
          [
            booking.trip_id,
            bookingId,
            booking.dropoff_lat,
            booking.dropoff_lng,
            JSON.stringify({ passenger_id: booking.passenger_id, triggered_at: new Date().toISOString() }),
          ]
        );

        await query('COMMIT', []);
      } catch (txErr) {
        await query('ROLLBACK', []);
        throw txErr;
      }

      console.warn(`[DURESS] 🚨 Booking=${bookingId} passenger=${booking.passenger_id} — COD CONSTRÂNGERE ACTIVAT!`);

      // Respond identically to normal arrival — do NOT reveal the duress trigger
      return res.json({ message: 'Cursă încheiată cu succes', points: 10 });
    }

    // Neither code matched
    return res.status(400).json({ error: 'Cod incorect' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
