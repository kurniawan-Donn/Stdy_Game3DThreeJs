// Panel Pengaturan di lobi, dibagi tab (Umum / Suara / Kontrol / …).
// Kontrol generik: <input type="range|checkbox" data-set="kunci"> membaca &
// menulis ctx.save.settings[kunci]; <b data-val="kunci"> menampilkan nilainya.
// Batas & format slider ada di RANGES (dari SETTINGS di config.js).
// Kualitas grafis = tombol segmen; Hapus Progres dengan konfirmasi di halaman.
import { SETTINGS } from '../config.js';
import { writeSave } from '../core/save.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const RANGES = {
  volume: { min: 0, max: 1, step: SETTINGS.VOLUME_STEP, fmt: pct },
  sfxVolume: { min: 0, max: 1, step: SETTINGS.VOLUME_STEP, fmt: pct },
  ambVolume: { min: 0, max: 1, step: SETTINGS.VOLUME_STEP, fmt: pct },
  musicVolume: { min: 0, max: 1, step: SETTINGS.VOLUME_STEP, fmt: (v) => (v > 0 ? pct(v) : 'mati') },
  sensitivity: { min: SETTINGS.SENSITIVITY_MIN, max: SETTINGS.SENSITIVITY_MAX, step: SETTINGS.SENSITIVITY_STEP, fmt: (v) => `×${v.toFixed(1)}` }
};

// hooks: { getSave(), apply(), resetProgress(), sound?(nama), autoTier?() }
export function createSettingsMenu(hooks) {
  const panel = document.getElementById('settings-panel');
  const qualityEl = document.getElementById('set-quality');
  const tabsEl = document.getElementById('set-tabs');
  const resetBtn = document.getElementById('reset-progress');
  const confirmEl = document.getElementById('reset-confirm');
  const inputs = [...panel.querySelectorAll('[data-set]')];
  const vals = [...panel.querySelectorAll('[data-val]')];
  const extras = []; // { render() } dari bagian tambahan (mis. rebind)
  const hudSizeEl = document.getElementById('set-hudsize');
  for (const [id, label] of Object.entries(SETTINGS.HUD_SIZES)) {
    const b = document.createElement('button');
    b.className = 'seg-btn';
    b.dataset.size = id;
    b.textContent = label;
    hudSizeEl.appendChild(b);
  }
  hudSizeEl.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    st().hudSize = b.dataset.size;
    commit();
  });

  for (const [id, label] of [['auto', SETTINGS.AUTO.LABEL], ...Object.entries(SETTINGS.QUALITY).map(([k, q]) => [k, q.label])]) {
    const b = document.createElement('button');
    b.className = 'seg-btn';
    b.dataset.q = id;
    b.textContent = label;
    qualityEl.appendChild(b);
  }
  for (const el of inputs) {
    const r = RANGES[el.dataset.set];
    if (el.type === 'range' && r) {
      el.min = String(r.min);
      el.max = String(r.max);
      el.step = String(r.step);
    }
  }

  const st = () => hooks.getSave().settings;
  function commit() {
    writeSave(hooks.getSave());
    hooks.apply();
    render();
  }
  function render() {
    const s = st();
    for (const b of qualityEl.querySelectorAll('.seg-btn')) {
      b.classList.toggle('active', b.dataset.q === s.quality);
      if (b.dataset.q === 'auto') b.textContent = s.quality === 'auto' && hooks.autoTier ? `${SETTINGS.AUTO.LABEL} · ${hooks.autoTier()}` : SETTINGS.AUTO.LABEL;
    }
    for (const el of inputs) {
      const v = s[el.dataset.set];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = String(v);
    }
    for (const el of vals) {
      const k = el.dataset.val;
      el.textContent = RANGES[k] ? RANGES[k].fmt(s[k]) : String(s[k]);
    }
    for (const b of hudSizeEl.querySelectorAll('.seg-btn')) b.classList.toggle('active', b.dataset.size === s.hudSize);
    for (const x of extras) x.render();
  }
  function showTab(tab) {
    for (const b of tabsEl.querySelectorAll('.seg-btn')) b.classList.toggle('active', b.dataset.tab === tab);
    for (const sec of panel.querySelectorAll('.set-section')) sec.classList.toggle('active', sec.dataset.sec === tab);
  }

  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (b) showTab(b.dataset.tab);
  });
  qualityEl.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    st().quality = b.dataset.q;
    commit();
  });
  for (const el of inputs) {
    const key = el.dataset.set;
    if (el.type === 'checkbox') {
      el.addEventListener('change', () => {
        st()[key] = el.checked;
        commit();
      });
    } else {
      el.addEventListener('input', () => {
        st()[key] = Number(el.value);
        commit();
      });
      // Contoh bunyi saat slider efek dilepas
      el.addEventListener('change', () => {
        if (hooks.sound && key !== 'musicVolume' && key !== 'sensitivity') hooks.sound(key === 'ambVolume' ? 'birdChirp' : 'uiClick');
      });
    }
  }
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

  const api = {
    open() {
      confirmEl.classList.remove('active');
      for (const x of extras) if (x.cancel) x.cancel();
      render();
    },
    render,
    showTab,
    addSection(x) {
      extras.push(x);
    },
    commit
  };
  return api;
}
