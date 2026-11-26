// Layar hasil akhir level: menang/kalah, bintang, Chaos didapat, Chaos masuk
// tabungan, dan tombol Ulangi / Level Berikutnya / Lobi.
import { releasePointerLock } from '../core/input.js';

export function createResultsScreen(handlers = {}) {
  const rootEl = document.getElementById('results');
  const reasonEl = document.getElementById('results-reason');
  const levelEl = document.getElementById('results-level');
  const titleEl = document.getElementById('results-title');
  const starsEl = document.getElementById('results-stars');
  const messageEl = document.getElementById('results-message');
  const chaosEl = document.getElementById('results-chaos');
  const targetEl = document.getElementById('results-target');
  const bankedEl = document.getElementById('results-banked');
  const bankEl = document.getElementById('results-bank');
  const nextBtn = document.getElementById('results-next');

  rootEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn && !btn.disabled && handlers[btn.dataset.action]) handlers[btn.dataset.action]();
  });

  return {
    visible: false,
    show({ reason, won, stars, maxStars, message, chaos, target, banked, bank, levelName, hasNext }) {
      this.visible = true;
      reasonEl.textContent = reason;
      levelEl.textContent = levelName || '';
      titleEl.textContent = won ? 'Menang!' : 'Gagal';
      titleEl.classList.toggle('won', won);
      starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(Math.max(maxStars - stars, 0));
      starsEl.classList.toggle('none', stars === 0);
      messageEl.textContent = message;
      chaosEl.textContent = String(chaos);
      targetEl.textContent = String(target);
      bankedEl.textContent = `+${banked}`;
      bankEl.textContent = String(bank);
      nextBtn.disabled = !hasNext;
      nextBtn.title = hasNext ? '' : 'Dapatkan minimal 1 bintang untuk membuka level berikutnya';
      rootEl.classList.add('active');
      releasePointerLock(); // agar tombol bisa diklik
    },
    hide() {
      this.visible = false;
      rootEl.classList.remove('active');
    }
  };
}
