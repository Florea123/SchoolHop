// Logica de business pentru curse: detalii, locuri, potriviri AI, urmărire live

const db = require('../../db/db');
const config = require('../config');
const geo = require('./geo');
const ai = require('./ai');
const { interestLabels } = require('./catalog');
const { seatsForVehicle, SEAT_LABELS, ageOn, seatAllowedForChild } = require('./seats');
const { notifyMany } = require('./notify');
const { notFound, forbidden } = require('../utils/http');

const RIDE_SELECT = `
  SELECT r.*,
         u.full_name AS driver_name, u.phone AS driver_phone, u.role AS driver_role, u.profile_photo AS driver_photo,
         v.brand, v.model, v.color, v.license_plate, v.child_seats, v.booster_seats,
         s.name AS school_name, s.short_name AS school_short_name, s.phone AS school_phone,
         s.bell_time, s.dropoff_point_label,
         COALESCE(rv.avg_rating, 0) AS driver_rating, COALESCE(rv.review_count, 0) AS driver_reviews
  FROM rides r
  JOIN users u ON u.user_id = r.driver_id
  JOIN vehicles v ON v.vehicle_id = r.vehicle_id
  JOIN schools s ON s.school_id = r.school_id
  LEFT JOIN (
    SELECT driver_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS review_count
    FROM reviews GROUP BY driver_id
  ) rv ON rv.driver_id = r.driver_id`;

async function getRide(rideId, client = db) {
  const { rows } = await client.query(`${RIDE_SELECT} WHERE r.ride_id = $1`, [rideId]);
  if (!rows[0]) throw notFound('Cursa nu a fost găsită');
  return rows[0];
}

async function getRideBookings(rideId, client = db) {
  const { rows } = await client.query(
    `SELECT b.*, c.full_name AS child_name, c.grade, c.interests, c.birth_date, c.school_id,
            c.home_village_or_area, c.needs_booster, c.child_id,
            p.full_name AS parent_name, p.phone AS parent_phone
     FROM bookings b
     JOIN children c ON c.child_id = b.child_id
     JOIN users p ON p.user_id = b.parent_id
     WHERE b.ride_id = $1 AND b.booking_status <> 'cancelled'
     ORDER BY b.created_at`,
    [rideId]
  );
  return rows;
}

// Șofer, părinte cu copil pe cursă sau administratorul școlii
async function assertParticipant(ride, user, bookings) {
  if (ride.driver_id === user.id) return 'driver';
  const list = bookings || await getRideBookings(ride.ride_id);
  if (list.some((b) => b.parent_id === user.id)) return 'parent';
  if (user.role === 'admin' && user.schoolId === ride.school_id) return 'admin';
  throw forbidden('Nu participi la această cursă');
}

function seatMap(ride, bookings, child) {
  const childAge = child ? ageOn(child.birth_date, new Date(ride.departure_time)) : null;
  const boostersUsed = bookings.filter((b) => b.uses_booster).length;
  const seats = seatsForVehicle(ride.child_seats).map((position) => {
    const taken = bookings.find((b) => b.seat_position === position);
    let status = 'free';
    if (taken) status = child && taken.child_id === child.child_id ? 'mine' : 'occupied';
    else if (child && !seatAllowedForChild(position, childAge)) status = 'not_allowed';
    return {
      position,
      label: SEAT_LABELS[position],
      status,
      childName: taken ? ai.firstName(taken.child_name) : null,
      usesBooster: taken ? taken.uses_booster : false,
    };
  });
  return {
    seats,
    boosterSeats: ride.booster_seats,
    boostersLeft: Math.max(0, ride.booster_seats - boostersUsed),
  };
}

// Cel mai bun scor AI între copil și copiii deja aflați pe cursă
async function matchForRide(child, bookings) {
  const labels = await interestLabels();
  // Rândurile de rezervare au numele copilului în child_name
  const companions = bookings.filter((b) => b.child_id !== child.child_id).map((b) => ({ ...b, full_name: b.child_name }));
  let best = null;
  for (const other of companions) {
    const m = ai.scoreChildren(child, other, labels);
    if (m && (!best || m.score > best.match.score)) best = { other, match: m };
  }
  if (!best) {
    return { score: 0, companion: null, reasons: [], commonInterests: [], recommendation: 'Fii primul coleg de drum pe această cursă!' };
  }
  return {
    score: best.match.score,
    companion: { childId: best.other.child_id, name: best.other.child_name, grade: best.other.grade, sameClass: best.match.sameClass },
    reasons: best.match.reasons,
    commonInterests: best.match.commonInterests.map((s) => ({ slug: s, label: labels[s] || s })),
    recommendation: ai.templateRecommendation(child, best.other, best.match),
    pair: [child, best.other, best.match],
  };
}

// Salvează recomandarea în ai_interest_matches (cache)
async function persistMatch(childA, childB, match) {
  const labels = await interestLabels();
  const [c1, c2] = childA.child_id < childB.child_id ? [childA, childB] : [childB, childA];
  const existing = await db.query(
    `SELECT ai_recommendation, compatibility_score FROM ai_interest_matches WHERE child_id_1 = $1 AND child_id_2 = $2`,
    [c1.child_id, c2.child_id]
  );
  const row = existing.rows[0];
  if (row && Number(row.compatibility_score) === match.score) return row.ai_recommendation;
  const text = await ai.recommendationText(childA, childB, match, labels);
  await db.query(
    `INSERT INTO ai_interest_matches (child_id_1, child_id_2, common_interests, compatibility_score, ai_recommendation)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (child_id_1, child_id_2) DO UPDATE
       SET common_interests = EXCLUDED.common_interests, compatibility_score = EXCLUDED.compatibility_score,
           ai_recommendation = EXCLUDED.ai_recommendation, updated_at = now()`,
    [c1.child_id, c2.child_id, JSON.stringify(match.commonInterests), match.score, text]
  );
  return text;
}

