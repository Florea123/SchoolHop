// Curse: căutare cu potrivire AI, detalii, publicare, urmărire live, alerte

const express = require('express');
const db = require('../../db/db');
const config = require('../config');
const geo = require('../services/geo');
const ai = require('../services/ai');
const rides = require('../services/rides');
const actions = require('../services/rideActions');
const serialize = require('../services/serialize');
const { interestLabels, findArea } = require('../services/catalog');
const { seatsForVehicle, ageOn, seatAllowedForChild } = require('../services/seats');
const { notify, notifyMany } = require('../services/notify');
const {
  badRequest, forbidden, notFound, requireFields, toInt, toNumber, toDateString, toTimeString, trimOrNull,
} = require('../utils/http');
const validate = require('../utils/validate');

// Data trebuie să fie între azi și peste `maxDays` zile
function dateInRange(value, label, maxDays) {
  const d = toDateString(value, label);
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: config.timezone });
  const max = new Date(Date.now() + maxDays * 86400000).toLocaleDateString('sv-SE', { timeZone: config.timezone });
  if (d < today) throw badRequest(`${label} nu poate fi în trecut`);
  if (d > max) throw badRequest(`${label} poate fi cel mult peste ${maxDays} de zile`);
  return d;
}

const router = express.Router();
const NEARBY_KM = 3;

async function ownChildOrThrow(childId, userId) {
  const { rows: [child] } = await db.query('SELECT * FROM children WHERE child_id = $1', [childId]);
  if (!child) throw notFound('Copilul nu a fost găsit');
  if (child.parent_id !== userId) throw forbidden('Poți căuta curse doar pentru copiii tăi');
  return child;
}

function freeSeatsForChild(map) {
  return map.seats.filter((s) => s.status === 'free').length;
}

function minutesOfDay(date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(date));
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// GET /api/rides/search?childId=&date=&area=&arriveBy=&direction=
// ---------------------------------------------------------------------------
router.get('/search', async (req, res) => {
  const child = await ownChildOrThrow(toInt(req.query.childId, 'Copilul'), req.user.id);
  const date = dateInRange(req.query.date, 'Data', 60);
  const direction = req.query.direction === 'from_school' ? 'from_school' : 'to_school';
  const arriveBy = req.query.arriveBy ? toTimeString(req.query.arriveBy, 'Ora sosirii') : null;

  let origin = child.home_lat != null ? { lat: child.home_lat, lon: child.home_lon, label: child.home_village_or_area } : null;
  if (req.query.area) {
    const area = await findArea(req.query.area);
    if (!area) throw badRequest('Zona selectată nu există');
    if (area.name !== child.home_village_or_area || !origin) origin = { lat: area.lat, lon: area.lon, label: area.name };
  }

  const { rows } = await db.query(
    `SELECT * FROM (${rides.RIDE_SELECT_SQL}) r
     WHERE r.school_id = $1 AND r.direction = $2 AND r.ride_status = 'scheduled'
       AND (r.departure_time AT TIME ZONE '${config.timezone}')::date = $3::date
       AND r.departure_time > now() AND r.driver_id <> $4
     ORDER BY r.departure_time`,
    [child.school_id, direction, date, req.user.id]
  );

  const results = [];
  for (const ride of rows) {
    const bookings = await rides.getRideBookings(ride.ride_id);
    const alreadyBooked = bookings.some((b) => b.child_id === child.child_id);
    const map = rides.seatMap(ride, bookings, child);
    const freeSeats = freeSeatsForChild(map);
    const boosterOk = !child.needs_booster || map.boostersLeft > 0;
    const match = await rides.matchForRide(child, bookings);
    const meetPoint = direction === 'to_school'
      ? { lat: ride.departure_lat, lon: ride.departure_lon }
      : { lat: ride.destination_lat, lon: ride.destination_lon };
    const distanceKm = origin ? Math.round(geo.haversineM(origin, meetPoint) / 100) / 10 : null;
    const durationMin = rides.estimateDurationMin(ride);
    const arrival = new Date(new Date(ride.departure_time).getTime() + durationMin * 60000);
    const [h, m] = (arriveBy || '23:59').split(':').map(Number);

    results.push({
      ride: serialize.rideSummary(ride),
      match: { score: match.score, reasons: match.reasons, commonInterests: match.commonInterests, companion: match.companion, recommendation: match.recommendation },
      pair: match.pair,
      companions: bookings.filter((b) => b.child_id !== child.child_id).map((b) => ({ name: ai.firstName(b.child_name), grade: b.grade })),
      distanceKm,
      nearby: distanceKm === null || distanceKm <= NEARBY_KM,
      walkMinutes: rides.walkingMinutes(origin, meetPoint),
      estimatedArrival: arrival,
      arrivesOnTime: !arriveBy || minutesOfDay(arrival) <= h * 60 + m,
      freeSeats,
      boosterAvailable: boosterOk,
      bookable: !alreadyBooked && freeSeats > 0 && boosterOk,
      alreadyBooked,
    });
  }

  results.sort((a, b) => (Number(b.nearby) - Number(a.nearby)) || (Number(b.bookable) - Number(a.bookable))
    || (b.match.score - a.match.score) || ((a.distanceKm ?? 0) - (b.distanceKm ?? 0)));

  // Primele potriviri primesc o recomandare persistată
  await Promise.all(results.slice(0, 3).map(async (r) => {
    if (r.pair) r.match.recommendation = await rides.persistMatch(...r.pair);
  }));
  results.forEach((r) => { delete r.pair; });

  const labels = await interestLabels();
  res.json({ child: serialize.child(child, labels), date, direction, origin, arriveBy, results });
});

