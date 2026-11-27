// Chaos & combo (GDD §5). Semua kenakalan selesai lewat scoreMischief():
// menambah Chaos (dengan bonus combo), memancarkan noise sesuai radius GDD,
// dan memunculkan umpan balik (+angka melayang, COMBO, bunyi, bintang).
import { MISCHIEF, COMBO, CUSTOMIZATION } from '../config.js';
import { currentLevel } from '../core/state.js';
import { emitNoise } from './noise.js';
import { countStars } from './level.js';

// True jika kenakalan berikutnya akan mendapat bonus combo.
export function isComboActive(ctx) {
  const s = ctx.state;
  return s.mischiefCount > 0 && ctx.time - s.lastMischiefTime <= COMBO.WINDOW;
}

// Sisa waktu jendela combo (detik), 0 jika tidak aktif.
export function comboTimeLeft(ctx) {
  if (!isComboActive(ctx)) return 0;
  return COMBO.WINDOW - (ctx.time - ctx.state.lastMischiefTime);
}

// type: kunci MISCHIEF (glass, tissue, ...). position: asal angka melayang.
// noisePosition: asal suara (default = position).
export function scoreMischief(ctx, type, position, noisePosition = position) {
  const def = MISCHIEF[type];
  const s = ctx.state;
  const combo = isComboActive(ctx);
  // Kalung lonceng: Chaos ×1,2 (GDD §14)
  const bell = ctx.cat && ctx.cat.bell ? CUSTOMIZATION.BELL.CHAOS_MULT : 1;
  // NO_COMBO: nilai tetap (mis. jejak kaki basah +5 per perabot)
  const amount = Math.round(def.CHAOS * (combo && !def.NO_COMBO ? COMBO.MULTIPLIER : 1) * bell);

  s.chaos += amount;
  s.mischiefCount += 1;
  s.lastMischiefTime = ctx.time;
  s.recentChaos.push({ x: position.x, z: position.z, t: ctx.time });
  // Catatan untuk sistem lain (mis. bersih-bersih Level Bonus: kekacauan yang bisa dibereskan)
  if (s.scoreLog) s.scoreLog.push({ type, amount, x: position.x, y: position.y || 0, z: position.z, t: ctx.time });
  if (s.recentChaos.length > 20) s.recentChaos.shift();

  emitNoise(ctx, {
    x: noisePosition.x,
    z: noisePosition.z,
    radius: def.NOISE_RADIUS,
    source: 'mischief-' + type
  });

  ctx.floatText.spawn(`+${amount}`, position, 'chaos');
  if (combo && !def.NO_COMBO) {
    ctx.floatText.spawn(`COMBO x${COMBO.MULTIPLIER}`, position, 'combo');
    ctx.audio.play('combo');
  } else {
    ctx.audio.play('chaos');
  }

  // Bintang baru tercapai?
  const target = currentLevel(s).TARGET_CHAOS;
  const stars = countStars(s.chaos, target);
  if (stars > s.starsReached) {
    s.starsReached = stars;
    ctx.audio.play('star');
  }

  ctx.hud.setChaos(s.chaos, target);
  return amount;
}

// Ubah Chaos tanpa kenakalan (Level Bonus): delta < 0 = dibereskan pemilik
// (angka merah "-N"), delta > 0 = bonus (angka "+N"). Chaos tidak di bawah 0.
export function adjustChaos(ctx, delta, position) {
  const s = ctx.state;
  const before = s.chaos;
  s.chaos = Math.max(0, s.chaos + delta);
  const shown = s.chaos - before;
  if (delta < 0) {
    ctx.floatText.spawn(`${shown}`, position, 'penalty');
    ctx.audio.play('chaosLoss');
  } else {
    ctx.floatText.spawn(`+${shown}`, position, 'chaos');
    ctx.audio.play('chaos');
  }
  const target = currentLevel(s).TARGET_CHAOS;
  const stars = countStars(s.chaos, target);
  if (stars > s.starsReached) ctx.audio.play('star');
  s.starsReached = stars; // bintang bisa hilang lagi jika Chaos berkurang
  ctx.hud.setChaos(s.chaos, target);
  return shown;
}
