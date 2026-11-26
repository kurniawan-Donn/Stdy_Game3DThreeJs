// Layar hasil akhir level: menang/kalah, bintang, Chaos, tabungan, Main Lagi.
import { releasePointerLock } from '../core/input.js';
export function createResultsScreen(onRestart) {
  const rootEl = document.getElementById('results');
  const reasonEl = document.getElementById('results-reason');
  const titleEl = document.getElementById('results-title');
  const starsEl = document.getElementById('results-stars');
  const messageEl = document.getElementById('results-message');
  const chaosEl = document.getElementById('results-chaos');
  const targetEl = document.getElementById('results-target');
  const bankedEl = document.getElementById('results-banked');
  const bankEl = document.getElementById('results-bank');
  const restartBtn = document.getElementById('restart-btn');

  restartBtn.addEventListener('click', () => {
    if (onRestart) onRestart();
  });

  return {
    show({ reason, won, stars, maxStars, message, chaos, target, banked, bank }) {
      reasonEl.textContent = reason;
      titleEl.textContent = won ? 'Menang!' : 'Gagal';
      titleEl.classList.toggle('won', won);
      starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(Math.max(maxStars - stars, 0));
      starsEl.classList.toggle('none', stars === 0);
      messageEl.textContent = message;
      chaosEl.textContent = String(chaos);
      targetEl.textContent = String(target);
      bankedEl.textContent = `+${banked}`;
      bankEl.textContent = String(bank);
      rootEl.classList.add('active');
      releasePointerLock(); // agar tombol Main Lagi bisa diklik
    },
    hide() {
      rootEl.classList.remove('active');
    }
  };
}