// ---------------------------------------------------------------------------
// GET /api/rides/:id?childId=  — detalii cursă, locuri, săptămâna cursei
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const ride = await rides.getRide(toInt(req.params.id, 'ID cursă'));
  const bookings = await rides.getRideBookings(ride.ride_id);
  const child = req.query.childId ? await ownChildOrThrow(toInt(req.query.childId, 'Copilul'), req.user.id) : null;

  let role = null;
  try { role = await rides.assertParticipant(ride, req.user, bookings); } catch { role = null; }
  if (!role && !child) {
    // Poate vedea cursa orice părinte verificat cu un copil la aceeași școală
    const { rows } = await db.query('SELECT 1 FROM children WHERE parent_id = $1 AND school_id = $2 LIMIT 1', [req.user.id, ride.school_id]);
    if (!rows.length) throw forbidden('Cursa aparține altei școli');
  }
  if (child && child.school_id !== ride.school_id) throw badRequest('Copilul nu învață la școala acestei curse');

  const summary = serialize.rideSummary(ride);
  if (!role) summary.driver.phone = null;

  const response = {
    ride: summary,
    role,
    seatMap: rides.seatMap(ride, bookings, child),
    companions: bookings.map((b) => ({ childId: b.child_id, name: role ? b.child_name : ai.firstName(b.child_name), grade: b.grade, seatPosition: b.seat_position })),
    durationMin: rides.estimateDurationMin(ride),
    myBookings: bookings.filter((b) => b.parent_id === req.user.id).map((b) => ({ bookingId: b.booking_id, childId: b.child_id, status: b.booking_status })),
  };

  if (child) {
    const match = await rides.matchForRide(child, bookings);
    if (match.pair) match.recommendation = await rides.persistMatch(...match.pair);
    delete match.pair;
    const home = child.home_lat != null ? { lat: child.home_lat, lon: child.home_lon } : null;
    const meet = { lat: ride.departure_lat, lon: ride.departure_lon };
    response.child = serialize.child(child, await interestLabels());
    response.match = match;
    response.walkMinutes = rides.walkingMinutes(home, meet);
    response.home = home;
    response.childAge = ageOn(child.birth_date, new Date(ride.departure_time));

    // Aceeași cursă în alte zile din săptămână (pentru rezervarea pe mai multe zile) + cursele de întoarcere
    const series = await db.query(
      `SELECT * FROM (${rides.RIDE_SELECT_SQL}) r
       WHERE r.driver_id = $1 AND r.school_id = $2 AND r.ride_status = 'scheduled' AND r.departure_time > now()
         AND r.departure_time < $3::timestamptz + interval '7 days' AND r.departure_time >= $3::timestamptz - interval '1 day'
       ORDER BY r.departure_time`,
      [ride.driver_id, ride.school_id, ride.departure_time]
    );
    const rideMinutes = minutesOfDay(ride.departure_time);
    const days = [];
    for (const r of series.rows) {
      const sameSlot = r.direction === ride.direction && Math.abs(minutesOfDay(r.departure_time) - rideMinutes) <= 30;
      const isReturn = r.direction !== ride.direction;
      if (!sameSlot && !isReturn) continue;
      const bks = r.ride_id === ride.ride_id ? bookings : await rides.getRideBookings(r.ride_id);
      const map = rides.seatMap(r, bks, child);
      days.push({
        rideId: r.ride_id, direction: r.direction, isReturn, departureTime: r.departure_time,
        price: r.is_social_fund ? 0 : r.price_per_seat,
        freeSeats: map.seats.filter((s) => s.status === 'free').map((s) => s.position),
        boosterOk: !child.needs_booster || map.boostersLeft > 0,
        alreadyBooked: bks.some((b) => b.child_id === child.child_id),
      });
    }
    response.series = days;
  }
  res.json(response);
});

