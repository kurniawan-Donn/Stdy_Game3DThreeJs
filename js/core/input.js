// Status keyboard.
// - input.keys[code]    : true selama tombol ditahan
// - input.pressed[code] : true hanya pada frame tombol mulai ditekan
//                         (dikosongkan oleh endFrame di akhir setiap frame)
const PREVENT_DEFAULT_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F3'];

export function createInput(onKeyDown) {
  const input = { keys: {}, pressed: {} };

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
  });

  return input;
}

export function endFrame(input) {
  input.pressed = {};
}
