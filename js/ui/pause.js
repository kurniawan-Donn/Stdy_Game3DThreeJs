// Layar pause: Lanjutkan / Ulangi / Lobi.
import { levelLabel } from '../levels/index.js';
export function createPauseScreen(handlers) {
  const root = document.getElementById('pause');
  const levelEl = document.getElementById('pause-level');
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn && handlers[btn.dataset.action]) handlers[btn.dataset.action]();
  });
  return {
    visible: false,
    show(level) {
      this.visible = true;
      levelEl.textContent = level ? `${levelLabel(level)} · ${level.name}` : '';
      root.classList.add('active');
    },
    hide() {
      this.visible = false;
      root.classList.remove('active');
    }
  };
}
