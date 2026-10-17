// Erori HTTP și validare simplă a datelor de intrare

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const notFound = (msg = 'Resursa nu a fost găsită') => new HttpError(404, msg);
const forbidden = (msg = 'Nu ai acces la această resursă') => new HttpError(403, msg);
const conflict = (msg) => new HttpError(409, msg);

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) throw badRequest(`Câmpuri obligatorii lipsă: ${missing.join(', ')}`, { missing });
}

function toInt(value, name, { min, max } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`${name} trebuie să fie un număr întreg`);
  if (min !== undefined && n < min) throw badRequest(`${name} trebuie să fie cel puțin ${min}`);
  if (max !== undefined && n > max) throw badRequest(`${name} trebuie să fie cel mult ${max}`);
  return n;
}

function toNumber(value, name, { min, max } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw badRequest(`${name} trebuie să fie un număr`);
  if (min !== undefined && n < min) throw badRequest(`${name} trebuie să fie cel puțin ${min}`);
  if (max !== undefined && n > max) throw badRequest(`${name} trebuie să fie cel mult ${max}`);
  return n;
}

function toDateString(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) || Number.isNaN(Date.parse(value))) {
    throw badRequest(`${name} trebuie să fie o dată validă (AAAA-LL-ZZ)`);
  }
  return value;
}

function toTimeString(value, name) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''))) {
    throw badRequest(`${name} trebuie să fie o oră validă (HH:MM)`);
  }
  return value;
}

function trimOrNull(value, maxLen) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return maxLen ? s.slice(0, maxLen) : s;
}

module.exports = {
  HttpError, badRequest, notFound, forbidden, conflict,
  requireFields, toInt, toNumber, toDateString, toTimeString, trimOrNull,
};
