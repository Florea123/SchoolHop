import { api, auth, getMeta } from '../core/api.js';
import { $, html, showError, withLoading } from '../core/ui.js';
import { check, firstError } from '../core/validate.js';

const errorEl = $('#formError');
const schoolSelect = $('#school');
let schools = [];

function fail(message, field) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  if (field) { field.classList.add('invalid'); field.focus(); }
}

async function init() {
  try {
    ({ schools } = await getMeta());
    schoolSelect.innerHTML = html`<option value="">Alege școala</option>${schools.map((s) => html`<option value="${s.id}">${s.name}</option>`)}`;
  } catch (err) {
    showError(err);
  }
}

schoolSelect.addEventListener('change', () => {
  const school = schools.find((s) => String(s.id) === schoolSelect.value);
  $('#accountId').placeholder = school ? `${school.accountPrefix}-XXX` : '';
});

$('#registerForm').addEventListener('input', (e) => e.target.classList.remove('invalid'));

$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  const body = {
    fullName: $('#fullName').value.trim(),
    email: $('#email').value.trim(),
    phone: $('#phone').value.trim(),
    password: $('#password').value,
    schoolId: Number(schoolSelect.value),
    schoolAccountId: $('#accountId').value.trim(),
    consent: $('#consent').checked,
  };
  const error = firstError([
    [$('#fullName'), check.fullName(body.fullName)],
    [$('#email'), check.email(body.email)],
    [$('#phone'), check.phone(body.phone)],
    [$('#password'), check.password(body.password)],
    [$('#passwordConfirm'), body.password !== $('#passwordConfirm').value ? 'Parolele nu se potrivesc.' : null],
    [schoolSelect, body.schoolId ? null : 'Alege școala copilului.'],
    [$('#accountId'), check.accountId(body.schoolAccountId)],
    [$('#consent'), body.consent ? null : 'Bifează confirmarea de părinte / tutore legal.'],
  ]);
  if (error) return fail(error);

  await withLoading($('#submit'), async () => {
    try {
      const { token } = await api.post('/auth/register', body);
      auth.token = token;
      window.location.replace('verify.html');
    } catch (err) {
      fail(err.message);
    }
  });
});

init();
