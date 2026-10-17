// Contul utilizatorului: profil, acasă, cursele mele, impact, insigne

const express = require('express');
const db = require('../../db/db');
const { badRequest } = require('../utils/http');
const validate = require('../utils/validate');
const { interestLabels } = require('../services/catalog');
const serialize = require('../services/serialize');
const { familyImpact, schoolImpact } = require('../services/stats');
const { badgesFor } = require('../services/badges');
const { SEAT_LABELS } = require('../services/seats');
const { publicUser } = require('./auth');

const router = express.Router();

async function loadMe(userId) {
  const { rows: [user] } = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  if (!user) throw badRequest('Utilizator inexistent');
  const labels = await interestLabels();
  const [children, vehicles, school, unread] = await Promise.all([
    db.query('SELECT * FROM children WHERE parent_id = $1 ORDER BY birth_date', [userId]),
    db.query('SELECT * FROM vehicles WHERE owner_id = $1 AND is_active ORDER BY created_at', [userId]),
    db.query('SELECT school_id AS id, name, short_name AS "shortName", phone, bell_time AS "bellTime", dropoff_point_label AS "dropoffPoint" FROM schools WHERE school_id = $1', [user.school_id]),
    db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND NOT is_read', [userId]),
  ]);
  return {
    user: {
      ...publicUser(user),
      emergencyContactName: user.emergency_contact_name,
      emergencyContactPhone: user.emergency_contact_phone,
      greenPoints: user.green_points,
    },
    school: school.rows[0] || null,
    children: children.rows.map((c) => serialize.child(c, labels)),
    vehicles: vehicles.rows.map(serialize.vehicle),
    unreadNotifications: unread.rows[0].n,
  };
}

router.get('/', async (req, res) => {
  res.json(await loadMe(req.user.id));
});

router.patch('/', async (req, res) => {
  const b = req.body;
  const fields = {};
  if (b.phone !== undefined) fields.phone = validate.phone(b.phone);
  if (b.emergencyContactName !== undefined) fields.emergency_contact_name = validate.personName(b.emergencyContactName, 'Numele contactului de urgență');
  if (b.emergencyContactPhone !== undefined) fields.emergency_contact_phone = validate.phone(b.emergencyContactPhone, 'Telefonul contactului de urgență');
  const sets = [];
  const values = [];
  for (const [col, value] of Object.entries(fields)) {
    values.push(value);
    sets.push(`${col} = $${values.length}`);
  }
  if (!sets.length) throw badRequest('Nimic de actualizat');
  values.push(req.user.id);
  await db.query(`UPDATE users SET ${sets.join(', ')} WHERE user_id = $${values.length}`, values);
  res.json(await loadMe(req.user.id));
});

router.get('/home', async (req, res) => {
  const me = await loadMe(req.user.id);
  const schoolId = me.user.schoolId;
  const [school, family, next] = await Promise.all([
    schoolId ? schoolImpact(schoolId, { days: 7 }) : null,
    familyImpact(req.user.id),
    db.query(
      `SELECT b.booking_id, b.booking_status, r.ride_id, r.departure_time, r.departure_address, r.direction,
              r.driver_id, u.full_name AS driver_name, c.full_name AS child_name
       FROM bookings b JOIN rides r ON r.ride_id = b.ride_id JOIN users u ON u.user_id = r.driver_id
       JOIN children c ON c.child_id = b.child_id
       WHERE b.parent_id = $1 AND b.booking_status IN ('confirmed', 'picked_up')
         AND r.ride_status IN ('scheduled', 'in_progress') AND r.departure_time > now() - interval '2 hours'
       ORDER BY r.departure_time LIMIT 1`,
      [req.user.id]
    ),
  ]);
  const n = next.rows[0];
  res.json({
    ...me,
    schoolImpact: school,
    familyImpact: family,
    nextRide: n ? {
      bookingId: n.booking_id, rideId: n.ride_id, status: n.booking_status, departureTime: n.departure_time,
      departureAddress: n.departure_address, direction: n.direction, driverName: n.driver_name,
      childName: n.child_name, isOwnRide: n.driver_id === req.user.id,
    } : null,
  });
});

