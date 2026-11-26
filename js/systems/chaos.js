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
  const amount = Math.round(def.CHAOS * (combo ? COMBO.MULTIPLIER : 1) * bell);

  s.chaos += amount;
  s.mischiefCount += 1;
  s.lastMischiefTime = ctx.time;
  s.recentChaos.push({ x: position.x, z: position.z, t: ctx.time });
  if (s.recentChaos.length > 20) s.recentChaos.shift();

  emitNoise(ctx, {
    x: noisePosition.x,
    z: noisePosition.z,
    radius: def.NOISE_RADIUS,
    source: 'mischief-' + type
  });

  ctx.floatText.spawn(`+${amount}`, position, 'chaos');
  if (combo) {
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
