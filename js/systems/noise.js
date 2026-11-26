// Sistem suara gameplay ("noise", bukan audio): setiap aksi yang berisik
// memancarkan event dengan posisi dan radius. Pendengar (misalnya pemilik
// rumah di Fase 3) mendaftar lewat onNoise().
import { NOISE } from '../config.js';

export function createNoiseSystem() {
  return { events: [], listeners: [] };
}

// fn(event, ctx) dipanggil untuk setiap noise baru.
export function onNoise(noise, fn) {
  noise.listeners.push(fn);
}

// event: { x, z, radius, source }. Radius <= 0 berarti senyap (diabaikan).
export function emitNoise(ctx, { x, z, radius, source }) {
  if (!(radius > 0)) return;
  const event = { x, z, radius, source, time: ctx.time, age: 0 };
  ctx.noise.events.push(event);
  for (const fn of ctx.noise.listeners) fn(event, ctx);
}

export function updateNoise(noise, dt) {
  for (let i = noise.events.length - 1; i >= 0; i--) {
    const ev = noise.events[i];
    ev.age += dt;
    if (ev.age >= NOISE.EVENT_LIFETIME) noise.events.splice(i, 1);
  }
}

export function clearNoise(noise) {
  noise.events.length = 0;
}
