// Cuaca (Level 3 "Sore Hujan"). Aturan main dari file level (WEATHER):
// - KILAT tiap 25–45 detik (acak, tanpa peringatan): rumah terang 0,4 detik,
//   area gelap tidak berlaku (lihat perception.js: ctx.weather.flashT).
// - GUNTUR 1–2 detik setelah kilat: gemuruh + getaran kamera; selama 2,5
//   detik semua suara kucing diabaikan pemilik.
// - Hujan: suara kucing dengan radius < RAIN_MASK_RADIUS tertutup hujan.
// - Genangan bocor mengecil setelah pemilik menutup jendela & menaruh ember.
// Hanya aktif di level yang punya blok WEATHER.
import { RAIN_FX as F } from '../config.js';
import { currentLevel } from '../core/state.js';
import { triggerShake } from '../core/camera.js';
import { setDarkOverlayFade } from '../world/house.js';
import { createRain, updateRain, setBucket, disposeRain } from '../world/rain.js';

function rand([a, b]) {
  return a + Math.random() * (b - a);
}

export function weatherConfig(ctx) {
  return currentLevel(ctx.state).WEATHER || null;
}

export function resetWeather(ctx) {
  const prev = ctx.weather;
  if (prev) disposeRain(prev.rain);
  if (ctx.backdropMat) {
    if (ctx.backdropBase === undefined) ctx.backdropBase = ctx.backdropMat.color.getHex();
    ctx.backdropMat.color.setHex(ctx.backdropBase);
  }
  if (ctx.darkFx) setDarkOverlayFade(ctx.darkFx, 0);
  if (ctx.hud.setStorm) ctx.hud.setStorm(null);
  const W = weatherConfig(ctx);
  if (!W) {
    ctx.weather = null;
    if (ctx.audio.rain) ctx.audio.rain(0);
    return;
  }
  const lights = ctx.lights;
  ctx.weather = {
    W,
    nextFlash: rand(W.LIGHTNING_INTERVAL),
    flashT: 0,
    thunderIn: -1, // detik menuju guntur (setelah kilat)
    muteT: 0, // sisa waktu guntur (semua suara kucing diabaikan)
    flashes: 0,
    thunders: 0,
    windowFixed: false,
    puddleRadius: W.PUDDLE.RADIUS,
    base: lights ? { sun: lights.sun.intensity, hemi: lights.hemi.intensity } : null,
    rain: createRain(ctx, W)
  };
  if (ctx.backdropMat) ctx.backdropMat.color.setHex(F.BACKDROP_COLOR);
}

export function isFlashing(ctx) {
  return !!(ctx.weather && ctx.weather.flashT > 0);
}

// Suara kucing yang tidak terdengar pemilik (guntur / tertutup hujan)
export function isNoiseMasked(ctx, ev) {
  const w = ctx.weather;
  if (!w) return false;
  if (w.muteT > 0) return true;
  return ev.radius < w.W.RAIN_MASK_RADIUS;
}

// Kilat sekarang (dipakai uji & bisa dipakai naskah)
export function strikeLightning(ctx, hold = 0) {
  const w = ctx.weather;
  w.flashT = Math.max(w.W.FLASH_DURATION, hold);
  w.thunderIn = rand(w.W.THUNDER_DELAY);
  w.nextFlash = rand(w.W.LIGHTNING_INTERVAL);
  w.flashes++;
}

export function updateWeather(ctx, dt) {
  const w = ctx.weather;
  if (!w) return;
  w.nextFlash -= dt;
  if (w.nextFlash <= 0) strikeLightning(ctx);
  if (w.flashT > 0) w.flashT = Math.max(0, w.flashT - dt);
  if (w.thunderIn > 0) {
    w.thunderIn -= dt;
    if (w.thunderIn <= 0) {
      w.thunderIn = -1;
      w.muteT = w.W.THUNDER_MUTE;
      w.thunders++;
      if (ctx.audio.thunder) ctx.audio.thunder();
      triggerShake(ctx.cameraShake, F.THUNDER_SHAKE.AMPLITUDE, F.THUNDER_SHAKE.DURATION);
    }
  }
  if (w.muteT > 0) w.muteT = Math.max(0, w.muteT - dt);

  // Kilat: intensitas lampu yang ada dinaikkan (berkedip), area gelap memudar
  const f = w.flashT > 0 ? 1 - F.FLASH.FLICKER + F.FLASH.FLICKER * Math.sin(w.flashT * F.FLASH.FLICKER_FREQ) : 0;
  if (w.base && ctx.lights) {
    ctx.lights.sun.intensity = w.base.sun + f * F.FLASH.SUN_BOOST;
    ctx.lights.hemi.intensity = w.base.hemi + f * F.FLASH.HEMI_BOOST;
  }
  if (ctx.backdropMat) ctx.backdropMat.color.setHex(f > 0 ? F.FLASH.BACKDROP_COLOR : F.BACKDROP_COLOR);
  if (ctx.darkFx) setDarkOverlayFade(ctx.darkFx, w.flashT > 0 ? 1 : 0);

  // Jendela ditutup pemilik (owner/index.js) → ember, genangan mengecil
  if (w.windowFixed && w.puddleRadius !== w.W.PUDDLE.FIXED_RADIUS) {
    w.puddleRadius = w.W.PUDDLE.FIXED_RADIUS;
    setBucket(w.rain, w.puddleRadius);
  }

  updateRain(w.rain, dt);
  if (ctx.audio.rain) ctx.audio.rain(F.AUDIO.RAIN_VOLUME);
  if (ctx.hud.setStorm) {
    ctx.hud.setStorm(w.thunderIn > 0 ? { countdown: w.thunderIn } : w.muteT > 0 ? { thunder: w.muteT } : null);
  }
}
