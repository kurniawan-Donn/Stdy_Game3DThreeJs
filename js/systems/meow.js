// Mengeong (GDD §7): tombol Q, cooldown, memancarkan noise besar.
// Riwayat meongan disimpan untuk status "pemilik jengkel" (dipakai Fase 3).
import { actionPressed } from '../core/input.js';
import { MEOW, CAT_ANIM } from '../config.js';
import { emitNoise } from './noise.js';

export function createMeow() {
  return { cooldown: 0, history: [] };
}

export function resetMeow(meow) {
  meow.cooldown = 0;
  meow.history.length = 0;
}

// Jumlah meongan dalam jendela waktu MEOW.ANNOY_WINDOW.
export function recentMeowCount(meow) {
  return meow.history.length;
}

// True jika pemilik seharusnya jengkel (≥ ANNOY_COUNT meongan dalam jendela waktu).
export function isAnnoying(meow) {
  return meow.history.length >= MEOW.ANNOY_COUNT;
}

export function updateMeow(ctx, dt) {
  const { meow, input, cat, audio } = ctx;

  if (meow.cooldown > 0) meow.cooldown = Math.max(0, meow.cooldown - dt);
  while (meow.history.length && ctx.time - meow.history[0] > MEOW.ANNOY_WINDOW) {
    meow.history.shift();
  }

  if (actionPressed(input, 'meow') && meow.cooldown <= 0) {
    meow.cooldown = MEOW.COOLDOWN;
    meow.history.push(ctx.time);
    cat.meowTimer = CAT_ANIM.MEOW_DURATION;
    audio.playMeow();
    const p = cat.mesh.position;
    emitNoise(ctx, { x: p.x, z: p.z, radius: MEOW.NOISE_RADIUS, source: 'meow' });
  }
}
