// Menerapkan pengaturan pemain (ctx.save.settings) ke renderer, lampu,
// audio, dan UI. Sensitivitas & balik sumbu Y dibaca langsung oleh
// core/camera.js. Semua preset & batas ada di SETTINGS (config.js).
import { SETTINGS } from '../config.js';
import { isTouchDevice } from './device.js';
import { resolveBindings, keyLabel } from './input.js';

// Teks tombol di UI (<span data-key="aksi">) mengikuti rebind
export function applyKeyLabels(bindings) {
  if (!bindings || typeof document === 'undefined' || !document.querySelectorAll) return;
  for (const el of document.querySelectorAll('[data-key]')) {
    const codes = bindings[el.dataset.key];
    el.textContent = keyLabel(codes && codes[0]);
  }
}

export function qualityPreset(name) {
  return SETTINGS.QUALITY[name] || SETTINGS.QUALITY.high;
}

// Kualitas yang benar-benar dipakai: pilihan pemain, atau tingkat saat ini
// dari mode Otomatis (ctx.autoQuality)
export function effectiveQuality(ctx) {
  const q = ctx.save ? ctx.save.settings.quality : 'high';
  if (q !== 'auto') return SETTINGS.QUALITY[q] ? q : 'high';
  if (!ctx.autoQuality) ctx.autoQuality = createAutoQuality();
  return ctx.autoQuality.tier;
}

export function createAutoQuality() {
  const A = SETTINGS.AUTO;
  return { tier: isTouchDevice() ? A.START_TOUCH : A.START, lowT: 0, grace: A.GRACE, drops: 0 };
}

// Mode Otomatis: dipanggil tiap frame saat bermain (dt = waktu nyata).
// Mengembalikan nama tingkat baru jika kualitas baru saja diturunkan.
export function updateAutoQuality(ctx, dt) {
  if (!ctx.save || ctx.save.settings.quality !== 'auto') return null;
  const A = SETTINGS.AUTO;
  const aq = ctx.autoQuality || (ctx.autoQuality = createAutoQuality());
  if (aq.grace > 0) {
    aq.grace -= dt;
    aq.lowT = 0;
    return null;
  }
  aq.lowT = ctx.fps < A.FPS_MIN ? aq.lowT + dt : 0;
  if (aq.lowT < A.HOLD) return null;
  aq.lowT = 0;
  const i = A.ORDER.indexOf(aq.tier);
  if (i < 0 || i >= A.ORDER.length - 1) return null;
  aq.tier = A.ORDER[i + 1];
  aq.drops++;
  aq.grace = A.GRACE;
  applySettings(ctx);
  return aq.tier;
}

// Mulai level / kembali dari pause: abaikan FPS sesaat (kompilasi shader dsb.)
export function autoQualityGrace(ctx) {
  if (ctx.autoQuality) {
    ctx.autoQuality.grace = SETTINGS.AUTO.GRACE;
    ctx.autoQuality.lowT = 0;
  }
}

// Kualitas grafis: bayangan (aktif & ukuran peta) dan pixel ratio
export function applyQuality(renderer, lights, scenes, name) {
  const q = qualityPreset(name);
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  renderer.setPixelRatio(Math.min(dpr, q.maxPixelRatio));
  const changed = renderer.shadowMap.enabled !== q.shadows;
  renderer.shadowMap.enabled = q.shadows;
  for (const light of lights) {
    if (!light || !light.shadow) continue;
    light.castShadow = q.shadows;
    if (light.shadow.mapSize.width !== q.shadowMapSize) {
      light.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
      if (light.shadow.map) {
        light.shadow.map.dispose(); // dibuat ulang dengan ukuran baru
        light.shadow.map = null;
      }
    }
  }
  // Shader perlu dikompilasi ulang saat bayangan dinyalakan/dimatikan
  if (changed) {
    for (const scene of scenes) {
      scene.traverse((o) => {
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) m.needsUpdate = true;
      });
    }
  }
}

export function applySettings(ctx) {
  const st = ctx.save.settings;
  applyQuality(ctx.renderer, [ctx.lights && ctx.lights.sun, ctx.lobby && ctx.lobby.sun], [ctx.scene, ctx.lobby && ctx.lobby.scene].filter(Boolean), effectiveQuality(ctx));
  ctx.audio.setVolume(st.volume);
  if (ctx.audio.setMix) ctx.audio.setMix({ sfx: st.sfxVolume, amb: st.ambVolume, music: st.musicVolume });
  // Rebind tombol: aksi → kode tombol
  if (ctx.input) ctx.input.bindings = resolveBindings(st.keybinds);
  if (typeof document !== 'undefined' && document.body) {
    const b = document.body.classList;
    b.toggle('show-fps', st.showFps);
    // Aksesibilitas: kelas CSS
    b.toggle('reduce-flash', st.reduceFlash);
    b.toggle('colorblind', st.colorblind);
    for (const size of Object.keys(SETTINGS.HUD_SIZES)) b.toggle('hud-' + size, st.hudSize === size);
    applyKeyLabels(ctx.input ? ctx.input.bindings : null);
  }
  if (ctx.input && ctx.hud && ctx.hud.setKeyNames) {
    ctx.hud.setKeyNames({ meow: keyLabel(ctx.input.bindings.meow[0]), interact: keyLabel(ctx.input.bindings.interact[0]) });
  }
}
