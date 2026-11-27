// Pengaturan → Kontrol: atur ulang tombol keyboard. Tiap aksi punya dua slot
// (utama & cadangan). Klik slot lalu tekan tombol baru; Esc = batal. Tombol
// yang sudah dipakai aksi lain ditukar otomatis (aksi lain mendapat tombol
// lama slot ini). Hanya aksi yang berbeda dari bawaan yang disimpan di
// settings.keybinds. Esc & F3 tidak bisa dipakai (CONTROLS.FIXED).
import { CONTROLS } from '../config.js';
import { resolveBindings, keyLabel } from '../core/input.js';

const SLOTS = 2;

// Tukar/pasang tombol (murni, diekspor untuk uji): mengembalikan keybinds baru
export function assignKey(keybinds, action, slot, code) {
  const b = resolveBindings(keybinds);
  const old = b[action][slot];
  for (const [other, codes] of Object.entries(b)) {
    for (let i = 0; i < codes.length; i++) {
      if (codes[i] === code && !(other === action && i === slot)) {
        if (old) codes[i] = old; // tukar
        else codes.splice(i, 1);
      }
    }
  }
  const mine = b[action];
  while (mine.length < slot) mine.push(undefined);
  mine[slot] = code;
  b[action] = [...new Set(mine.filter(Boolean))];
  // Simpan hanya yang berbeda dari bawaan
  const out = {};
  for (const [a, codes] of Object.entries(b)) {
    if (codes.join() !== CONTROLS.DEFAULT[a].join()) out[a] = codes;
  }
  return out;
}

// hooks: { getSave(), commit() }
export function createRebindSection(hooks) {
  const list = document.getElementById('rebind-list');
  const resetBtn = document.getElementById('rebind-reset');
  let listening = null; // { action, slot, el }

  function stopListening() {
    listening = null;
    render();
  }

  function render() {
    const st = hooks.getSave().settings;
    const b = resolveBindings(st.keybinds);
    list.innerHTML = '';
    for (const { id, label } of CONTROLS.ACTIONS) {
      const row = document.createElement('div');
      row.className = 'rebind-row';
      const name = document.createElement('span');
      name.textContent = label;
      row.appendChild(name);
      for (let slot = 0; slot < SLOTS; slot++) {
        const k = document.createElement('button');
        k.className = 'rebind-key' + (slot ? ' alt' : '');
        k.dataset.rebind = id;
        k.dataset.slot = String(slot);
        const waiting = listening && listening.action === id && listening.slot === slot;
        k.textContent = waiting ? 'Tekan…' : b[id][slot] ? keyLabel(b[id][slot]) : '—';
        k.classList.toggle('waiting', !!waiting);
        row.appendChild(k);
      }
      list.appendChild(row);
    }
  }

  list.addEventListener('click', (e) => {
    const k = e.target.closest('.rebind-key');
    if (!k) return;
    listening = { action: k.dataset.rebind, slot: Number(k.dataset.slot) };
    render();
  });

  // Fase capture di window: dijalankan sebelum input game & tidak diteruskan
  window.addEventListener(
    'keydown',
    (e) => {
      if (!listening) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === 'Escape') return stopListening();
      if (CONTROLS.FIXED.includes(e.code)) return; // tunggu tombol lain
      const st = hooks.getSave().settings;
      st.keybinds = assignKey(st.keybinds, listening.action, listening.slot, e.code);
      listening = null;
      hooks.commit();
    },
    true
  );

  resetBtn.addEventListener('click', () => {
    hooks.getSave().settings.keybinds = {};
    listening = null;
    hooks.commit();
  });

  return {
    render,
    cancel: stopListening
  };
}
