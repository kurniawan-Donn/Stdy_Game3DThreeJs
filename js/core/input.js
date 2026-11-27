// Input keyboard & mouse.
// - input.keys[code]    : true selama tombol ditahan
// - input.pressed[code] : true hanya pada frame tombol mulai ditekan
// - input.mouseDX/DY    : gerak mouse frame ini (pointer lock, atau drag kiri
//                         sebagai cadangan tanpa pointer lock)
// - input.wheel         : total deltaY roda mouse frame ini
// - input.bindings      : aksi → [kode tombol] (CONTROLS.DEFAULT + rebind pemain)
// - input.touch         : kontrol sentuh (ui/touchControls.js): down/pressed per
//                         aksi + move {x, y} analog dari joystick
// Gameplay membaca aksi lewat actionDown / actionPressed, bukan kode tombol.
// Semua nilai per-frame dikosongkan oleh endFrame di akhir setiap frame.
import { CONTROLS } from '../config.js';
const PREVENT_DEFAULT_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F3'];

export function createInput(onKeyDown, canvas) {
  const input = {
    keys: {},
    pressed: {},
    mouseDX: 0,
    mouseDY: 0,
    wheel: 0,
    pointerLocked: false,
    bindings: CONTROLS.DEFAULT,
    touch: null,
    dragging: false,
    allowPointerLock: () => true,
    onLockChange: null, // (locked) => void, dipanggil saat status kunci mouse berubah
    requestLock: () => {}
  };

  window.addEventListener('keydown', (e) => {
    if (onKeyDown) onKeyDown(e);
    if (PREVENT_DEFAULT_CODES.includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed[e.code] = true;
    input.keys[e.code] = true;
  });

  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });

  window.addEventListener('blur', () => {
    input.keys = {};
    input.pressed = {};
    input.dragging = false;
  });

  if (canvas) {
    input.requestLock = () => {
      if (input.pointerLocked || !input.allowPointerLock() || !canvas.requestPointerLock) return;
      try {
        const req = canvas.requestPointerLock();
        if (req && req.catch) req.catch(() => {});
      } catch (err) {
        // browser menolak: drag tetap bisa dipakai
      }
    };
    // Klik canvas = pointer lock; tahan klik kiri sambil geser = putar kamera
    canvas.addEventListener('mousedown', (e) => {
      if (onKeyDown) onKeyDown(e);
      if (e.button !== 0) return;
      input.dragging = true;
      input.requestLock();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) input.dragging = false;
    });
    document.addEventListener('pointerlockchange', () => {
      const was = input.pointerLocked;
      input.pointerLocked = document.pointerLockElement === canvas;
      if (input.onLockChange && was !== input.pointerLocked) input.onLockChange(input.pointerLocked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!input.pointerLocked && !input.dragging) return;
      input.mouseDX += e.movementX || 0;
      input.mouseDY += e.movementY || 0;
    });
    window.addEventListener('wheel', (e) => {
      input.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  return input;
}

export function releasePointerLock() {
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
}

// Aksi ditahan (keyboard atau tombol sentuh)
export function actionDown(input, action) {
  const codes = (input.bindings || CONTROLS.DEFAULT)[action];
  if (codes) for (const c of codes) if (input.keys[c]) return true;
  return !!(input.touch && input.touch.down[action]);
}

// Aksi baru ditekan pada frame ini
export function actionPressed(input, action) {
  const codes = (input.bindings || CONTROLS.DEFAULT)[action];
  if (codes) for (const c of codes) if (input.pressed[c]) return true;
  return !!(input.touch && input.touch.pressed[action]);
}

// Nama tombol yang mudah dibaca dari KeyboardEvent.code
const KEY_NAMES = {
  Space: 'Spasi', ShiftLeft: 'Shift', ShiftRight: 'Shift kanan', ControlLeft: 'Ctrl', ControlRight: 'Ctrl kanan',
  AltLeft: 'Alt', AltRight: 'Alt kanan', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Enter: 'Enter', NumpadEnter: 'Enter (numpad)', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'",
  Comma: ',', Period: '.', Slash: '/', Backslash: '\\'
};
export function keyLabel(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return 'Num ' + code.slice(6);
  return code;
}

// Teks dengan penanda {aksi} → nama tombol pertama aksi itu ({move} = W A S D)
export function formatKeys(text, input) {
  const b = (input && input.bindings) || CONTROLS.DEFAULT;
  return text.replace(/\{(\w+)\}/g, (m, a) => {
    if (a === 'move') return ['forward', 'left', 'back', 'right'].map((x) => keyLabel((b[x] || [])[0])).join(' '); // W A S D
    return b[a] ? keyLabel(b[a][0]) : m;
  });
}

// Gabungkan rebind pemain (settings.keybinds) dengan bawaan
export function resolveBindings(keybinds) {
  const out = {};
  for (const [action, codes] of Object.entries(CONTROLS.DEFAULT)) {
    const custom = keybinds && Array.isArray(keybinds[action]) ? keybinds[action] : null;
    out[action] = custom ? custom.slice() : codes.slice();
  }
  return out;
}

export function endFrame(input) {
  if (input.touch) input.touch.pressed = {};
  input.pressed = {};
  input.mouseDX = 0;
  input.mouseDY = 0;
  input.wheel = 0;
}
