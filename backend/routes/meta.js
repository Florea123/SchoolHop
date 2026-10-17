// Date publice de referință: școli, zone, interese, configurare client

const express = require('express');
const db = require('../../db/db');
const config = require('../config');
const ai = require('../services/ai');

const router = express.Router();

router.get('/', async (_req, res) => {
  const [schools, areas, interests] = await Promise.all([
    db.query(`SELECT school_id AS id, name, short_name AS "shortName", address, lat, lon,
                     dropoff_point_label AS "dropoffPoint", phone, bell_time AS "bellTime", account_prefix AS "accountPrefix"
              FROM schools ORDER BY name`),
    db.query('SELECT area_id AS id, name, lat, lon, is_rural AS "isRural" FROM areas ORDER BY name'),
    db.query('SELECT slug, label FROM interests ORDER BY label'),
  ]);
  res.json({
    schools: schools.rows,
    areas: areas.rows,
    interests: interests.rows,
    config: {
      allowSimulation: config.allowSimulation,
      aiProvider: ai.isLlmEnabled() ? 'llm' : 'local',
      deviationThresholdM: config.deviationThresholdM,
      frontSeatMinAge: require('../services/seats').FRONT_SEAT_MIN_AGE,
    },
  });
});

module.exports = router;
