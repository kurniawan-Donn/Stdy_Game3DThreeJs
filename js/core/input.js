// Status keyboard. Baca tombol lewat input.keys[e.code].
const PREVENT_DEFAULT_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

export function createInput(onKeyDown) {
  const input = { keys: {} };

  window.addEventListener('keydown', (e) => {
    if (onKeyDown) onKeyDown(e);
    if (PREVENT_DEFAULT_CODES.includes(e.code)) {
      e.preventDefault();
    }
    input.keys[e.code] = true;
  });

  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });

  window.addEventListener('blur', () => {
    input.keys = {};
  });

  return input;
}
