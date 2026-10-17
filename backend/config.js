const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET lipsește din .env (vezi .env.example)');
}

module.exports = {
  port: num(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  timezone: process.env.APP_TIMEZONE || 'Europe/Bucharest',
  publicUrl: process.env.PUBLIC_URL || '',

  // Simularea deplasării mașinii (pentru demo fără GPS real)
  allowSimulation: bool(process.env.ALLOW_SIMULATION, true),

  // Distanța față de traseu peste care se declanșează alerta de deviere
  deviationThresholdM: num(process.env.DEVIATION_THRESHOLD_M, 600),

  // Cheia pentru modelul AI al asistentului (goală = asistent neconfigurat)
  aiApiKey: process.env.AI_API_KEY || '',

  // Fondul social: cât dublează sponsorul pentru fiecare leu donat
  sponsorMatchRatio: num(process.env.SPONSOR_MATCH_RATIO, 1),

  // Constante pentru calculul impactului
  impact: {
    roadFactor: 1.3,          // distanța pe drum ≈ distanța în linie dreaptă × 1.3
    co2KgPerKm: 0.12,         // emisii medii autoturism
    costLeiPerKm: 0.8,        // combustibil + uzură
    avgSpeedKmh: 25,          // viteză medie urbană la ore de vârf
    walkSpeedKmh: 4.5,
    pointsPerRide: 10,
  },
};
