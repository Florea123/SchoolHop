import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { $, html, raw, params, renderError, showError, toast, withLoading, formatTime, formatDate, firstName } from '../core/ui.js';

const bookingId = params().get('bookingId');
const content = $('#content');

async function load() {
  try {
    await mountShell({ active: 'rides' });
    const { booking, ride } = await api.get(`/bookings/${encodeURIComponent(bookingId)}`);
    bindBack($('#back'), `ride.html?rideId=${ride.id}`);
    const name = firstName(booking.childName);
    const toSchool = ride.direction === 'to_school';
    const place = toSchool ? ride.school.dropoffPoint : ride.destination;

    if (booking.status !== 'arrived_at_school') {
      content.innerHTML = html`<h1 class="page-title">${name} nu a ajuns încă</h1>
        <p class="page-subtitle">${formatDate(ride.departureTime)} · cu ${ride.driver.fullName}</p>
        <div class="callout callout-info">Vei primi o notificare imediat ce ${ride.driver.fullName} confirmă predarea la ${place}.</div>
        <a class="btn btn-primary btn-block" href="ride.html?rideId=${ride.id}">Urmărește cursa live</a>`;
      return;
    }

    content.innerHTML = html`
      <h1 class="page-title">Predare ${toSchool ? 'la poarta școlii' : 'la destinație'}</h1>
      <p class="page-subtitle">${formatDate(ride.departureTime)} · ora ${formatTime(booking.dropoffTime)} · ${place}</p>
      <div class="card card-blue">
        <div class="card-title">${ride.driver.fullName} a oprit în zona de predare</div>
      </div>
      <div class="card handover">
        <div class="card-title">${booking.parentConfirmedAt ? 'Predare confirmată de tine' : `${name} a fost predat(ă) la ${formatTime(booking.dropoffTime)}`}</div>
      </div>
      ${booking.parentConfirmedAt
    ? raw(html`<a class="btn btn-primary btn-block" href="review.html?bookingId=${booking.id}">${booking.isMine ? 'Evaluează cursa' : 'Înapoi'}</a>`)
    : raw('<button class="btn btn-primary btn-block" id="confirm">Confirmă predarea</button>')}`;

    const btn = $('#confirm');
    if (btn) btn.addEventListener('click', () => withLoading(btn, async () => {
      try {
        const r = await api.post(`/bookings/${booking.id}/confirm-arrival`);
        toast(`Mulțumim! +${r.pointsAwarded} puncte Erou Verde (total ${r.greenPoints}).`, { icon: '' });
        setTimeout(() => { window.location.href = `review.html?bookingId=${booking.id}`; }, 800);
      } catch (err) { showError(err); }
    }));
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
