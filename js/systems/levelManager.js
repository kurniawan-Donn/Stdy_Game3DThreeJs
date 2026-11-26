// Level manager: memuat level dari js/levels/, menerapkan pengubahnya ke
// nilai config.js (nilai asli dicadangkan & dipulihkan saat ganti level),
// mengatur pencahayaan, lalu mereset dunia lewat resetGame.
// Aturan buka level juga di sini.
import * as CONFIG from '../config.js';
import { LEVELS, levelAt as levelByIndex } from '../levels/index.js';
import { levelRecord } from '../core/save.js';
import { resetGame } from './progression.js';

// Posisi objek di file level → objek & kunci config yang ditimpa
const LAYOUT_TARGETS = {
  HIDE_BOX_POSITIONS: ['HIDE_BOX', 'POSITIONS'],
  YARN_POSITIONS: ['YARN', 'POSITIONS'],
  CATNIP_POSITION: ['CATNIP', 'POSITION']
};

export function levelCount() {
  return LEVELS.length;
}

// index -1 = Latihan (tutorial)
export function levelAt(index) {
  return levelByIndex(index);
}

// Kembalikan semua nilai config yang ditimpa level sebelumnya
export function revertLevelOverrides(ctx) {
  const list = ctx.levelOverrides || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const { obj, key, had, prev } = list[i];
    if (had) obj[key] = prev;
    else delete obj[key];
  }
  ctx.levelOverrides = [];
}

function override(ctx, obj, key, value) {
  ctx.levelOverrides.push({ obj, key, had: Object.prototype.hasOwnProperty.call(obj, key), prev: obj[key] });
  obj[key] = value;
}

function applyOverrides(ctx, level) {
  for (const [name, values] of Object.entries(level.OWNER || {})) {
    const target = CONFIG[name];
    if (!target || typeof target !== 'object') throw new Error(`Level ${level.key}: config ${name} tidak ada`);
    for (const [k, v] of Object.entries(values)) override(ctx, target, k, v);
  }
  const layout = level.LAYOUT || {};
  if (layout.MISCHIEF_LAYOUT) {
    for (const [type, specs] of Object.entries(layout.MISCHIEF_LAYOUT)) override(ctx, CONFIG.MISCHIEF_LAYOUT, type, specs);
  }
  for (const [field, [name, key]] of Object.entries(LAYOUT_TARGETS)) {
    if (layout[field]) override(ctx, CONFIG[name], key, layout[field]);
  }
}

// Pencahayaan: mulai dari LIGHTS (config), lalu timpa dengan level.LIGHTING
export function applyLighting(lights, lighting = {}) {
  if (!lights) return;
  const L = CONFIG.LIGHTS;
  const set = (light, base, over = {}) => {
    if (!light) return;
    light.intensity = over.intensity !== undefined ? over.intensity : base.intensity;
    light.color.setHex(over.color !== undefined ? over.color : base.color);
  };
  set(lights.sun, L.sun, lighting.sun);
  if (lights.hemi) {
    const h = lighting.hemi || {};
    lights.hemi.intensity = h.intensity !== undefined ? h.intensity : L.hemi.intensity;
  }
  for (const p of L.points) set(lights[p.name], p, (lighting.points || {})[p.name]);
}

// Muat level ke-index (0 = level pertama) dan mulai dari awal
export function loadLevel(ctx, index) {
  const level = levelByIndex(index);
  if (!level) throw new Error(`Level ${index} tidak ada`);
  revertLevelOverrides(ctx);
  ctx.state.levelIndex = index;
  applyOverrides(ctx, level);
  applyLighting(ctx.lights, level.LIGHTING);
  resetGame(ctx);
  return level;
}

// --- Aturan buka level ---
export function isLevelUnlocked(save, index) {
  if (index <= 0) return true;
  const prev = LEVELS[index - 1];
  return !!prev && levelRecord(save, prev).bestStars >= CONFIG.LEVEL_UNLOCK_MIN_STARS;
}

export function highestUnlockedIndex(save) {
  let i = 0;
  while (i + 1 < LEVELS.length && isLevelUnlocked(save, i + 1)) i++;
  return i;
}

export function nextLevelIndex(save, index) {
  if (index < 0) return -1;
  const n = index + 1;
  return n < LEVELS.length && isLevelUnlocked(save, n) ? n : -1;
}
