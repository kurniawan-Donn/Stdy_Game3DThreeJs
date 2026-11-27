// Analisis penyeimbangan (Fase 9.2): Chaos maksimum per level dan perkiraan
// Chaos untuk gaya bermain santai & mahir, dibandingkan dengan target dan
// ambang bintang. Hanya membaca data (config.js + js/levels/), tanpa Three.js.
//
//   node tools/balance.mjs            tabel Markdown
//   node tools/balance.mjs --json     data mentah
//
// Asumsi gaya bermain ada di PROFILES di bawah (bukan angka game, jadi tidak
// di config.js). Angka game dibaca langsung dari config & file level.
import { MISCHIEF, MISCHIEF_LAYOUT, COMBO, STAR_THRESHOLDS, CUSTOMIZATION, RESULTS } from '../js/config.js';
import { LEVELS, levelLabel } from '../js/levels/index.js';

// share = bagian kenakalan yang dikerjakan, combo = bagian yang kena bonus
// combo, captures = berapa kali ketahuan (tidak mengurangi Chaos, tapi
// menghabiskan waktu ±CAPTURE_TIME detik), extra = bagian ekstra level
// (jejak kaki, kemoceng, ulang setelah dibereskan) yang didapat.
const PROFILES = {
  santai: { share: 0.65, combo: 0.25, extra: 0.4, tidied: 0.3 },
  mahir: { share: 0.9, combo: 0.6, extra: 0.8, tidied: 0.15 }
};

function layoutFor(level) {
  const layout = { ...MISCHIEF_LAYOUT, ...((level.LAYOUT && level.LAYOUT.MISCHIEF_LAYOUT) || {}) };
  const active = level.ACTIVE_MISCHIEF;
  const out = [];
  for (const [type, specs] of Object.entries(layout)) {
    if (active && !active.includes(type)) continue;
    for (let i = 0; i < specs.length; i++) out.push(type);
  }
  return out;
}

// Sumber Chaos tambahan khusus level (selain objek MISCHIEF_LAYOUT)
function extrasFor(level, types) {
  const ex = [];
  const fp = level.WEATHER && level.WEATHER.FOOTPRINT;
  if (fp && fp.FURNITURE) ex.push({ what: `jejak kaki basah ×${fp.FURNITURE.length}`, max: fp.FURNITURE.length * MISCHIEF.wetPaws.CHAOS, combo: false });
  const C = level.CLEANING;
  if (C) {
    // Kemoceng: sekali per peletakan (satu per ruangan)
    const rooms = C.ROOMS.length;
    ex.push({ what: `kemoceng tiap ruangan (+${rooms - 1})`, max: (rooms - 1) * MISCHIEF.duster.CHAOS, combo: true });
    // Ulang setelah dibereskan: −50% lalu +nilai lagi + "Lho, kok?!" (tiap objek sekali)
    const redoable = types.filter((t) => t !== 'duster');
    const redo = redoable.reduce((s, t) => s + MISCHIEF[t].CHAOS * (1 - C.TIDY_FRACTION) + MISCHIEF.lhoKok.CHAOS, 0) * C.MAX_REDO;
    ex.push({ what: 'dibereskan lalu diulang + "Lho, kok?!"', max: Math.round(redo), combo: false });
  }
  return ex;
}

function analyse(level) {
  const types = layoutFor(level);
  const base = types.reduce((s, t) => s + MISCHIEF[t].CHAOS, 0);
  const extras = extrasFor(level, types);
  const extraMax = extras.reduce((s, e) => s + e.max * (e.combo ? COMBO.MULTIPLIER : 1), 0);
  // Maksimum: semua objek, semua kecuali yang pertama kena combo
  const first = types.length ? Math.min(...types.map((t) => MISCHIEF[t].CHAOS)) : 0;
  const max = Math.round((base - first) * COMBO.MULTIPLIER + first + extraMax);
  const bell = CUSTOMIZATION.BELL.CHAOS_MULT;
  const est = {};
  for (const [name, p] of Object.entries(PROFILES)) {
    let v = base * p.share * (1 + p.combo * (COMBO.MULTIPLIER - 1)) + extraMax * p.extra;
    if (level.CLEANING) v *= 1 - p.tidied * level.CLEANING.TIDY_FRACTION; // sebagian dibereskan pemilik
    est[name] = Math.round(v);
  }
  const target = level.TARGET_CHAOS;
  const th = level.STAR_THRESHOLDS || STAR_THRESHOLDS;
  const stars = (v) => th.filter((k) => v >= target * k).length;
  return {
    key: level.key,
    label: levelLabel(level),
    name: level.name,
    duration: level.DURATION,
    target,
    objects: types.length,
    counts: types.reduce((m, t) => ((m[t] = (m[t] || 0) + 1), m), {}),
    base,
    extras,
    max,
    maxBell: Math.round(max * bell),
    santai: est.santai,
    mahir: est.mahir,
    starsSantai: stars(est.santai),
    starsMahir: stars(est.mahir),
    threeStar: Math.round(target * th[th.length - 1]),
    maxVsThreeStar: +(max / (target * th[th.length - 1])).toFixed(2),
    chaosPerMin: +(target / (level.DURATION / 60)).toFixed(0)
  };
}

const rows = LEVELS.filter((l) => !l.TUTORIAL).map(analyse);
const prices = [...CUSTOMIZATION.CATS, ...CUSTOMIZATION.ACCESSORIES].filter((i) => i.price > 0);
const shop = {
  total: prices.reduce((s, i) => s + i.price, 0),
  campaignSantai: rows.reduce((s, r) => s + r.santai * RESULTS.BANK_FRACTION_TIME_UP, 0),
  campaignMahir: rows.reduce((s, r) => s + r.mahir * RESULTS.BANK_FRACTION_TIME_UP, 0),
  items: prices.map((i) => ({ id: i.id, name: i.name, price: i.price }))
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, shop }, null, 2));
} else {
  console.log('| Level | Durasi | Target | Objek | Chaos dasar | Maks (combo) | Maks + lonceng | ★★★ | Maks/★★★ | Santai | ★ santai | Mahir | ★ mahir |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(`| ${r.label} ${r.name} | ${r.duration / 60} mnt | ${r.target} | ${r.objects} | ${r.base} | ${r.max} | ${r.maxBell} | ${r.threeStar} | ${r.maxVsThreeStar} | ${r.santai} | ${r.starsSantai} | ${r.mahir} | ${r.starsMahir} |`);
  }
  console.log('\nSumber tambahan:');
  for (const r of rows) for (const e of r.extras) console.log(`- ${r.label}: ${e.what} = maks ${e.max}${e.combo ? ' (bisa combo)' : ''}`);
  console.log(`\nToko: total harga semua item ${shop.total}; satu putaran kampanye santai ≈ ${Math.round(shop.campaignSantai)}, mahir ≈ ${Math.round(shop.campaignMahir)} tabungan.`);
}
