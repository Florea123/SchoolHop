// Handler central pentru erori (răspuns JSON uniform)

const { HttpError } = require('../utils/http');

function notFoundApi(req, res) {
  res.status(404).json({ error: `Endpoint inexistent: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corpul cererii nu este JSON valid' });
  }
  // Încălcări de constrângeri PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'Înregistrarea există deja' });
  if (err.code === '23503') return res.status(400).json({ error: 'Referință invalidă către o altă resursă' });
  if (err.code === '23514') return res.status(400).json({ error: 'Valoare invalidă pentru unul dintre câmpuri' });

  console.error(`${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: 'Eroare internă a serverului' });
}

module.exports = { notFoundApi, errorHandler };
