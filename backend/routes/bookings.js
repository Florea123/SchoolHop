// Rezervări: locul copilului pe una sau mai multe curse, preluare, predare

const express = require('express');
const db = require('../../db/db');
const config = require('../config');
const rides = require('../services/rides');
const actions = require('../services/rideActions');
const serialize = require('../services/serialize');
const { interestLabels } = require('../services/catalog');
const { SEAT_LABELS, seatsForVehicle, seatAllowedForChild, ageOn } = require('../services/seats');
const { notify } = require('../services/notify');
const { firstName } = require('../services/ai');
const { badRequest, conflict, forbidden, notFound, requireFields, toInt } = require('../utils/http');

const router = express.Router();

function formatDay(date) {
  return new Date(date).toLocaleDateString('ro-RO', { timeZone: config.timezone, weekday: 'long', day: 'numeric', month: 'long' });
}

router.post('/', async (req, res) => {
  requireFields(req.body, ['childId', 'rideIds']);
  const childId = toInt(req.body.childId, 'Copilul');
  if (!Array.isArray(req.body.rideIds) || !req.body.rideIds.length) throw badRequest('Selectează cel puțin o cursă');
  if (req.body.rideIds.length > 14) throw badRequest('Poți rezerva cel mult 14 curse odată');
  const rideIds = [...new Set(req.body.rideIds.map((id) => toInt(id, 'ID cursă')))];
  const preferred = req.body.seatPosition ? String(req.body.seatPosition) : null;
  if (preferred && !SEAT_LABELS[preferred]) throw badRequest('Loc invalid');

  const { rows: [child] } = await db.query('SELECT * FROM children WHERE child_id = $1', [childId]);
  if (!child || child.parent_id !== req.user.id) throw forbidden('Poți rezerva doar pentru copiii tăi');
  if (child.home_lat == null) throw badRequest('Completează mai întâi zona de domiciliu a copilului în profil');

  const created = await db.withTransaction(async (client) => {
    const out = [];
    for (const rideId of rideIds) {
      await client.query('SELECT 1 FROM rides WHERE ride_id = $1 FOR UPDATE', [rideId]);
      const ride = await rides.getRide(rideId, client);
      const label = formatDay(ride.departure_time);
      if (ride.school_id !== child.school_id) throw badRequest(`Cursa din ${label} nu merge la școala copilului`);
      if (ride.ride_status !== 'scheduled' || new Date(ride.departure_time) <= new Date()) throw conflict(`Cursa din ${label} nu mai acceptă rezervări`);
      if (ride.driver_id === req.user.id) throw badRequest('Nu poți rezerva pe propria cursă');
      if (ride.available_seats <= 0) throw conflict(`Cursa din ${label} nu mai are locuri libere`);

      const bookings = await rides.getRideBookings(rideId, client);
      if (bookings.some((b) => b.child_id === childId)) throw conflict(`${firstName(child.full_name)} are deja loc pe cursa din ${label}`);
      const map = rides.seatMap(ride, bookings, child);
      if (child.needs_booster && map.boostersLeft <= 0) throw conflict(`Nu mai există înălțător disponibil pe cursa din ${label}`);

      const age = ageOn(child.birth_date, new Date(ride.departure_time));
      const taken = bookings.map((b) => b.seat_position);
      const free = seatsForVehicle(ride.child_seats).filter((p) => !taken.includes(p) && seatAllowedForChild(p, age));
      const seat = preferred && free.includes(preferred) ? preferred : free.find((p) => p !== 'front_right') || free[0];
      if (!seat) throw conflict(`Nu există un loc potrivit vârstei copilului pe cursa din ${label}`);

      const funded = ride.is_social_fund && child.is_social_beneficiary;
      const price = ride.is_social_fund ? 0 : ride.price_per_seat;
      const { rows: [booking] } = await client.query(
        `INSERT INTO bookings (ride_id, child_id, parent_id, seat_position, uses_booster, pickup_address, pickup_lat, pickup_lon, price, is_funded_by_social_fund)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [rideId, childId, req.user.id, seat, child.needs_booster, ride.departure_address, ride.departure_lat, ride.departure_lon, price, funded]
      );
      await client.query('UPDATE rides SET available_seats = available_seats - 1 WHERE ride_id = $1', [rideId]);
      await notify(client, ride.driver_id, {
        title: 'Rezervare nouă ',
        message: `${child.full_name} (${child.grade}) merge cu tine ${label}, pe locul „${SEAT_LABELS[seat]}”.`,
        type: 'booking',
        link: `ride.html?rideId=${rideId}`,
      });
      out.push({
        bookingId: booking.booking_id, rideId, departureTime: ride.departure_time, direction: ride.direction,
        seatPosition: seat, seatLabel: SEAT_LABELS[seat], price, seatChanged: Boolean(preferred && seat !== preferred),
      });
    }
    return out;
  });

  res.status(201).json({ bookings: created, total: created.reduce((s, b) => s + b.price, 0) });
});

async function loadBooking(id) {
  const { rows: [b] } = await db.query(
    `SELECT b.*, c.full_name AS child_name, c.grade, c.interests, c.birth_date, c.school_id AS child_school_id
     FROM bookings b JOIN children c ON c.child_id = b.child_id WHERE b.booking_id = $1`,
    [id]
  );
  if (!b) throw notFound('Rezervarea nu a fost găsită');
  return b;
}

router.get('/:id', async (req, res) => {
  const booking = await loadBooking(toInt(req.params.id, 'ID rezervare'));
  const ride = await rides.getRide(booking.ride_id);
  if (booking.parent_id !== req.user.id && ride.driver_id !== req.user.id) throw forbidden();
  const { rows: [review] } = await db.query('SELECT * FROM reviews WHERE booking_id = $1 AND parent_id = $2', [booking.booking_id, req.user.id]);
  res.json({
    booking: {
      id: booking.booking_id, status: booking.booking_status, seatPosition: booking.seat_position,
      seatLabel: SEAT_LABELS[booking.seat_position], price: booking.price, pickupTime: booking.pickup_time,
      dropoffTime: booking.dropoff_time, parentConfirmedAt: booking.parent_confirmed_at,
      isFundedBySocialFund: booking.is_funded_by_social_fund,
      shareToken: booking.parent_id === req.user.id ? booking.share_token : null,
      childName: booking.child_name, grade: booking.grade, isMine: booking.parent_id === req.user.id,
    },
    ride: serialize.rideSummary(ride),
    review: review ? { rating: review.rating, comment: review.comment } : null,
  });
});

router.post('/:id/cancel', async (req, res) => {
  const booking = await loadBooking(toInt(req.params.id, 'ID rezervare'));
  if (booking.parent_id !== req.user.id) throw forbidden('Poți anula doar rezervările tale');
  const ride = await rides.getRide(booking.ride_id);
  if (booking.booking_status !== 'confirmed' || ride.ride_status !== 'scheduled') throw badRequest('Rezervarea nu mai poate fi anulată');
  await db.withTransaction(async (client) => {
    await client.query("UPDATE bookings SET booking_status = 'cancelled' WHERE booking_id = $1", [booking.booking_id]);
    await client.query('UPDATE rides SET available_seats = available_seats + 1 WHERE ride_id = $1', [ride.ride_id]);
    await notify(client, ride.driver_id, {
      title: 'Rezervare anulată',
      message: `${booking.child_name} nu mai vine cu tine ${formatDay(ride.departure_time)}.`,
      type: 'booking',
      link: `ride.html?rideId=${ride.ride_id}`,
    });
  });
  res.json({ ok: true });
});

router.post('/:id/pickup', async (req, res) => {
  const booking = await loadBooking(toInt(req.params.id, 'ID rezervare'));
  const ride = await rides.getRide(booking.ride_id);
  if (ride.driver_id !== req.user.id) throw forbidden('Doar șoferul poate confirma preluarea');
  await actions.pickUpBooking(ride, booking);
  res.json(await rides.liveState(ride));
});

// Părintele confirmă predarea (+10 puncte)
router.post('/:id/confirm-arrival', async (req, res) => {
  const booking = await loadBooking(toInt(req.params.id, 'ID rezervare'));
  if (booking.parent_id !== req.user.id) throw forbidden();
  if (booking.booking_status !== 'arrived_at_school') throw badRequest('Copilul nu a fost încă predat la școală');
  let pointsAwarded = 0;
  if (!booking.parent_confirmed_at) {
    await db.withTransaction(async (client) => {
      await client.query('UPDATE bookings SET parent_confirmed_at = now() WHERE booking_id = $1', [booking.booking_id]);
      await client.query('UPDATE users SET green_points = green_points + $1 WHERE user_id = $2', [config.impact.pointsPerRide, req.user.id]);
    });
    pointsAwarded = config.impact.pointsPerRide;
  }
  const { rows: [u] } = await db.query('SELECT green_points FROM users WHERE user_id = $1', [req.user.id]);
  res.json({ pointsAwarded, greenPoints: u.green_points });
});

module.exports = router;
