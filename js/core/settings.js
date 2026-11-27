// Menerapkan pengaturan pemain (ctx.save.settings) ke renderer, lampu,
// audio, dan UI. Sensitivitas & balik sumbu Y dibaca langsung oleh
// core/camera.js. Semua preset & batas ada di SETTINGS (config.js).
import { SETTINGS } from '../config.js';

export function qualityPreset(name) {
  return SETTINGS.QUALITY[name] || SETTINGS.QUALITY[SETTINGS.DEFAULTS.quality];
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
  applyQuality(ctx.renderer, [ctx.lights && ctx.lights.sun, ctx.lobby && ctx.lobby.sun], [ctx.scene, ctx.lobby && ctx.lobby.scene].filter(Boolean), st.quality);
  ctx.audio.setVolume(st.volume);
  if (ctx.audio.setMix) ctx.audio.setMix({ sfx: st.sfxVolume, amb: st.ambVolume, music: st.musicVolume });
  if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('show-fps', st.showFps);
}
