// Validări în browser (aceleași reguli ca în backend/utils/validate.js).
// Fiecare funcție întoarce mesajul de eroare sau null dacă valoarea e corectă.

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
const NAME_RE = /^[\p{L}][\p{L} .'-]*[\p{L}.]$/u;
const PHONE_RE = /^(?:\+40|0040|0)\d{9}$/;
const ACCOUNT_RE = /^[A-Z]{2,10}(?:-[A-Z]{2,15}){1,3}-\d{3,5}$/;
const PLATE_RE = /^(B ?\d{2,3}|[A-Z]{2} ?\d{2}) ?[A-Z]{3}$/;

export const check = {
  email(v) {
    const s = String(v || '').trim();
    return s && s.length <= 150 && EMAIL_RE.test(s) ? null : 'Adresa de email nu este validă (ex: nume@exemplu.ro).';
  },
  name(v, label = 'Numele') {
    const s = String(v || '').trim().replace(/\s+/g, ' ');
    return s.length >= 3 && s.length <= 100 && NAME_RE.test(s) ? null : `${label} poate conține doar litere, spații și cratimă (3-100 caractere).`;
  },
  fullName(v) {
    const err = check.name(v, 'Numele complet');
    if (err) return err;
    return String(v).trim().split(/\s+/).length >= 2 ? null : 'Introdu numele complet (prenume și nume).';
  },
  phone(v, label = 'Numărul de telefon') {
    const s = String(v || '').replace(/[\s().-]/g, '');
    return PHONE_RE.test(s) ? null : `${label} nu este valid (ex: 0744 123 456 sau +40744123456).`;
  },
  password(v) {
    const s = String(v || '');
    if (s.length < 8 || s.length > 72) return 'Parola trebuie să aibă între 8 și 72 de caractere.';
    return /[A-Za-z]/.test(s) && /\d/.test(s) ? null : 'Parola trebuie să conțină cel puțin o literă și o cifră.';
  },
  accountId(v) {
    return ACCOUNT_RE.test(String(v || '').trim().toUpperCase()) ? null : 'ID-ul contului școlar nu are formatul corect (ex: EDU-IS-NEGRUZZI-123).';
  },
  plate(v) {
    return PLATE_RE.test(String(v || '').trim().toUpperCase().replace(/\s+/g, ' ')) ? null : 'Număr de înmatriculare invalid (ex: IS 12 ABC).';
  },
  text(v, label, { min = 1, max = 255, required = true } = {}) {
    const s = String(v || '').trim();
    if (!s) return required ? `${label} este obligatoriu.` : null;
    return s.length >= min && s.length <= max ? null : `${label} trebuie să aibă între ${min} și ${max} caractere.`;
  },
};

/**
 * Rulează validările în ordine; la prima eroare marchează câmpul, îl focusează și întoarce mesajul.
 * @param {[HTMLElement, string|null][]} rules
 */
export function firstError(rules) {
  for (const [field, error] of rules) {
    if (error) {
      if (field) {
        field.classList.add('invalid');
        field.setAttribute('aria-invalid', 'true');
        field.focus();
        field.addEventListener('input', () => { field.classList.remove('invalid'); field.removeAttribute('aria-invalid'); }, { once: true });
      }
      return error;
    }
  }
  return null;
}
