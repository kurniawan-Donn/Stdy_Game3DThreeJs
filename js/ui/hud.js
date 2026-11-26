// HUD pojok kiri atas: skor, nyawa, level, status magnet.
import { GAME } from '../config.js';

export function createHud() {
  const scoreTextEl = document.getElementById('score-text');
  const livesTextEl = document.getElementById('lives-text');
  const levelTextEl = document.getElementById('level-text');
  const magnetStatusEl = document.getElementById('magnet-status');

  return {
    setScore(score) {
      scoreTextEl.textContent = String(score);
    },
    setLevel(level) {
      levelTextEl.textContent = String(level);
    },
    setLives(lives) {
      const filled = '❤️'.repeat(Math.max(lives, 0));
      const empty = '🖤'.repeat(Math.max(GAME.MAX_LIVES - lives, 0));
      livesTextEl.textContent = filled + empty;
    },
    showMagnet() {
      magnetStatusEl.style.display = 'block';
    },
    hideMagnet() {
      magnetStatusEl.style.display = 'none';
    },
    setMagnetTime(seconds) {
      magnetStatusEl.textContent = `Magnet: ${seconds.toFixed(1)}s`;
    }
  };
}
