// Menu lobi (DOM): menu utama, Pilih Level (kartu per level), Cara Bermain.
// Kustomisasi & Pengaturan ditangani ui/customizeMenu.js & ui/settingsMenu.js
// (dibuka lewat handlers). Semua aksi diteruskan ke handlers dari main.js.
import { LEVELS, TUTORIAL_LEVEL, TUTORIAL_INDEX, levelLabel } from '../levels/index.js';
import { STAR_THRESHOLDS } from '../config.js';
import { levelRecord } from '../core/save.js';
import { isLevelUnlocked, highestUnlockedIndex } from '../systems/levelManager.js';

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, STAR_THRESHOLDS.length - n));
}

function fmtTime(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function createMenus(handlers) {
  const root = document.getElementById('lobby');
  const panels = {
    main: document.getElementById('lobby-main'),
    levels: document.getElementById('level-select'),
    howto: document.getElementById('howto-panel'),
    custom: document.getElementById('customize-panel'),
    settings: document.getElementById('settings-panel')
  };
  const bankEl = document.getElementById('lobby-bank');
  const playSubEl = document.getElementById('play-sub');
  const cardsEl = document.getElementById('level-cards');

  // Cara Bermain: salinan tabel kontrol dari layar bantuan (satu sumber)
  const helpTable = document.querySelector('#help-overlay table');
  const howtoBody = document.getElementById('howto-body');
  if (helpTable && howtoBody) {
    howtoBody.appendChild(helpTable.cloneNode(true));
    const goal = document.querySelector('#help-overlay .help-goal');
    if (goal) howtoBody.appendChild(goal.cloneNode(true));
  }

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    if (action === 'level') handlers.onLevel(Number(btn.dataset.index));
    else if (handlers[action]) handlers[action]();
  });

  function show(name) {
    root.classList.add('active');
    for (const [k, el] of Object.entries(panels)) if (el) el.classList.toggle('active', k === name);
  }

  const menus = {
    current: null,
    setBank(n) {
      bankEl.textContent = String(n);
    },
    showMain(save) {
      menus.current = 'main';
      menus.setBank(save.chaosBank);
      const i = highestUnlockedIndex(save);
      playSubEl.textContent = save.tutorialDone ? `${levelLabel(LEVELS[i])} · ${LEVELS[i].name}` : `Level 0 · ${TUTORIAL_LEVEL.name}`;
      show('main');
    },
    showLevels(save) {
      menus.current = 'levels';
      menus.setBank(save.chaosBank);
      cardsEl.textContent = '';
      // Kartu Latihan (selalu terbuka)
      const tut = document.createElement('button');
      tut.className = 'level-card';
      tut.dataset.action = 'level';
      tut.dataset.index = String(TUTORIAL_INDEX);
      tut.innerHTML = `
        <span class="lc-num">Level 0</span>
        <span class="lc-name"></span>
        <span class="lc-desc"></span>
        <span class="lc-meta">tanpa timer · nyawa tidak berkurang</span>
        ${save.tutorialDone ? '<span class="lc-done">✓ Selesai</span>' : ''}`;
      tut.querySelector('.lc-name').textContent = TUTORIAL_LEVEL.name;
      tut.querySelector('.lc-desc').textContent = TUTORIAL_LEVEL.description;
      cardsEl.appendChild(tut);
      LEVELS.forEach((level, i) => {
        const open = isLevelUnlocked(save, i);
        const rec = levelRecord(save, level);
        const card = document.createElement('button');
        card.className = 'level-card' + (open ? '' : ' locked') + (level.bonus ? ' bonus' : '');
        card.dataset.action = 'level';
        card.dataset.index = String(i);
        card.disabled = !open;
        card.innerHTML = `
          <span class="lc-num">${level.bonus ? '★ BONUS' : `Level ${level.id}`}</span>
          <span class="lc-name"></span>
          <span class="lc-desc"></span>
          <span class="lc-meta">${fmtTime(level.DURATION)} · target ${level.TARGET_CHAOS}</span>
          <span class="lc-stars ${rec.bestStars ? '' : 'none'}">${stars(rec.bestStars)}</span>
          ${open ? '' : `<span class="lc-lock">🔒 Dapatkan 1 bintang di ${level.bonus ? `Level ${level.id - 1}` : 'level sebelumnya'}</span>`}`;
        card.querySelector('.lc-name').textContent = level.name;
        card.querySelector('.lc-desc').textContent = level.description;
        cardsEl.appendChild(card);
      });
      show('levels');
    },
    showHowto() {
      menus.current = 'howto';
      show('howto');
    },
    showPanel(name) {
      menus.current = name;
      show(name);
    },
    hideAll() {
      menus.current = null;
      root.classList.remove('active');
    }
  };
  return menus;
}
