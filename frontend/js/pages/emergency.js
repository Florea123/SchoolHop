import { api, auth } from '../core/api.js';
import { $, toast, withLoading } from '../core/ui.js';
import { check, firstError } from '../core/validate.js';

if (!auth.isLoggedIn) window.location.replace('login.html');

api.get('/me').then((me) => {
  $('#ecName').value = me.user.emergencyContactName || '';
  $('#ecPhone').value = me.user.emergencyContactPhone || '';
}).catch(() => {});

$('#emergencyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = $('#formError');
  errorEl.hidden = true;
  const name = $('#ecName').value.trim();
  const phone = $('#ecPhone').value.trim();
  const error = firstError([
    [$('#ecName'), check.name(name, 'Numele contactului')],
    [$('#ecPhone'), check.phone(phone)],
  ]);
  if (error) {
    errorEl.textContent = error;
    errorEl.hidden = false;
    return;
  }
  await withLoading($('#submit'), async () => {
    try {
      await api.patch('/me', { emergencyContactName: name, emergencyContactPhone: phone });
      toast('Profilul de familie a fost activat!');
      setTimeout(() => window.location.replace('home.html'), 600);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
});
