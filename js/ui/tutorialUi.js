// UI Latihan: kotak petunjuk langkah (atas-tengah) dengan tombol Lewati,
// dan layar "Latihan selesai!" (Main Level 1 / Lobi).
export function createTutorialUi(handlers) {
  const box = document.getElementById('tutorial-box');
  const stepEl = document.getElementById('tutorial-step');
  const titleEl = document.getElementById('tutorial-title');
  const textEl = document.getElementById('tutorial-text');
  const doneEl = document.getElementById('tutorial-done');
  const onClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn && handlers[btn.dataset.action]) handlers[btn.dataset.action]();
  };
  box.addEventListener('click', onClick);
  doneEl.addEventListener('click', onClick);
  return {
    show({ index, total, title, text }) {
      stepEl.textContent = `Latihan ${index}/${total}`;
      titleEl.textContent = title;
      textEl.textContent = text;
      box.classList.add('active');
    },
    hide() {
      box.classList.remove('active');
      doneEl.classList.remove('active');
    },
    showDone() {
      box.classList.remove('active');
      doneEl.classList.add('active');
    }
  };
}
