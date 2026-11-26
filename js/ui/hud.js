// HUD ringkas pojok kiri atas: level & waktu, Chaos Meter (garis target +
// bintang), combo (hanya saat aktif), nyawa, stamina, status meong; plus
// prompt interaksi (E). Daftar kontrol ada di layar bantuan (ui/help.js).
import { GAME, STAR_THRESHOLDS, HUD } from '../config.js';

// Bar Chaos mencakup 0 .. (ambang bintang tertinggi × target)
const METER_MAX = STAR_THRESHOLDS[STAR_THRESHOLDS.length - 1];

function formatTime(seconds) {
  const s = Math.ceil(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function createHud() {
  const levelTextEl = document.getElementById('level-text');
  const timerEl = document.getElementById('timer-text');
  const chaosTextEl = document.getElementById('chaos-text');
  const targetTextEl = document.getElementById('target-text');
  const chaosFillEl = document.getElementById('chaos-fill');
  const meterEl = document.getElementById('chaos-meter');
  const comboEl = document.getElementById('combo-status');
  const livesTextEl = document.getElementById('lives-text');
  const staminaFillEl = document.getElementById('stamina-fill');
  const meowStatusEl = document.getElementById('meow-status');
  const promptEl = document.getElementById('interact-prompt');

  // Garis target & tanda bintang pada Chaos Meter
  const starEls = STAR_THRESHOLDS.map((t, i) => {
    const pct = (t / METER_MAX) * 100;
    if (i === 0) {
      const line = document.createElement('div');
      line.className = 'chaos-target';
      line.style.left = pct + '%';
      meterEl.appendChild(line);
    }
    const star = document.createElement('span');
    star.className = 'chaos-star';
    star.textContent = '★';
    star.style.left = pct + '%';
    star.title = `${Math.round(t * 100)}% target`;
    meterEl.appendChild(star);
    return { el: star, threshold: t };
  });

  // Cache agar DOM tidak ditulis ulang tiap frame jika nilainya sama
  let lastStaminaPct = -1;
  let lastExhausted = null;
  let lastMeowText = '';
  let lastPrompt = undefined;
  let lastTimerText = '';
  let lastTimerWarn = null;
  let lastComboText = null;

  return {
    setLevel(levelId) {
      levelTextEl.textContent = `Level ${levelId}`;
    },
    setTimer(seconds) {
      const text = formatTime(seconds);
      if (text !== lastTimerText) {
        timerEl.textContent = text;
        lastTimerText = text;
      }
      const warn = seconds <= HUD.TIMER_WARNING;
      if (warn !== lastTimerWarn) {
        timerEl.classList.toggle('warning', warn);
        lastTimerWarn = warn;
      }
    },
    setChaos(chaos, target) {
      chaosTextEl.textContent = String(chaos);
      targetTextEl.textContent = String(target);
      const pct = Math.min(100, (chaos / (target * METER_MAX)) * 100);
      chaosFillEl.style.width = pct + '%';
      for (const s of starEls) s.el.classList.toggle('reached', chaos >= target * s.threshold);
    },
    // remaining > 0: kenakalan berikutnya dalam waktu ini dapat bonus combo
    setCombo(remaining, multiplier) {
      const text = remaining > 0 ? `COMBO x${multiplier} · ${remaining.toFixed(1)}s` : '';
      if (text !== lastComboText) {
        comboEl.textContent = text;
        comboEl.classList.toggle('active', remaining > 0);
        lastComboText = text;
      }
    },
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
      const text = remaining > 0 ? `${Math.ceil(remaining)}s` : 'Q ✓';
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
    setLives(lives) {
      const filled = '❤️'.repeat(Math.max(lives, 0));
      const empty = '🖤'.repeat(Math.max(GAME.MAX_LIVES - lives, 0));
      livesTextEl.textContent = filled + empty;
    }
  };
}
