/**
 * Safety cron job
 * Runs every 15 seconds and performs safety checks on all in-progress trips.
 */

const cron = require('node-cron');
const { query } = require('../db');
const { checkDeviation, checkLongStop, checkArrivalTimeouts } = require('../services/safety');

/**
 * Start the safety monitoring cron job.
 */
function startSafetyJob() {
  const task = cron.schedule('*/15 * * * * *', async () => {
    try {
      // Get all in-progress trips and their latest position
      const tripsRes = await query(
        `SELECT t.id AS trip_id,
                tp.lat, tp.lng
         FROM trips t
         LEFT JOIN LATERAL (
           SELECT lat, lng
           FROM trip_positions
           WHERE trip_id = t.id
           ORDER BY recorded_at DESC
           LIMIT 1
         ) tp ON true
         WHERE t.status = 'in_progress'`,
        []
      );

      for (const trip of tripsRes.rows) {
        const { trip_id, lat, lng } = trip;

        // Run checks in parallel, log but don't crash the job on individual failures
        const checks = [];

        if (lat !== null && lng !== null) {
          checks.push(
            checkDeviation(trip_id, parseFloat(lat), parseFloat(lng)).catch((err) =>
              console.error(`[SAFETY JOB] checkDeviation failed trip=${trip_id}:`, err.message)
            )
          );
        }

        checks.push(
          checkLongStop(trip_id).catch((err) =>
            console.error(`[SAFETY JOB] checkLongStop failed trip=${trip_id}:`, err.message)
          )
        );

        checks.push(
          checkArrivalTimeouts(trip_id).catch((err) =>
            console.error(`[SAFETY JOB] checkArrivalTimeouts failed trip=${trip_id}:`, err.message)
          )
        );

        await Promise.all(checks);
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.message.includes('connect ECONNREFUSED')) {
        // Ignorăm silențios dacă utilizatorul testează fără Postgres local
      } else {
        console.error('[SAFETY JOB] Unexpected error:', err.message);
      }
    }
  });

  console.log('[SAFETY JOB] Started — running every 15 seconds');
  return task;
}

module.exports = { startSafetyJob };
