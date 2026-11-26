// HUD pojok kiri atas: skor, nyawa, level, status magnet.
import { GAME } from '../config.js';

export function createHud() {
  const scoreTextEl = document.getElementById('score-text');
  const livesTextEl = document.getElementById('lives-text');
  const levelTextEl = document.getElementById('level-text');
  const magnetStatusEl = document.getElementById('magnet-status');
  const staminaFillEl = document.getElementById('stamina-fill');
  const meowStatusEl = document.getElementById('meow-status');
  const promptEl = document.getElementById('interact-prompt');

  // Cache agar DOM tidak ditulis ulang tiap frame jika nilainya sama
  let lastStaminaPct = -1;
  let lastExhausted = null;
  let lastMeowText = '';
  let lastPrompt = undefined;

  return {
    setStamina(value, max, exhausted) {
      const pct = Math.round((value / max) * 1000) / 10;
      if (pct !== lastStaminaPct) {
        staminaFillEl.style.width = pct + '%';
        lastStaminaPct = pct;
      }
      if (exhausted !== lastExhausted) {
        staminaFillEl.classList.toggle('exhausted', exhausted);
        lastExhausted = exhausted;
      }
    },
    setMeowCooldown(remaining) {
      const text = remaining > 0 ? `Q Meong: ${remaining.toFixed(1)}s` : 'Q Meong: siap';
      if (text !== lastMeowText) {
        meowStatusEl.textContent = text;
        meowStatusEl.classList.toggle('cooldown', remaining > 0);
        lastMeowText = text;
      }
    },
    setInteractPrompt(label) {
      if (label === lastPrompt) return;
      lastPrompt = label;
      if (label) {
        promptEl.textContent = `E: ${label}`;
        promptEl.classList.add('active');
      } else {
        promptEl.classList.remove('active');
      }
    },
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
