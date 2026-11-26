// Daftar level (urutan = urutan buka). Menambah level: buat file baru di
// folder ini lalu tambahkan import-nya di bawah (tanpa build tool, browser
// tidak bisa membaca isi folder).
//
// Format satu level:
//   key, name, description       teks untuk kartu level
//   DURATION, TARGET_CHAOS       detik & target Chaos
//   LIGHTING                     { sun: {intensity, color}, hemi: {intensity},
//                                  points: { <nama>: {intensity, color} } } menimpa LIGHTS
//   ACTIVE_MISCHIEF              daftar jenis kenakalan yang aktif (null = semua)
//   LAYOUT                       posisi objek, menimpa config:
//                                  { MISCHIEF_LAYOUT, HIDE_BOX_POSITIONS,
//                                    YARN_POSITIONS, CATNIP_POSITION }
//   OWNER                        { <NAMA_CONFIG>: { <KUNCI>: nilai } } menimpa
//                                  config.js selama level berjalan
//   MEETINGS                     rapat video (lihat level2.js) atau null
//   WEATHER                      hujan, petir, genangan & jejak (lihat level3.js) atau tidak ada
//   LAYOUT.EXTRA_DARK_ZONES      zona gelap tambahan selama level ini
//   TUTORIAL, STEPS              hanya Level 0 (Latihan), lihat level0.js
import level0 from './level0.js';
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';

export const LEVELS = [level1, level2, level3].map((l, i) => ({ ...l, id: i + 1 }));

// Latihan (tutorial) berada di luar urutan buka level; indeksnya -1
export const TUTORIAL_INDEX = -1;
export const TUTORIAL_LEVEL = { ...level0, id: 0 };

export function levelAt(index) {
  return index === TUTORIAL_INDEX ? TUTORIAL_LEVEL : LEVELS[index];
}
