// ==============================================================================
// SchoolHop - aplicația Express (API JSON + fișierele statice ale frontend-ului)
// ==============================================================================

const path = require('path');
const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('./middleware/auth');
const { notFoundApi, errorHandler } = require('./middleware/errors');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    // Doar originea pleacă spre alte site-uri (ex. tile-urile OpenStreetMap o cer), niciodată calea completă
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// --- API --------------------------------------------------------------------
const api = express.Router();

api.get('/health', async (_req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true });
});

api.use('/auth', require('./routes/auth'));
api.use('/meta', require('./routes/meta'));
api.use('/share', require('./routes/share')); // public, pe bază de token

api.use(requireAuth);
api.use('/me', require('./routes/me'));
api.use('/children', require('./routes/children'));
api.use('/vehicles', require('./routes/vehicles'));
api.use('/rides', require('./routes/rides'));
api.use('/bookings', require('./routes/bookings'));
api.use('/reviews', require('./routes/reviews'));
api.use('/notifications', require('./routes/notifications'));
api.use('/social-fund', require('./routes/fund'));
api.use('/schools', require('./routes/schools'));
api.use('/assistant', require('./routes/assistant'));

app.use('/api', api);
app.use('/api', notFoundApi);

// --- Frontend static ----------------------------------------------------------
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir, { extensions: ['html'], maxAge: 0 }));
app.use((req, res) => res.status(404).sendFile(path.join(frontendDir, '404.html')));

app.use(errorHandler);

module.exports = app;