// ---------------------------------------------------------------------------
// POST /api/rides — publică o cursă (repetată în zilele selectate)
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const b = req.body;
  requireFields(b, ['schoolId', 'area', 'address', 'startDate', 'time', 'days', 'vehicleId', 'seats']);
  const schoolId = toInt(b.schoolId, 'Școala');
  const startDate = dateInRange(b.startDate, 'Data de început', 60);
  const time = toTimeString(b.time, 'Ora plecării');
  const returnTime = b.returnTime ? toTimeString(b.returnTime, 'Ora de întoarcere') : null;
  const price = toNumber(b.price ?? 0, 'Contribuția', { min: 0, max: 50 });
  const offered = toInt(b.seats, 'Locuri oferite', { min: 1, max: 7 });
  if (!Array.isArray(b.days) || !b.days.length) throw badRequest('Selectează cel puțin o zi');
  const days = [...new Set(b.days.map((d) => toInt(d, 'Ziua', { min: 1, max: 7 })))];

  const { rows: [school] } = await db.query('SELECT * FROM schools WHERE school_id = $1', [schoolId]);
  if (!school) throw badRequest('Școala nu există');
  const { rows: [vehicle] } = await db.query('SELECT * FROM vehicles WHERE vehicle_id = $1 AND owner_id = $2 AND is_active', [toInt(b.vehicleId, 'Mașina'), req.user.id]);
  if (!vehicle) throw badRequest('Selectează una dintre mașinile tale');
  const area = await findArea(b.area);
  if (!area) throw badRequest('Zona selectată nu există');
  const address = validate.text(b.address, 'Punctul de întâlnire', { min: 3, max: 255 });
  const notes = validate.text(b.notes, 'Notele', { max: 500, required: false });
  const lat = b.lat != null ? toNumber(b.lat, 'Latitudine', { min: 46.5, max: 47.8 }) : area.lat;
  const lon = b.lon != null ? toNumber(b.lon, 'Longitudine', { min: 26.8, max: 28.2 }) : area.lon;

  const { rows: [me] } = await db.query('SELECT * FROM users WHERE user_id = $1', [req.user.id]);
  if (!me.is_school_verified) throw forbidden('Contul tău nu este încă verificat de școală');
  const { rows: ownKids } = await db.query(
    'SELECT * FROM children WHERE parent_id = $1 AND school_id = $2 ORDER BY birth_date DESC', [req.user.id, schoolId]
  );
  const kidsInCar = b.includeOwnChildren === false ? [] : ownKids;
  if (!kidsInCar.length && !ownKids.length && me.role !== 'community_driver') {
    throw forbidden('Poți publica doar curse către școala copiilor tăi');
  }
  const totalSeats = kidsInCar.length + offered;
  if (totalSeats > vehicle.child_seats) {
    throw badRequest(`Mașina are ${vehicle.child_seats} locuri pentru copii (${kidsInCar.length} ocupate de copiii tăi)`);
  }

  // Zilele din intervalul [startDate, startDate + 6] care corespund zilelor selectate (1 = luni)
  const { rows: dates } = await db.query(
    `SELECT d::date::text AS day FROM generate_series($1::date, $1::date + 6, interval '1 day') d
     WHERE EXTRACT(ISODOW FROM d) = ANY($2::int[]) AND (d::date + $3::time) > now()::timestamp
     ORDER BY d`,
    [startDate, days, time]
  );
  if (!dates.length) throw badRequest('Nu există nicio zi viitoare care să corespundă selecției');

  const legs = [{ direction: 'to_school', time }];
  if (returnTime) legs.push({ direction: 'from_school', time: returnTime });

  const created = await db.withTransaction(async (client) => {
    const ids = [];
    for (const { day } of dates) {
      for (const leg of legs) {
        const toSchool = leg.direction === 'to_school';
        const { rows: [ride] } = await client.query(
          `INSERT INTO rides (driver_id, vehicle_id, school_id, direction, departure_village_or_area, departure_address,
              departure_lat, departure_lon, destination_dropoff_point, destination_lat, destination_lon, departure_time,
              total_seats, available_seats, price_per_seat, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ($12::date + $13::time) AT TIME ZONE '${config.timezone}', $14, $14, $15, $16)
           RETURNING *`,
          [req.user.id, vehicle.vehicle_id, schoolId, leg.direction,
            toSchool ? area.name : school.short_name,
            toSchool ? address : school.dropoff_point_label,
            toSchool ? lat : school.lat, toSchool ? lon : school.lon,
            toSchool ? school.dropoff_point_label : address,
            toSchool ? school.lat : lat, toSchool ? school.lon : lon,
            day, leg.time, totalSeats, price, notes]
        );
        // Copiii șoferului ocupă locurile din spate (sau din față, dacă au vârsta potrivită)
        const positions = seatsForVehicle(vehicle.child_seats);
        let boosters = vehicle.booster_seats;
        for (const kid of kidsInCar) {
          const age = ageOn(kid.birth_date, new Date(day));
          const used = (await client.query("SELECT seat_position FROM bookings WHERE ride_id = $1 AND booking_status <> 'cancelled'", [ride.ride_id])).rows.map((r) => r.seat_position);
          const seat = [...positions].reverse().find((p) => !used.includes(p) && seatAllowedForChild(p, age) && p !== 'front_right')
            || positions.find((p) => !used.includes(p) && seatAllowedForChild(p, age));
          const useBooster = kid.needs_booster && boosters > 0;
          if (useBooster) boosters -= 1;
          await client.query(
            `INSERT INTO bookings (ride_id, child_id, parent_id, seat_position, uses_booster, pickup_address, pickup_lat, pickup_lon, price)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)`,
            [ride.ride_id, kid.child_id, req.user.id, seat, useBooster, ride.departure_address, ride.departure_lat, ride.departure_lon]
          );
        }
        await client.query('UPDATE rides SET available_seats = total_seats - $1 WHERE ride_id = $2', [kidsInCar.length, ride.ride_id]);
        ids.push({ rideId: ride.ride_id, day, direction: leg.direction });
      }
    }
    if (me.role === 'parent') await client.query("UPDATE users SET role = 'parent_driver' WHERE user_id = $1", [req.user.id]);
    return ids;
  });

  // Anunță părinții din aceeași zonă și școală (potențiali colegi de drum)
  const { rows: neighbours } = await db.query(
    `SELECT DISTINCT parent_id FROM children WHERE school_id = $1 AND home_village_or_area = $2 AND parent_id <> $3`,
    [schoolId, area.name, req.user.id]
  );
  await notifyMany(db, neighbours.map((n) => n.parent_id), {
    title: `Cursă nouă din ${area.name} `,
    message: `${me.full_name} oferă ${offered} ${offered === 1 ? 'loc' : 'locuri'} spre ${school.short_name}, la ${time}.`,
    type: 'ride',
    link: `search.html?area=${encodeURIComponent(area.name)}&date=${dates[0].day}`,
  });

  res.status(201).json({ created, count: created.length });
});

