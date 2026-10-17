/**
 * Global error handler middleware
 * Catches errors passed via next(err) and returns a JSON error response.
 */

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message || err);

  // Distinguish between operational and unexpected errors
  const status = err.status || err.statusCode || 500;
  const message =
    status < 500
      ? err.message
      : process.env.NODE_ENV === 'production'
      ? 'Eroare internă de server'
      : err.message || 'Eroare internă de server';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
