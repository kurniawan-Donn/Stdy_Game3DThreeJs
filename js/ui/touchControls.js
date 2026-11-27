// Kontrol sentuh (HP & tablet). Aktif jika isTouchDevice() (atau ?touch).
// - Separuh kiri bawah: joystick mengambang (muncul di titik sentuh), analog
//   → input.touch.move {x, y}; dorong sedikit = mengendap (cat.js).
// - Sisa layar: geser satu jari = putar kamera (input.mouseDX/DY), cubit dua
//   jari = zoom (input.wheel).
// - Tombol: Lompat, Lari (tahan), Endap (nyala/mati), E (ikon & label
//   mengikuti prompt interaksi; tahan untuk interaksi "tahan"), Meong, Pause.
// Semua menulis ke input.touch.down / pressed per aksi (core/input.js), jadi
// gameplay tidak membedakan keyboard dan sentuh.
import { TOUCH } from '../config.js';

// Ikon tombol E menurut kata pertama label interaksi
const E_ICONS = [
  [/^(dorong|jatuhkan|gulingkan|senggol)/i, '🫳'],
  [/^(cakar)/i, '🐾'],
  [/^(gigit|curi|makan)/i, '😼'],
  [/^(masuk|keluar|sembunyi)/i, '📦'],
  [/^(tidur)/i, '💤'],
  [/^(tendang)/i, '🧶'],
  [/^(tarik|acak|tumpahkan|injak)/i, '😼'],
  [/^(lepas)/i, '✋']
];
function eIcon(label) {
  for (const [re, icon] of E_ICONS) if (re.test(label)) return icon;
  return 'E';
}

function button(cls, html, title) {
  const b = document.createElement('div');
  b.className = 'touch-btn ' + cls;
  b.innerHTML = html;
  if (title) b.setAttribute('aria-label', title);
  return b;
}

