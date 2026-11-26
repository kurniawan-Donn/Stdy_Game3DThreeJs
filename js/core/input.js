// Input keyboard & mouse.
// - input.keys[code]    : true selama tombol ditahan
// - input.pressed[code] : true hanya pada frame tombol mulai ditekan
// - input.mouseDX/DY    : gerak mouse frame ini (pointer lock, atau drag kiri
//                         sebagai cadangan tanpa pointer lock)
// - input.wheel         : total deltaY roda mouse frame ini
// Semua nilai per-frame dikosongkan oleh endFrame di akhir setiap frame.
const PREVENT_DEFAULT_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F3'];

export function createInput(onKeyDown, canvas) {
  const input = {
    keys: {},
    pressed: {},
    mouseDX: 0,
    mouseDY: 0,
    wheel: 0,
    pointerLocked: false,
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

export function endFrame(input) {
  input.pressed = {};
  input.mouseDX = 0;
  input.mouseDY = 0;
  input.wheel = 0;
}
