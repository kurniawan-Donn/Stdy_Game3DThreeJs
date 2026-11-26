// Timer level, akhir level, rating bintang, dan tabungan Chaos (GDD §4, §10).
import { STAR_THRESHOLDS, RESULTS, HUD } from '../config.js';
import { currentLevel } from '../core/state.js';
import { recordLevelResult, defaultSave } from '../core/save.js';
import { nextLevelIndex } from './levelManager.js';
import { startDawn } from './night.js';
import { startOutro } from './visit.js';
import { hideInteraction } from './interaction.js';

export function countStars(chaos, target) {
  let stars = 0;
  for (const t of STAR_THRESHOLDS) if (chaos >= target * t) stars++;
  return stars;
}

export function updateLevelTimer(ctx, dt) {
  const s = ctx.state;
  if (currentLevel(s).TUTORIAL) return; // Latihan tanpa timer
  const before = s.timeLeft;
  s.timeLeft = Math.max(0, s.timeLeft - dt);

  // Bunyi tik di detik-detik terakhir
  if (s.timeLeft <= HUD.TIMER_TICK_FROM && Math.ceil(s.timeLeft) !== Math.ceil(before) && s.timeLeft > 0) {
    ctx.audio.play('timerTick');
  }

  ctx.hud.setTimer(s.timeLeft);
  if (s.timeLeft <= 0) {
    // Malam: matahari terbit dulu, lalu layar hasil
    if (ctx.night && !ctx.night.dawnDone) {
      startDawn(ctx);
      return;
    }
    // Tamu: pamit & melambai dulu, lalu layar hasil
    if (ctx.visit && !ctx.visit.outroDone) {
      startOutro(ctx);
      return;
    }
    endLevel(ctx, 'timeUp');
  }
}

// reason: 'timeUp' | 'outOfLives'
export function endLevel(ctx, reason) {
  const s = ctx.state;
  if (s.isGameOver) return;
  s.isGameOver = true;
  ctx.cat.mesh.visible = true;
  hideInteraction(ctx);

  const level = currentLevel(s);
  const target = level.TARGET_CHAOS;
  const timeUp = reason === 'timeUp';
  const won = timeUp && s.chaos >= target;
  const stars = won ? countStars(s.chaos, target) : 0;
  const fraction = timeUp ? RESULTS.BANK_FRACTION_TIME_UP : RESULTS.BANK_FRACTION_OUT_OF_LIVES;
  const banked = Math.round(s.chaos * fraction);

  if (!ctx.save) ctx.save = defaultSave(); // (uji tanpa simpanan)
  const save = recordLevelResult(ctx.save, { level, banked, chaos: s.chaos, stars });
  if (ctx.flow) ctx.flow.state = 'results';

  let message;
  if (!timeUp) {
    message = RESULTS.OUT_OF_LIVES_MESSAGE.replace('{pct}', String(Math.round(fraction * 100)));
  } else {
    message = won ? RESULTS.WIN_MESSAGE : RESULTS.LOSE_MESSAGE;
  }

  ctx.results.show({
    reason: timeUp ? level.TIME_UP_REASON || RESULTS.TIME_UP_REASON : RESULTS.OUT_OF_LIVES_REASON,
    won,
    stars,
    maxStars: STAR_THRESHOLDS.length,
    message,
    chaos: s.chaos,
    target,
    banked,
    bank: save.chaosBank,
    levelName: level.name,
    hasNext: nextLevelIndex(save, s.levelIndex) >= 0
  });
  ctx.audio.play(won ? 'win' : 'gameOver');
}
