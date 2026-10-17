import { api } from '../core/api.js';
import { mountShell } from '../core/layout.js';
import { $, $$, html, raw, params, renderError, showError, toast, withLoading, firstName } from '../core/ui.js';

const bookingId = params().get('bookingId');
const content = $('#content');
const LABELS = ['', 'Nesatisfăcător', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent'];
let rating = 0;

async function load() {
  try {
    await mountShell({ active: 'rides' });
    const { booking, ride, review } = await api.get(`/bookings/${encodeURIComponent(bookingId)}`);
    const name = firstName(booking.childName);
    const canReview = booking.isMine && booking.status === 'arrived_at_school' && ride.driver.id !== undefined;
    rating = review ? review.rating : 0;

    content.innerHTML = html`
      <h1 class="page-title">${name} a ajuns ${ride.direction === 'to_school' ? 'la ore' : 'acasă'}!</h1>
      <div class="reward-grid">
        <div class="card card-teal"><span class="val">+10 puncte</span><span class="small muted">pentru cursa în comun</span></div>
        <div class="card card-peach"><span class="val">−1 mașină</span><span class="small muted">la poarta școlii</span></div>
      </div>
      ${canReview ? raw(html`
      <form class="card" id="reviewForm">
        <div class="card-title text-center">Cum a fost cursa cu ${ride.driver.fullName}?</div>
        <div class="stars" role="radiogroup" aria-label="Nota">
          ${[1, 2, 3, 4, 5].map((n) => raw(html`<button type="button" class="star" role="radio" data-n="${n}" aria-label="${n} stele" aria-checked="${n <= rating}">★</button>`))}
        </div>
        <div class="rating-label" id="ratingLabel">${LABELS[rating] || 'Alege o notă'}</div>
        <div class="sub-rating"><label for="safety">Siguranță</label><select class="form-input" id="safety">${raw('<option value="">—</option>')}${[5, 4, 3, 2, 1].map((n) => raw(`<option value="${n}">${n} ★</option>`))}</select></div>
        <div class="sub-rating"><label for="punctuality">Punctualitate</label><select class="form-input" id="punctuality">${raw('<option value="">—</option>')}${[5, 4, 3, 2, 1].map((n) => raw(`<option value="${n}">${n} ★</option>`))}</select></div>
        <div class="form-group"><label class="form-label" for="comment">Comentariu (opțional)</label>
          <textarea class="form-input" id="comment" maxlength="1000" placeholder="Ce le-a plăcut copiilor pe drum?">${review && review.comment ? review.comment : ''}</textarea></div>
        <button class="btn btn-primary btn-block" type="submit" id="submit">${review ? 'Actualizează aprecierea' : 'Trimite aprecierea'}</button>
      </form>`) : ''}
      <a class="btn btn-secondary btn-block" href="home.html">Revenire acasă</a>`;

    if (!canReview) return;
    $$('.star').forEach((s) => s.addEventListener('click', () => {
      rating = Number(s.dataset.n);
      $$('.star').forEach((x) => x.setAttribute('aria-checked', String(Number(x.dataset.n) <= rating)));
      $('#ratingLabel').textContent = LABELS[rating];
    }));
    $('#reviewForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!rating) { showError(new Error('Alege o notă de la 1 la 5 stele')); return; }
      await withLoading($('#submit'), async () => {
        try {
          await api.post('/reviews', {
            bookingId: booking.id, rating,
            safetyRating: $('#safety').value ? Number($('#safety').value) : null,
            punctualityRating: $('#punctuality').value ? Number($('#punctuality').value) : null,
            comment: $('#comment').value,
          });
          toast('Evaluarea a fost salvată. Mulțumim!');
          setTimeout(() => { window.location.href = 'rewards.html'; }, 800);
        } catch (err) { showError(err); }
      });
    });
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
