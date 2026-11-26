// Simpanan progres di localStorage: tabungan Chaos (untuk lobi, Fase 8) dan
// rekor per level. Gagal baca/tulis (mis. mode privat) tidak menghentikan game.
import { SAVE } from '../config.js';

function defaultSave() {
  return { chaosBank: 0, levels: {} };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE.KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    return {
      chaosBank: Number(data.chaosBank) || 0,
      levels: data.levels && typeof data.levels === 'object' ? data.levels : {}
    };
  } catch (e) {
    return defaultSave();
  }
}

function writeSave(data) {
  try {
    window.localStorage.setItem(SAVE.KEY, JSON.stringify(data));
  } catch (e) {
    // abaikan: progres tidak tersimpan, game tetap jalan
  }
}

// Menambah tabungan dan memperbarui rekor level. Mengembalikan simpanan baru.
export function recordLevelResult({ levelId, banked, chaos, stars }) {
  const data = loadSave();
  data.chaosBank += banked;
  const prev = data.levels[levelId] || { bestChaos: 0, bestStars: 0 };
  data.levels[levelId] = {
    bestChaos: Math.max(prev.bestChaos, chaos),
    bestStars: Math.max(prev.bestStars, stars)
  };
  writeSave(data);
  return data;
}
