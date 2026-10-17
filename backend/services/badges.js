// Insigne calculate din activitatea reală a familiei

const db = require('../../db/db');

const BADGES = [
  { code: 'first_ride', title: 'Coleg de Drum', description: 'Prima cursă la școală cu un coleg.', metric: 'sharedRides', goal: 1 },
  { code: 'ten_rides', title: 'Navetist Verde', description: '10 curse în carpool spre școală.', metric: 'sharedRides', goal: 10 },
  { code: 'friends', title: 'Prieten Nou', description: 'A călătorit cu 2 colegi diferiți.', metric: 'distinctCompanions', goal: 2 },
  { code: 'punctual', title: 'Campion la Punctualitate', description: 'A ajuns înainte de clopoțel de 5 ori.', metric: 'onTimeArrivals', goal: 5 },
  { code: 'driver', title: 'Șofer de Încredere', description: 'A dus la școală 5 copii ai altor familii.', metric: 'childrenDriven', goal: 5 },
  { code: 'green_hero', title: 'Erou Verde', description: 'A strâns 100 de puncte Erou Verde.', metric: 'greenPoints', goal: 100 },
  { code: 'donor', title: 'Inimă Mare', description: 'A donat în Fondul Social pentru copiii de la sat.', metric: 'donations', goal: 1 },
];

async function metricsFor(userId) {
  const { rows: [m] } = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM bookings b JOIN rides r ON r.ride_id = b.ride_id
         WHERE b.parent_id = $1 AND r.driver_id <> $1 AND b.booking_status = 'arrived_at_school') AS "sharedRides",
       (SELECT COUNT(DISTINCT other.child_id) FROM bookings b
          JOIN bookings other ON other.ride_id = b.ride_id AND other.child_id <> b.child_id
                              AND other.booking_status = 'arrived_at_school' AND other.parent_id <> $1
         WHERE b.parent_id = $1 AND b.booking_status = 'arrived_at_school') AS "distinctCompanions",
       (SELECT COUNT(*) FROM bookings b JOIN rides r ON r.ride_id = b.ride_id JOIN schools s ON s.school_id = r.school_id
         WHERE b.parent_id = $1 AND b.booking_status = 'arrived_at_school' AND r.direction = 'to_school'
           AND b.dropoff_time::time <= s.bell_time) AS "onTimeArrivals",
       (SELECT COUNT(*) FROM bookings b JOIN rides r ON r.ride_id = b.ride_id
         WHERE r.driver_id = $1 AND b.parent_id <> $1 AND b.booking_status = 'arrived_at_school') AS "childrenDriven",
       (SELECT green_points FROM users WHERE user_id = $1) AS "greenPoints",
       (SELECT COUNT(*) FROM social_fund_transactions WHERE donor_id = $1 AND transaction_type = 'donation') AS donations`,
    [userId]
  );
  return m;
}

async function badgesFor(userId) {
  const metrics = await metricsFor(userId);
  return BADGES.map((b) => {
    const value = Number(metrics[b.metric] || 0);
    return { ...b, value, earned: value >= b.goal, progress: Math.min(1, value / b.goal) };
  });
}

module.exports = { badgesFor };
