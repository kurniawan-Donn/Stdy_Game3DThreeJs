// Panel Pengaturan di lobi: kualitas grafis, volume, sensitivitas mouse,
// musik, balik sumbu Y, tampilkan FPS, dan Hapus Progres (dengan konfirmasi).
import { SETTINGS } from '../config.js';
import { writeSave } from '../core/save.js';

// hooks: { getSave(), apply(), resetProgress() }
export function createSettingsMenu(hooks) {
  const qualityEl = document.getElementById('set-quality');
  const volEl = document.getElementById('set-volume');
  const volVal = document.getElementById('set-volume-val');
  const sensEl = document.getElementById('set-sens');
  const sensVal = document.getElementById('set-sens-val');
  const invertEl = document.getElementById('set-invert');
  const musicEl = document.getElementById('set-music');
  const fpsEl = document.getElementById('set-fps');
  const resetBtn = document.getElementById('reset-progress');
  const confirmEl = document.getElementById('reset-confirm');

  // Bangun tombol kualitas dari config
  for (const [id, q] of Object.entries(SETTINGS.QUALITY)) {
    const b = document.createElement('button');
    b.className = 'seg-btn';
    b.dataset.q = id;
    b.textContent = q.label;
    qualityEl.appendChild(b);
  }
  volEl.min = '0';
  volEl.max = '1';
  volEl.step = String(SETTINGS.VOLUME_STEP);
  sensEl.min = String(SETTINGS.SENSITIVITY_MIN);
  sensEl.max = String(SETTINGS.SENSITIVITY_MAX);
  sensEl.step = String(SETTINGS.SENSITIVITY_STEP);

  const st = () => hooks.getSave().settings;
  function commit() {
    writeSave(hooks.getSave());
    hooks.apply();
    render();
  }
  function render() {
    const s = st();
    for (const b of qualityEl.querySelectorAll('.seg-btn')) b.classList.toggle('active', b.dataset.q === s.quality);
    volEl.value = String(s.volume);
    volVal.textContent = `${Math.round(s.volume * 100)}%`;
    sensEl.value = String(s.sensitivity);
    sensVal.textContent = `×${s.sensitivity.toFixed(1)}`;
    invertEl.checked = s.invertY;
    if (musicEl) musicEl.checked = s.music;
    fpsEl.checked = s.showFps;
  }

  qualityEl.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    st().quality = b.dataset.q;
    commit();
  });
  volEl.addEventListener('input', () => {
    st().volume = Number(volEl.value);
    commit();
  });
  sensEl.addEventListener('input', () => {
    st().sensitivity = Number(sensEl.value);
    commit();
  });
  if (musicEl) musicEl.addEventListener('change', () => {
    st().music = musicEl.checked;
    commit();
  });
  invertEl.addEventListener('change', () => {
    st().invertY = invertEl.checked;
    commit();
  });
  fpsEl.addEventListener('change', () => {
    st().showFps = fpsEl.checked;
    commit();
  });
  resetBtn.addEventListener('click', () => confirmEl.classList.add('active'));
  confirmEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-confirm]');
    if (!b) return;
    confirmEl.classList.remove('active');
    if (b.dataset.confirm === 'yes') {
      hooks.resetProgress();
      render();
    }
  });

  return {
    open() {
      confirmEl.classList.remove('active');
      render();
    }
  };
}
