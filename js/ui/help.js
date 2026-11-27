// Layar bantuan berisi daftar kontrol. Tombol H membuka/menutup kapan saja;
// muncul otomatis sekali saat game pertama dibuka selama HELP.AUTO_SHOW_SECONDS.
import { HELP } from '../config.js';
import { actionPressed } from '../core/input.js';

export function createHelp() {
  const overlay = document.getElementById('help-overlay');
  const timerFill = document.getElementById('help-timer-fill');
  const help = { open: false, autoT: 0 };

  function setOpen(open) {
    help.open = open;
    overlay.classList.toggle('active', open);
  }

  // Ketuk/klik di mana saja menutup bantuan (penting di HP: tidak ada tombol H)
  if (overlay.addEventListener) {
    overlay.addEventListener('click', () => {
      help.autoT = 0;
      setOpen(false);
    });
  }
  help.hide = () => {
    help.autoT = 0;
    setOpen(false);
  };

  help.showAuto = () => {
    help.autoT = HELP.AUTO_SHOW_SECONDS;
    setOpen(true);
  };

  // dt = waktu nyata
  help.update = (input, dt) => {
    if (actionPressed(input, 'help')) {
      help.autoT = 0;
      setOpen(!help.open);
    }
    if (help.autoT > 0) {
      help.autoT = Math.max(0, help.autoT - dt);
      timerFill.style.width = `${(help.autoT / HELP.AUTO_SHOW_SECONDS) * 100}%`;
      if (help.autoT === 0) setOpen(false);
    } else {
      timerFill.style.width = '0%';
    }
  };

  return help;
}
