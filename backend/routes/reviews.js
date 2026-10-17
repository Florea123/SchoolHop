// Evaluarea șoferului după cursă

const express = require('express');
const db = require('../../db/db');
const { badRequest, forbidden, notFound, requireFields, toInt } = require('../utils/http');
const validate = require('../utils/validate');
const { notify } = require('../services/notify');

const router = express.Router();

router.post('/', async (req, res) => {
  requireFields(req.body, ['bookingId', 'rating']);
  const bookingId = toInt(req.body.bookingId, 'Rezervarea');
  const rating = toInt(req.body.rating, 'Nota', { min: 1, max: 5 });
  const safety = req.body.safetyRating != null ? toInt(req.body.safetyRating, 'Siguranța', { min: 1, max: 5 }) : null;
  const punctuality = req.body.punctualityRating != null ? toInt(req.body.punctualityRating, 'Punctualitatea', { min: 1, max: 5 }) : null;

  const { rows: [b] } = await db.query(
    `SELECT b.*, r.driver_id, c.full_name AS child_name FROM bookings b JOIN rides r ON r.ride_id = b.ride_id
     JOIN children c ON c.child_id = b.child_id WHERE b.booking_id = $1`, [bookingId]
  );
  if (!b) throw notFound('Rezervarea nu a fost găsită');
  if (b.parent_id !== req.user.id) throw forbidden('Poți evalua doar cursele copiilor tăi');
  if (b.driver_id === req.user.id) throw badRequest('Nu îți poți evalua propria cursă');
  if (b.booking_status !== 'arrived_at_school') throw badRequest('Poți evalua cursa după ce copilul a ajuns la școală');

  const { rows: [review] } = await db.query(
    `INSERT INTO reviews (booking_id, parent_id, driver_id, rating, safety_rating, punctuality_rating, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (booking_id, parent_id) DO UPDATE SET rating = EXCLUDED.rating, safety_rating = EXCLUDED.safety_rating,
       punctuality_rating = EXCLUDED.punctuality_rating, comment = EXCLUDED.comment
     RETURNING *`,
    [bookingId, req.user.id, b.driver_id, rating, safety, punctuality, validate.text(req.body.comment, 'Comentariul', { max: 1000, required: false })]
  );
  await notify(db, b.driver_id, {
    title: `Ai primit ${'★'.repeat(rating)}`,
    message: `Un părinte a evaluat cursa cu ${b.child_name.split(' ')[0]}.`,
    type: 'review',
    link: 'my-rides.html',
  });
  res.status(201).json({ review });
});

module.exports = router;
