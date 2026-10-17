/**
 * Safety engine
 * Provides three async safety checks used by the cron job and trip position endpoint.
 *
 * 1. checkDeviation  — route deviation detection
 * 2. checkLongStop   — prolonged low-speed stop not near any booking point
 * 3. checkArrivalTimeouts — passengers not confirmed arrived after ETA + 15 min
 */

const { query } = require('../db');
const { haversine } = require('./haversine');
const { findNearestPointOnPolyline } = require('./matching');

const DEVIATION_WARNING_M = 300;
const DEVIATION_CRITICAL_M = 1000;
const DEVIATION_WINDOW_MS = 45 * 1000; // 45 seconds
const LONG_STOP_SPEED_THRESHOLD = 2; // km/h
const LONG_STOP_MIN_POSITIONS = 5;
const LONG_STOP_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const LONG_STOP_BOOKING_RADIUS_M = 100;
const ARRIVAL_TIMEOUT_GRACE_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// 1. checkDeviation
// ---------------------------------------------------------------------------

/**
 * Check if the current position deviates from the route's polyline.
 * @param {number} tripId
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ deviated: boolean, distance: number, severity: string|null }>}
 */
async function checkDeviation(tripId, lat, lng) {
  // Fetch the trip's route polyline
  const tripRes = await query(
    `SELECT r.polyline
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     WHERE t.id = $1`,
    [tripId]
  );

  if (!tripRes.rows.length || !tripRes.rows[0].polyline) {
    return { deviated: false, distance: 0, severity: null };
  }

  const polyline = tripRes.rows[0].polyline;
  const nearest = findNearestPointOnPolyline(polyline, lat, lng);
  const distance = nearest.distance;

  if (distance <= DEVIATION_WARNING_M) {
    return { deviated: false, distance, severity: null };
  }

  // Check if there's already a warning event in the last 45 seconds
  const recentRes = await query(
    `SELECT id, severity
     FROM safety_events
     WHERE trip_id = $1
       AND type = 'route_deviation'
       AND resolved = false
       AND created_at >= NOW() - INTERVAL '45 seconds'
     ORDER BY created_at DESC
     LIMIT 1`,
    [tripId]
  );

  const hasRecentWarning = recentRes.rows.length > 0;

  if (hasRecentWarning && distance > DEVIATION_CRITICAL_M) {
    // Escalate to critical
    await query(
      `UPDATE safety_events
       SET severity = 'critical', details = details || $2::jsonb
       WHERE id = $1`,
      [
        recentRes.rows[0].id,
        JSON.stringify({ escalated_at: new Date().toISOString(), distance_m: Math.round(distance) }),
      ]
    );
    console.warn(`[SAFETY] CRITICAL deviation trip=${tripId} dist=${Math.round(distance)}m`);
    return { deviated: true, distance, severity: 'critical' };
  }

  if (!hasRecentWarning) {
    // Insert a new warning
    await query(
      `INSERT INTO safety_events (trip_id, type, severity, lat, lng, details, resolved, created_at)
       VALUES ($1, 'route_deviation', 'warning', $2, $3, $4::jsonb, false, NOW())`,
      [
        tripId,
        lat,
        lng,
        JSON.stringify({ distance_m: Math.round(distance) }),
      ]
    );
    console.warn(`[SAFETY] WARNING deviation trip=${tripId} dist=${Math.round(distance)}m`);
    return { deviated: true, distance, severity: 'warning' };
  }

  return { deviated: true, distance, severity: 'warning' };
}

// ---------------------------------------------------------------------------
// 2. checkLongStop
// ---------------------------------------------------------------------------

/**
 * Check if the vehicle has been stationary for too long at a location
 * that is not near any confirmed booking pickup or dropoff.
 * @param {number} tripId
 * @returns {Promise<void>}
 */