// Cursele mele: rezervările copiilor + cursele pe care le conduc
router.get('/rides', async (req, res) => {
  const scope = req.query.scope === 'history' ? 'history' : 'upcoming';
  const timeFilter = scope === 'upcoming'
    ? "r.ride_status IN ('scheduled', 'in_progress') AND r.departure_time > now() - interval '3 hours'"
    : "(r.ride_status IN ('completed', 'cancelled') OR r.departure_time <= now() - interval '3 hours')";
  const order = scope === 'upcoming' ? 'ASC' : 'DESC';

  const bookings = await db.query(
    `SELECT b.booking_id, b.booking_status, b.seat_position, b.price, b.parent_confirmed_at,
            c.full_name AS child_name, r.ride_id, r.departure_time, r.departure_village_or_area, r.direction,
            r.destination_dropoff_point, r.ride_status, r.driver_id, u.full_name AS driver_name,
            s.short_name AS school_short_name,
            EXISTS (SELECT 1 FROM reviews rv WHERE rv.booking_id = b.booking_id) AS reviewed
     FROM bookings b JOIN rides r ON r.ride_id = b.ride_id JOIN users u ON u.user_id = r.driver_id
     JOIN children c ON c.child_id = b.child_id JOIN schools s ON s.school_id = r.school_id
     WHERE b.parent_id = $1 AND r.driver_id <> $1 AND ${timeFilter}
       AND (b.booking_status <> 'cancelled' OR $2 = 'history')
     ORDER BY r.departure_time ${order} LIMIT 60`,
    [req.user.id, scope]
  );
  const driving = await db.query(
    `SELECT r.ride_id, r.departure_time, r.departure_village_or_area, r.direction, r.destination_dropoff_point,
            r.ride_status, r.total_seats, r.available_seats, s.short_name AS school_short_name,
            (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.ride_id AND b.booking_status <> 'cancelled') AS children_count
     FROM rides r JOIN schools s ON s.school_id = r.school_id
     WHERE r.driver_id = $1 AND ${timeFilter}
     ORDER BY r.departure_time ${order} LIMIT 60`,
    [req.user.id]
  );

  res.json({
    scope,
    bookings: bookings.rows.map((b) => ({
      bookingId: b.booking_id, status: b.booking_status, seatLabel: SEAT_LABELS[b.seat_position], price: b.price,
      childName: b.child_name, rideId: b.ride_id, departureTime: b.departure_time, departureArea: b.departure_village_or_area,
      direction: b.direction, destination: b.destination_dropoff_point, rideStatus: b.ride_status,
      driverName: b.driver_name, schoolShortName: b.school_short_name, reviewed: b.reviewed,
      parentConfirmed: Boolean(b.parent_confirmed_at),
    })),
    driving: driving.rows.map((r) => ({
      rideId: r.ride_id, departureTime: r.departure_time, departureArea: r.departure_village_or_area,
      direction: r.direction, destination: r.destination_dropoff_point, status: r.ride_status,
      totalSeats: r.total_seats, availableSeats: r.available_seats, childrenCount: r.children_count,
      schoolShortName: r.school_short_name,
    })),
  });
});

router.get('/impact', async (req, res) => {
  const { rows: [u] } = await db.query('SELECT full_name FROM users WHERE user_id = $1', [req.user.id]);
  const fund = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS donated FROM social_fund_transactions
     WHERE donor_id = $1 AND transaction_type = 'donation'`, [req.user.id]
  );
  res.json({ familyName: u.full_name, ...(await familyImpact(req.user.id)), donatedLei: fund.rows[0].donated });
});

router.get('/badges', async (req, res) => {
  res.json({ badges: await badgesFor(req.user.id) });
});

module.exports = router;
module.exports.loadMe = loadMe;
