/**
 * TakeMe API — Express entry point
 * Carpooling sigur pentru navetisti din Iași, România
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const openApiSpec = require('./swagger/openapi');
const errorHandler = require('./middleware/errorHandler');
const { startSafetyJob } = require('./jobs/safetyJob');

// Route modules
const authRoutes     = require('./routes/auth');
const meRoutes       = require('./routes/me');
const vehiclesRoutes = require('./routes/vehicles');
const routesRoutes   = require('./routes/routes');
const tripsRoutes    = require('./routes/trips');
const shareRoutes    = require('./routes/share');
const searchRoutes   = require('./routes/search');
const bookingsRoutes = require('./routes/bookings');
const statsRoutes    = require('./routes/stats');
const reviewsRoutes  = require('./routes/reviews');

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(cors()); // Allow all origins in dev
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------------------
// Swagger UI
// ---------------------------------------------------------------------------
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'TakeMe API Docs',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/auth',     authRoutes);
app.use('/me',       meRoutes);
app.use('/vehicles', vehiclesRoutes);
app.use('/routes',   routesRoutes);
app.use('/trips',    tripsRoutes);
app.use('/share',    shareRoutes);   // public — GET /share/:token (no auth)
app.use('/search',   searchRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/stats',    statsRoutes);
app.use('/reviews',  reviewsRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'TakeMe API' }));

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT, 10) || 3001;

app.listen(PORT, () => {
  console.log(`🚀 TakeMe API running on http://localhost:${PORT}`);
  console.log(`📖 API Docs: http://localhost:${PORT}/docs`);

  // Start the safety cron job
  startSafetyJob();
});

module.exports = app; // exported for testing
