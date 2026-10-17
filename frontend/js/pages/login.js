import { api, auth } from '../core/api.js';
import { $, params, toast, withLoading } from '../core/ui.js';
import { check, firstError } from '../core/validate.js';

// Acceptăm doar redirecționări interne (fără „//” sau protocol)
function safeNext() {
  const next = params().get('next');
  return next && /^[a-z0-9-]+\.html(\?.*)?$/i.test(next) ? next : null;
}

if (auth.isLoggedIn) window.location.replace(safeNext() || 'home.html');

const form = $('#loginForm');
const errorEl = $('#formError');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const error = firstError([
    [$('#email'), check.email(email)],
    [$('#password'), password ? null : 'Introdu parola.'],
  ]);
  if (error) {
    errorEl.textContent = error;
    errorEl.hidden = false;
    return;
  }
  await withLoading($('#submit'), async () => {
    try {
      const { token, user } = await api.post('/auth/login', { email, password });
      auth.token = token;
      window.location.replace(safeNext() || (user.role === 'admin' ? 'dashboard.html' : 'home.html'));
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
});

$('#forgot').addEventListener('click', () => {
  toast('Pentru resetarea parolei, contactează secretariatul școlii.', { icon: 'ℹ' });
});