// hooks: { pause(), onFirstTouch() }
export function createTouchControls(input, hooks = {}) {
  const touch = { down: {}, pressed: {}, move: null, sneakToggle: false };
  input.touch = touch;
  document.body.classList.add('touch');

  const root = document.createElement('div');
  root.id = 'touch-ui';
  const stickBase = document.createElement('div');
  stickBase.className = 'touch-stick';
  const knob = document.createElement('div');
  knob.className = 'touch-knob';
  stickBase.appendChild(knob);
  root.appendChild(stickBase);

  const btns = {
    jump: button('jump', '⤒<small>Lompat</small>', 'Lompat'),
    run: button('run', '»<small>Lari</small>', 'Lari'),
    sneak: button('sneak', '◡<small>Endap</small>', 'Endap'),
    interact: button('interact', '<span class="e-icon">E</span><small class="e-label"></small>', 'Interaksi'),
    meow: button('meow', '♪<small>Meong</small>', 'Meong'),
    pause: button('pause', 'Ⅱ', 'Pause')
  };
  for (const b of Object.values(btns)) root.appendChild(b);
  document.body.appendChild(root);
  const eIconEl = btns.interact.querySelector('.e-icon');
  const eLabelEl = btns.interact.querySelector('.e-label');

  // Satu entri per jari: { role: 'stick' | 'look' | 'btn', ... }
  const fingers = new Map();
  let pinch = null;

  function press(action) {
    touch.down[action] = true;
    touch.pressed[action] = true;
  }
  function release(action) {
    touch.down[action] = false;
  }
  function setSneak(on) {
    touch.sneakToggle = on;
    touch.down.sneak = on;
    btns.sneak.classList.toggle('on', on);
  }

  function btnAction(el) {
    for (const [action, b] of Object.entries(btns)) if (b === el || b.contains(el)) return action;
    return null;
  }

  function onStart(e) {
    if (!document.body.classList.contains('mode-play')) return;
    if (hooks.onFirstTouch) hooks.onFirstTouch();
    for (const t of e.changedTouches) {
      const action = btnAction(t.target);
      if (action) {
        e.preventDefault();
        btns[action].classList.add('down');
        fingers.set(t.identifier, { role: 'btn', action });
        if (action === 'sneak') setSneak(!touch.sneakToggle);
        else if (action === 'pause') {
          if (hooks.pause) hooks.pause();
        } else press(action);
        continue;
      }
      if (t.target.closest && t.target.closest('button, .btn, #pause, #results, #tutorial-box, #tutorial-done, #help-overlay.active, #rotate-hint, #visit-banner')) continue;
      e.preventDefault();
      const w = window.innerWidth;
      const stickTaken = [...fingers.values()].some((f) => f.role === 'stick');
      if (t.clientX < w * TOUCH.STICK_ZONE && !stickTaken) {
        fingers.set(t.identifier, { role: 'stick', x0: t.clientX, y0: t.clientY });
        stickBase.style.left = t.clientX + 'px';
        stickBase.style.top = t.clientY + 'px';
        knob.style.transform = 'translate(-50%, -50%)';
        stickBase.classList.add('active');
        touch.move = { x: 0, y: 0 };
      } else {
        fingers.set(t.identifier, { role: 'look', x: t.clientX, y: t.clientY });
        const looks = [...fingers.entries()].filter(([, f]) => f.role === 'look');
        if (looks.length === 2) {
          const [a, b] = looks.map(([, f]) => f);
          pinch = Math.hypot(a.x - b.x, a.y - b.y);
        }
      }
    }
  }

  function onMove(e) {
    for (const t of e.changedTouches) {
      const f = fingers.get(t.identifier);
      if (!f) continue;
      e.preventDefault();
      if (f.role === 'stick') {
        const R = TOUCH.STICK_RADIUS;
        let dx = t.clientX - f.x0;
        let dy = t.clientY - f.y0;
        const d = Math.hypot(dx, dy);
        if (d > R) {
          dx *= R / d;
          dy *= R / d;
        }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        touch.move = { x: dx / R, y: dy / R };
      } else if (f.role === 'look') {
        const looks = [...fingers.values()].filter((g) => g.role === 'look');
        if (looks.length >= 2 && pinch !== null) {
          f.x = t.clientX;
          f.y = t.clientY;
          const [a, b] = looks;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          input.wheel += (pinch - dist) * TOUCH.PINCH_SENS;
          pinch = dist;
        } else {
          input.mouseDX += (t.clientX - f.x) * TOUCH.LOOK_SENS;
          input.mouseDY += (t.clientY - f.y) * TOUCH.LOOK_SENS;
          f.x = t.clientX;
          f.y = t.clientY;
        }
      }
    }
  }

  function onEnd(e) {
    for (const t of e.changedTouches) {
      const f = fingers.get(t.identifier);
      if (!f) continue;
      fingers.delete(t.identifier);
      if (f.role === 'stick') {
        touch.move = null;
        stickBase.classList.remove('active');
      } else if (f.role === 'btn') {
        btns[f.action].classList.remove('down');
        if (f.action !== 'sneak' && f.action !== 'pause') release(f.action);
      } else if (f.role === 'look') {
        if ([...fingers.values()].filter((g) => g.role === 'look').length < 2) pinch = null;
      }
    }
  }

  window.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);
  window.addEventListener('touchcancel', onEnd);

  let lastLabel = null;
  return {
    touch,
    // Dipanggil tiap frame: label & ikon tombol E dari interaksi terdekat
    update(ctx) {
      const cur = ctx.interaction && ctx.interaction.current;
      const label = cur && !ctx.state.isGameOver ? cur.label : '';
      if (label !== lastLabel) {
        lastLabel = label;
        eIconEl.textContent = label ? eIcon(label) : 'E';
        eLabelEl.textContent = label || '';
        btns.interact.classList.toggle('idle', !label);
        btns.interact.classList.toggle('hold', !!(cur && cur.hold));
      }
    },
    // Lepas semua (pause / ganti level)
    reset() {
      fingers.clear();
      pinch = null;
      touch.down = {};
      touch.pressed = {};
      touch.move = null;
      setSneak(false);
      stickBase.classList.remove('active');
      for (const b of Object.values(btns)) b.classList.remove('down');
    }
  };
}
