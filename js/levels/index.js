// Daftar level (urutan = urutan buka). Menambah level: buat file baru di
// folder ini lalu tambahkan import-nya di bawah (tanpa build tool, browser
// tidak bisa membaca isi folder).
//
// Format satu level:
//   key, name, description       teks untuk kartu level
//   DURATION, TARGET_CHAOS       detik & target Chaos
//   STAR_THRESHOLDS              (opsional) kelipatan target untuk ★/★★/★★★, bawaan STAR_THRESHOLDS config
//   MUSIC_CALM                   (opsional) volume musik latar saat main, bawaan MUSIC_BG.CALM_LEVEL
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
//   LAYOUT.EXTRA_DARK_ZONES      zona gelap tambahan selama level ini ({ noOverlay } = tanpa lapisan)
//   LAYOUT.EXTRA_LIGHT_ZONES     zona terang yang membatalkan area gelap
//   NIGHT                        malam: pemilik tidur, meter terbangun, senter (lihat level4.js)
//   GUEST                        tamu: pembuka/penutup, jadwal berdua, AI tamu (lihat level5.js)
//   CLEANING                     bersih-bersih: jadwal ruangan, membereskan, robot menyedot (lihat bonus.js)
//   LAYOUT.DISABLE_DARK_ZONES    nama zona gelap (DARK_ZONES) yang dimatikan selama level ini
//   bonus                        true = level bonus (kartu "BONUS", label tanpa nomor)
//   TIME_UP_REASON               teks alasan di layar hasil saat waktu habis
//   TUTORIAL, STEPS              hanya Level 0 (Latihan), lihat level0.js
import level0 from './level0.js';
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import level4 from './level4.js';
import level5 from './level5.js';
import bonus from './bonus.js';

export const LEVELS = [level1, level2, level3, level4, level5, bonus].map((l, i) => ({ ...l, id: i + 1 }));

// Label tampilan: "Level 3" atau "BONUS"
export function levelLabel(level) {
  return level.bonus ? 'BONUS' : `Level ${level.id}`;
}

// Latihan (tutorial) berada di luar urutan buka level; indeksnya -1
export const TUTORIAL_INDEX = -1;
export const TUTORIAL_LEVEL = { ...level0, id: 0 };

export function levelAt(index) {
  return index === TUTORIAL_INDEX ? TUTORIAL_LEVEL : LEVELS[index];
}
