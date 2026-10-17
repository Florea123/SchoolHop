// Validări comune pentru datele introduse de utilizatori (aceleași reguli ca în frontend)

const { badRequest } = require('./http');

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
const NAME_RE = /^[\p{L}][\p{L} .'-]*[\p{L}.]$/u;
// Telefon românesc: 0xxxxxxxxx sau +40xxxxxxxxx (9 cifre după prefix)
const PHONE_RE = /^(?:\+40|0040|0)(\d{9})$/;
const PLATE_RE = /^(B \d{2,3}|[A-Z]{2} \d{2}) [A-Z]{3}$/;

function email(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v || v.length > 150 || !EMAIL_RE.test(v)) throw badRequest('Adresa de email nu este validă (ex: nume@exemplu.ro)');
  return v;
}

function personName(value, label = 'Numele') {
  const v = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (v.length < 3 || v.length > 100 || !NAME_RE.test(v)) throw badRequest(`${label} poate conține doar litere, spații și cratimă (3-100 caractere)`);
  return v;
}

function fullName(value) {
  const v = personName(value, 'Numele complet');
  if (v.split(' ').length < 2) throw badRequest('Introdu numele complet (prenume și nume)');
  return v;
}

// Întoarce telefonul normalizat în format +40xxxxxxxxx
function phone(value, label = 'Numărul de telefon') {
  const compact = String(value ?? '').replace(/[\s().-]/g, '');
  const m = PHONE_RE.exec(compact);
  if (!m) throw badRequest(`${label} nu este valid (ex: 0744 123 456 sau +40744123456)`);
  return `+40${m[1]}`;
}

function password(value) {
  const v = String(value ?? '');
  if (v.length < 8 || v.length > 72) throw badRequest('Parola trebuie să aibă între 8 și 72 de caractere');
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) throw badRequest('Parola trebuie să conțină cel puțin o literă și o cifră');
  return v;
}

function plate(value) {
  const v = String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
    .replace(/^([A-Z]{1,2})\s?(\d{2,3})\s?([A-Z]{3})$/, '$1 $2 $3');
  if (!PLATE_RE.test(v)) throw badRequest('Numărul de înmatriculare nu este valid (ex: IS 12 ABC sau B 123 ABC)');
  return v;
}

function text(value, label, { min = 1, max = 255, required = true } = {}) {
  const v = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!v) {
    if (required) throw badRequest(`${label} este obligatoriu`);
    return null;
  }
  if (v.length < min || v.length > max) throw badRequest(`${label} trebuie să aibă între ${min} și ${max} caractere`);
  return v;
}

module.exports = { email, personName, fullName, phone, password, plate, text };