// ---------------------------------------------------------------------------
// Acțiuni ale șoferului
// ---------------------------------------------------------------------------
async function driverRide(req) {
  const ride = await rides.getRide(toInt(req.params.id, 'ID cursă'));
  if (ride.driver_id !== req.user.id) throw forbidden('Doar șoferul cursei poate face această acțiune');
  return ride;
}

router.post('/:id/start', async (req, res) => {
  const ride = await actions.startRide(await driverRide(req));
  res.json(await rides.liveState(ride));
});

router.post('/:id/location', async (req, res) => {
  const ride = await driverRide(req);
  const point = { lat: toNumber(req.body.lat, 'Latitudine', { min: -90, max: 90 }), lon: toNumber(req.body.lon, 'Longitudine', { min: -180, max: 180 }) };
  if (ride.ride_status !== 'in_progress') throw badRequest('Cursa nu este în desfășurare');
  const result = await rides.recordLocation(ride, point);
  res.json({ ...(await rides.liveState(ride)), deviationRaised: Boolean(result.deviation) });
});

router.post('/:id/arrive', async (req, res) => {
  const ride = await driverRide(req);
  await actions.arriveRide(ride);
  res.json(await rides.liveState(await rides.getRide(ride.ride_id)));
});

router.post('/:id/cancel', async (req, res) => {
  const ride = await driverRide(req);
  if (ride.ride_status !== 'scheduled') throw badRequest('Doar cursele programate pot fi anulate');
  const bookings = await rides.getRideBookings(ride.ride_id);
  await db.withTransaction(async (client) => {
    await client.query("UPDATE rides SET ride_status = 'cancelled', available_seats = total_seats WHERE ride_id = $1", [ride.ride_id]);
    await client.query("UPDATE bookings SET booking_status = 'cancelled' WHERE ride_id = $1 AND booking_status <> 'cancelled'", [ride.ride_id]);
  });
  await notifyMany(db, rides.parentIdsOf(bookings, ride.driver_id), {
    title: 'Cursă anulată ',
    message: `${ride.driver_name} a anulat cursa din ${new Date(ride.departure_time).toLocaleDateString('ro-RO', { timeZone: config.timezone, weekday: 'long', day: 'numeric', month: 'long' })}. Caută o altă cursă.`,
    type: 'ride',
    link: 'search.html',
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Urmărire live, SOS, alerte, întrebarea zilei (participanți)
// ---------------------------------------------------------------------------
async function participantRide(req) {
  const ride = await rides.getRide(toInt(req.params.id, 'ID cursă'));
  const bookings = await rides.getRideBookings(ride.ride_id);
  const role = await rides.assertParticipant(ride, req.user, bookings);
  return { ride, bookings, role };
}

router.get('/:id/live', async (req, res) => {
  const { ride, role } = await participantRide(req);
  res.json({ ...(await rides.liveState(ride)), role, ride: serialize.rideSummary(ride), allowSimulation: config.allowSimulation });
});

router.post('/:id/simulate', async (req, res) => {
  if (!config.allowSimulation) throw forbidden('Simularea este dezactivată pe acest server');
  const { ride } = await participantRide(req);
  const action = req.body.action === 'deviate' ? 'deviate' : 'step';
  await actions.simulate(ride, action);
  const fresh = await rides.getRide(ride.ride_id);
  res.json(await rides.liveState(fresh));
});

router.post('/:id/sos', async (req, res) => {
  const { ride, bookings } = await participantRide(req);
  const last = (await rides.liveState(ride)).location;
  const { rows: [me] } = await db.query('SELECT full_name FROM users WHERE user_id = $1', [req.user.id]);
  const message = trimOrNull(req.body.message, 300) || `${me.full_name} a declanșat o alertă SOS pentru cursa cu ${ride.driver_name}.`;
  const { rows: [alert] } = await db.query(
    `INSERT INTO ride_alerts (ride_id, alert_type, message, lat, lon, raised_by) VALUES ($1, 'sos', $2, $3, $4, $5) RETURNING *`,
    [ride.ride_id, message, last ? last.lat : null, last ? last.lon : null, req.user.id]
  );
  const recipients = [...rides.parentIdsOf(bookings, req.user.id), ride.driver_id].filter((id) => id !== req.user.id);
  const { rows: admins } = await db.query("SELECT user_id FROM users WHERE role = 'admin' AND school_id = $1", [ride.school_id]);
  await notifyMany(db, [...recipients, ...admins.map((a) => a.user_id)], {
    title: 'Alertă SOS', message, type: 'sos', link: `ride.html?rideId=${ride.ride_id}`,
  });
  const { rows: contacts } = await db.query(
    `SELECT DISTINCT u.emergency_contact_name AS name, u.emergency_contact_phone AS phone
     FROM bookings b JOIN users u ON u.user_id = b.parent_id
     WHERE b.ride_id = $1 AND b.parent_id = $2 AND u.emergency_contact_phone IS NOT NULL`,
    [ride.ride_id, req.user.id]
  );
  res.status(201).json({
    alert, notified: new Set([...recipients, ...admins.map((a) => a.user_id)]).size,
    schoolPhone: ride.school_phone, driverPhone: ride.driver_phone, emergencyContacts: contacts,
  });
});

router.post('/:id/alerts/:alertId/resolve', async (req, res) => {
  const { ride, bookings } = await participantRide(req);
  const { rows: [alert] } = await db.query(
    'UPDATE ride_alerts SET resolved_at = now(), resolved_by = $1 WHERE alert_id = $2 AND ride_id = $3 AND resolved_at IS NULL RETURNING *',
    [req.user.id, toInt(req.params.alertId, 'ID alertă'), ride.ride_id]
  );
  if (!alert) throw notFound('Alerta nu există sau a fost deja rezolvată');
  const { rows: [me] } = await db.query('SELECT full_name FROM users WHERE user_id = $1', [req.user.id]);
  await notifyMany(db, [...rides.parentIdsOf(bookings, req.user.id), ride.driver_id].filter((id) => id !== req.user.id), {
    title: 'Situație clarificată',
    message: `${me.full_name} a confirmat că situația cursei cu ${ride.driver_name} este în regulă.`,
    type: alert.alert_type, link: `ride.html?rideId=${ride.ride_id}`,
  });
  res.json({ alert });
});

router.get('/:id/topic', async (req, res) => {
  const { ride, bookings } = await participantRide(req);
  if (!ride.ai_topic) {
    const labels = await interestLabels();
    const topic = await ai.dailyQuestion(bookings, labels, ride.departure_time);
    await db.query('UPDATE rides SET ai_topic = $1 WHERE ride_id = $2', [topic, ride.ride_id]);
    ride.ai_topic = topic;
  }
  res.json({ topic: ride.ai_topic, provider: ai.isLlmEnabled() ? 'llm' : 'local' });
});

module.exports = router;