async function checkLongStop(tripId) {
  const posRes = await query(
    `SELECT lat, lng, speed, recorded_at
     FROM trip_positions
     WHERE trip_id = $1
     ORDER BY recorded_at DESC
     LIMIT $2`,
    [tripId, LONG_STOP_MIN_POSITIONS]
  );

  const positions = posRes.rows;
  if (positions.length < LONG_STOP_MIN_POSITIONS) return;

  // All must be below the speed threshold
  const allSlow = positions.every((p) => parseFloat(p.speed) < LONG_STOP_SPEED_THRESHOLD);
  if (!allSlow) return;

  // Must span more than 5 minutes
  const newest = new Date(positions[0].recorded_at);
  const oldest = new Date(positions[positions.length - 1].recorded_at);
  const spanMs = newest - oldest;
  if (spanMs < LONG_STOP_DURATION_MS) return;

  const stopLat = parseFloat(positions[0].lat);
  const stopLng = parseFloat(positions[0].lng);

  // Check if stop is near a booking pickup or dropoff
  const bookingRes = await query(
    `SELECT pickup_lat, pickup_lng, dropoff_lat, dropoff_lng
     FROM bookings
     WHERE trip_id = $1 AND status NOT IN ('cancelled', 'arrived')`,
    [tripId]
  );

  const nearBooking = bookingRes.rows.some((b) => {
    const dPickup = haversine(stopLat, stopLng, parseFloat(b.pickup_lat), parseFloat(b.pickup_lng));
    const dDropoff = haversine(stopLat, stopLng, parseFloat(b.dropoff_lat), parseFloat(b.dropoff_lng));
    return dPickup <= LONG_STOP_BOOKING_RADIUS_M || dDropoff <= LONG_STOP_BOOKING_RADIUS_M;
  });

  if (nearBooking) return;

  // Check if we already have an unresolved long_stop event
  const existingRes = await query(
    `SELECT id FROM safety_events
     WHERE trip_id = $1 AND type = 'long_stop' AND resolved = false
     LIMIT 1`,
    [tripId]
  );
  if (existingRes.rows.length > 0) return;

  await query(
    `INSERT INTO safety_events (trip_id, type, severity, lat, lng, details, resolved, created_at)
     VALUES ($1, 'long_stop', 'warning', $2, $3, $4::jsonb, false, NOW())`,
    [
      tripId,
      stopLat,
      stopLng,
      JSON.stringify({ span_ms: spanMs, positions_checked: positions.length }),
    ]
  );
  console.warn(`[SAFETY] Long stop detected trip=${tripId} at ${stopLat},${stopLng} for ${Math.round(spanMs / 60000)} min`);
}

// ---------------------------------------------------------------------------
// 3. checkArrivalTimeouts
// ---------------------------------------------------------------------------

/**
 * Find bookings whose ETA + 15 min grace period has passed without arrival confirmation.
 * @param {number} tripId
 * @returns {Promise<void>}
 */
async function checkArrivalTimeouts(tripId) {
  const now = new Date();

  const bookingRes = await query(
    `SELECT b.id, b.passenger_id, b.eta_arrival, b.dropoff_lat, b.dropoff_lng
     FROM bookings b
     WHERE b.trip_id = $1
       AND b.status NOT IN ('arrived', 'cancelled')
       AND b.eta_arrival IS NOT NULL
       AND b.eta_arrival + INTERVAL '15 minutes' < $2`,
    [tripId, now]
  );

  for (const booking of bookingRes.rows) {
    // Check if an arrival_timeout event already exists for this booking
    const existingRes = await query(
      `SELECT id FROM safety_events
       WHERE trip_id = $1 AND booking_id = $2 AND type = 'arrival_timeout' AND resolved = false
       LIMIT 1`,
      [tripId, booking.id]
    );
    if (existingRes.rows.length > 0) continue;

    await query(
      `INSERT INTO safety_events (trip_id, booking_id, type, severity, lat, lng, details, resolved, created_at)
       VALUES ($1, $2, 'arrival_timeout', 'warning', $3, $4, $5::jsonb, false, NOW())`,
      [
        tripId,
        booking.id,
        booking.dropoff_lat,
        booking.dropoff_lng,
        JSON.stringify({
          passenger_id: booking.passenger_id,
          eta_arrival: booking.eta_arrival,
          detected_at: now.toISOString(),
        }),
      ]
    );
    console.warn(
      `[SAFETY] Arrival timeout trip=${tripId} booking=${booking.id} passenger=${booking.passenger_id}`
    );
  }
}

module.exports = { checkDeviation, checkLongStop, checkArrivalTimeouts };
