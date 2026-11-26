// Simpanan progres di localStorage dengan versi skema. Save lama dimigrasi
// otomatis; data rusak atau localStorage yang tidak tersedia (mode privat,
// kuota penuh) tidak menghentikan game: progres hanya tidak tersimpan.
//
// Skema v2:
//   version        2
//   chaosBank      tabungan Chaos
//   levels         { <level.key>: { bestChaos, bestStars } }
//   owned          { cats: [id...], accessories: [id...] }
//   selected       { cat: id, accessory: id | null }
//   settings       lihat SETTINGS.DEFAULTS
//   tutorialDone   status tutorial (Level 0, fase berikutnya)
import { SAVE, SETTINGS, CUSTOMIZATION } from '../config.js';
import { LEVELS } from '../levels/index.js';

function storage() {
  try {
    return window.localStorage || null;
  } catch (e) {
    return null; // akses localStorage bisa melempar (mis. cookie diblokir)
  }
}

export function defaultSave() {
  return {
    version: SAVE.VERSION,
    chaosBank: 0,
    levels: {},
    owned: { cats: [...CUSTOMIZATION.FREE_CATS], accessories: [] },
    selected: { cat: CUSTOMIZATION.DEFAULT_CAT, accessory: null },
    settings: { ...SETTINGS.DEFAULTS },
    tutorialDone: false
  };
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// v1 { chaosBank, levels: { <id angka>: {...} } } → v2
function migrateV1(data) {
  const out = defaultSave();
  out.chaosBank = Math.max(0, num(data.chaosBank));
  if (isObj(data.levels)) {
    for (const [id, rec] of Object.entries(data.levels)) {
      const level = LEVELS[Number(id) - 1];
      if (level && isObj(rec)) out.levels[level.key] = rec;
    }
  }
  return out;
}

// Rapikan data (tipe salah / kunci hilang → nilai bawaan)
function normalize(data) {
  const out = defaultSave();
  out.chaosBank = Math.max(0, Math.floor(num(data.chaosBank)));
  if (isObj(data.levels)) {
    for (const [key, rec] of Object.entries(data.levels)) {
      if (!isObj(rec)) continue;
      out.levels[key] = { bestChaos: Math.max(0, num(rec.bestChaos)), bestStars: Math.max(0, Math.floor(num(rec.bestStars))) };
    }
  }
  if (isObj(data.owned)) {
    const cats = Array.isArray(data.owned.cats) ? data.owned.cats.filter((c) => typeof c === 'string') : [];
    const acc = Array.isArray(data.owned.accessories) ? data.owned.accessories.filter((c) => typeof c === 'string') : [];
    out.owned.cats = [...new Set([...CUSTOMIZATION.FREE_CATS, ...cats])];
    out.owned.accessories = [...new Set(acc)];
  }
  if (isObj(data.selected)) {
    if (out.owned.cats.includes(data.selected.cat)) out.selected.cat = data.selected.cat;
    if (out.owned.accessories.includes(data.selected.accessory)) out.selected.accessory = data.selected.accessory;
  }
  if (isObj(data.settings)) {
    for (const [k, def] of Object.entries(SETTINGS.DEFAULTS)) {
      const v = data.settings[k];
      if (typeof v === typeof def) out.settings[k] = v;
    }
  }
  // Pemain lama yang sudah punya progres dianggap sudah lulus latihan
  out.tutorialDone = data.tutorialDone === true || out.chaosBank > 0 || Object.keys(out.levels).length > 0;
  return out;
}

export function loadSave() {
  const ls = storage();
  if (!ls) return defaultSave();
  try {
    let raw = ls.getItem(SAVE.KEY);
    let data = raw ? JSON.parse(raw) : null;
    if (!data) {
      // Save lama dengan kunci berbeda
      for (const k of SAVE.LEGACY_KEYS) {
        const old = ls.getItem(k);
        if (old) {
          data = migrateV1(JSON.parse(old));
          break;
        }
      }
    } else if (!data.version || data.version < 2) {
      data = migrateV1(data);
    }
    if (!isObj(data)) return defaultSave();
    const save = normalize(data);
    writeSave(save);
    return save;
  } catch (e) {
    return defaultSave();
  }
}

export function writeSave(save) {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(SAVE.KEY, JSON.stringify(save));
    return true;
  } catch (e) {
    return false; // progres tidak tersimpan, game tetap jalan
  }
}

// Hapus progres: kosongkan simpanan & kembali ke nilai awal (pengaturan ikut direset)
export function resetSave() {
  const ls = storage();
  if (ls) {
    try {
      ls.removeItem(SAVE.KEY);
      for (const k of SAVE.LEGACY_KEYS) ls.removeItem(k);
    } catch (e) {
      // abaikan
    }
  }
  return defaultSave();
}

export function levelRecord(save, level) {
  return save.levels[level.key] || { bestChaos: 0, bestStars: 0 };
}

// Tambah tabungan dan perbarui rekor level (mengubah `save` lalu menyimpannya)
export function recordLevelResult(save, { level, banked, chaos, stars }) {
  save.chaosBank += banked;
  const prev = levelRecord(save, level);
  save.levels[level.key] = {
    bestChaos: Math.max(prev.bestChaos, chaos),
    bestStars: Math.max(prev.bestStars, stars)
  };
  writeSave(save);
  return save;
}