function rideRoute(ride) {
  return [
    { lat: ride.departure_lat, lon: ride.departure_lon },
    { lat: ride.destination_lat, lon: ride.destination_lon },
  ];
}

function estimateDurationMin(ride) {
  const km = (geo.routeLengthM(rideRoute(ride)) / 1000) * config.impact.roadFactor;
  return Math.max(5, Math.round((km / config.impact.avgSpeedKmh) * 60));
}

function walkingMinutes(from, to) {
  if (!from || from.lat == null || to.lat == null) return null;
  const km = (geo.haversineM(from, to) / 1000) * config.impact.roadFactor;
  return Math.max(1, Math.round((km / config.impact.walkSpeedKmh) * 60));
}

async function lastLocation(rideId, client = db) {
  const { rows } = await client.query(
    'SELECT lat, lon, recorded_at FROM ride_locations WHERE ride_id = $1 ORDER BY recorded_at DESC, location_id DESC LIMIT 1',
    [rideId]
  );
  return rows[0] || null;
}

async function activeAlerts(rideId, client = db) {
  const { rows } = await client.query(
    `SELECT a.*, u.full_name AS raised_by_name FROM ride_alerts a
     LEFT JOIN users u ON u.user_id = a.raised_by
     WHERE a.ride_id = $1 AND a.resolved_at IS NULL ORDER BY a.created_at DESC`,
    [rideId]
  );
  return rows;
}

async function liveState(ride) {
  const route = rideRoute(ride);
  const location = await lastLocation(ride.ride_id);
  const bookings = await getRideBookings(ride.ride_id);
  const alerts = await activeAlerts(ride.ride_id);
  const durationMin = estimateDurationMin(ride);

  let progress = 0;
  let offRouteM = 0;
  if (ride.ride_status === 'completed') progress = 1;
  else if (location) {
    const proj = geo.projectOnRoute(location, route);
    progress = proj.progress;
    offRouteM = Math.round(proj.distanceM);
  }

  let eta;
  if (ride.ride_status === 'completed') eta = ride.completed_at;
  else if (ride.ride_status === 'in_progress') {
    eta = new Date(Date.now() + Math.round(durationMin * (1 - progress)) * 60000);
  } else {
    eta = new Date(new Date(ride.departure_time).getTime() + durationMin * 60000);
  }

  return {
    rideId: ride.ride_id,
    status: ride.ride_status,
    route,
    location,
    progress: Math.round(progress * 100) / 100,
    offRouteM,
    eta,
    durationMin,
    alerts,
    bookings: bookings.map((b) => ({
      bookingId: b.booking_id, childId: b.child_id, childName: b.child_name, grade: b.grade,
      parentId: b.parent_id, status: b.booking_status, seat: b.seat_position, seatLabel: SEAT_LABELS[b.seat_position],
      pickupTime: b.pickup_time, dropoffTime: b.dropoff_time, parentConfirmedAt: b.parent_confirmed_at,
    })),
  };
}

function parentIdsOf(bookings, exceptUserId) {
  return bookings.map((b) => b.parent_id).filter((id) => id !== exceptUserId);
}

// Înregistrează o poziție GPS și verifică devierea de la traseu
async function recordLocation(ride, point, user) {
  if (ride.ride_status !== 'in_progress') return { deviation: null };
  await db.query('INSERT INTO ride_locations (ride_id, lat, lon) VALUES ($1, $2, $3)', [ride.ride_id, point.lat, point.lon]);

  const { distanceM } = geo.projectOnRoute(point, rideRoute(ride));
  const alerts = await activeAlerts(ride.ride_id);
  const openDeviation = alerts.find((a) => a.alert_type === 'deviation');

  if (distanceM > config.deviationThresholdM && !openDeviation) {
    const { rows: [alert] } = await db.query(
      `INSERT INTO ride_alerts (ride_id, alert_type, message, lat, lon, distance_m, raised_by)
       VALUES ($1, 'deviation', $2, $3, $4, $5, NULL) RETURNING *`,
      [ride.ride_id, `Mașina s-a abătut cu ${Math.round(distanceM)} m de la traseul spre ${ride.school_short_name}.`,
        point.lat, point.lon, Math.round(distanceM)]
    );
    const bookings = await getRideBookings(ride.ride_id);
    await notifyMany(db, [...parentIdsOf(bookings, ride.driver_id), ride.driver_id], {
      title: 'Deviere de la traseul școlii',
      message: `Cursa cu ${ride.driver_name} s-a abătut cu ${Math.round(distanceM)} m de la traseu. Verifică situația.`,
      type: 'deviation',
      link: `alert.html?rideId=${ride.ride_id}`,
    });
    return { deviation: alert };
  }
  if (distanceM <= config.deviationThresholdM && openDeviation) {
    // Mașina a revenit pe traseu: alerta se închide automat
    await db.query('UPDATE ride_alerts SET resolved_at = now() WHERE alert_id = $1', [openDeviation.alert_id]);
  }
  return { deviation: null };
}

module.exports = {
  RIDE_SELECT_SQL: RIDE_SELECT,
  getRide, getRideBookings, assertParticipant, seatMap, matchForRide, persistMatch,
  rideRoute, estimateDurationMin, walkingMinutes, liveState, recordLocation, activeAlerts, parentIdsOf,
};
