// Level Bonus — Minggu Bersih-bersih: pemilik bersih-bersih ruangan demi
// ruangan (kemoceng → sapu), membereskan kekacauan yang dilihatnya (Chaos −50%),
// dan mengecek kolong sofa & kasur sebagai bagian rutinitas. Dua robot vacuum
// menyedot serpihan. Aturan dijalankan systems/cleaning.js & owner/cleaning.js.
import { REAL_SCALE as RS } from '../config.js';

export default {
  key: 'minggu-bersih',
  name: 'Minggu Bersih-bersih',
  bonus: true, // kartu khusus "BONUS" di Pilih Level
  description: 'Minggu pagi, pemilik bersih-bersih seisi rumah dan merapikan setiap kekacauan yang ia lihat. Bikin berantakan lagi!',
  DURATION: 300, // 5 menit
  TARGET_CHAOS: 400,
  TIME_UP_REASON: 'Rumah sudah bersih... katanya.',
  // Minggu pagi cerah: matahari & langit lebih terang
  LIGHTING: {
    sun: { intensity: 1.6, color: 0xfff1d6 },
    hemi: { intensity: 0.72 }
  },
  // Kenakalan Level 1 + 2 kenakalan khusus (selimut diganti tumpukan pakaian di kasur)
  ACTIVE_MISCHIEF: ['glass', 'tissue', 'scratchSofa', 'remote', 'pot', 'kitchenFish', 'toiletPaper', 'laundry', 'duster'],
  LAYOUT: {
    MISCHIEF_LAYOUT: {
      laundry: [{ x: -5.0, y: RS.bed.HEIGHT, z: -3.3 }], // ujung kasur (di atas selimut)
      duster: [{}] // kemoceng dibawa pemilik; tempatnya per ruangan (CLEANING.ROOMS)
    },
    // Tirai kamar tidur terbuka: kamar tidur tidak gelap (lorong tetap gelap)
    DISABLE_DARK_ZONES: ['bedroom']
  },
  OWNER: {
    // Pecahan gelas tidak memudar (tetap sampai disedot robot atau dibereskan)
    GLASS: { SHARD_LIFE: 1e6 }
  },
  MEETINGS: null,
  CLEANING: {
    ROOM_TIME: 50, // detik per ruangan
    DUST_TIME: 12, // mengelap debu dengan kemoceng
    PLACE_TIME: 0.6, // berjongkok meletakkan / mengambil kemoceng
    SWEEP_SPEED: 0.6, // m/detik saat menyapu
    SWEEP_STEP: 0.9, // jarak antar baris/kolom titik sapuan (dibuat otomatis dari grid navigasi)
    HEAD_SWAY: 0.52, // ±30° kepala bergoyang saat menyapu
    HEAD_SWAY_SPEED: 1.4,
    CHECK_AT: 12, // detik menyapu sebelum mengecek kolong (ruangan yang punya CHECK)
    CHECK_TIME: 1.5, // membungkuk mengecek kolong (selalu, bagian rutinitas)
    FETCH_BEFORE: 5, // detik sebelum giliran habis: mengambil kemoceng
    SEARCH_TIME: 3, // "Kemocengku mana?": menoleh ke sekitar
    SEE_RANGE: 4, // jangkauan melihat kekacauan
    SEE_LIFT: 0.08,
    SEE_HZ: 10, // pemeriksaan kekacauan per detik
    TIDY_TIME: 2, // berjongkok membereskan
    TIDY_FRACTION: 0.5, // Chaos berkurang 50% dari yang didapat
    MAX_REDO: 1, // kenakalan yang dibereskan bisa dilakukan sekali lagi
    LHO_KOK_SUSPICION: 30, // "Lho, kok?!": curiga +30
    CLAIM_RADIUS: 3, // benda fisika milik satu kekacauan (serpihan, lembar tisu)
    SUCK_MAX_RADIUS: 0.045, // robot menyedot benda kecil (pecahan, tisu)
    SUCK_REACH: 0.05, // jangkauan sedot di luar radius robot
    SUCK_MAX_Y: 0.06,
    ROBOT_STARTS: [{ x: -1.2, z: 3.4 }, { x: 5.8, z: -1.0 }], // dua robot di ruangan berbeda
    SPEAKER: { x: 1.62, y: RS.tvRack.HEIGHT, z: -0.06, yaw: 0 }, // speaker musik di rak TV
    LAUNDRY_BASKET: { x: -2.3, z: -1.88, yaw: Math.PI / 2 }, // kamar mandi, samping pintu (menghadap timur)
    // Urutan ruangan; rooms = nama di HOUSE.rooms yang disapu.
    // dust = tempat mengelap (menghadap yaw); duster = tempat kemoceng diletakkan (lantai);
    // check = cek kolong (berdiri di spot, kolong terdekat dari target)
    ROOMS: [
      {
        id: 'living', name: 'Ruang tamu', icon: '🛋️', rooms: ['livingRoom', 'dining'],
        dust: { x: 1.1, z: 0.35, yaw: 2.3 }, // rak TV (dari sisi barat)
        duster: { x: -1.0, z: 3.0 },
        check: { spot: { x: 3.45, z: 1.65 }, target: { x: 2.0, z: 1.64 } } // kolong sofa
      },
      {
        id: 'kitchen', name: 'Dapur', icon: '🍳', rooms: ['kitchen'],
        dust: { x: 4.75, z: -3.9, yaw: Math.PI }, // konter
        duster: { x: 4.2, z: -2.9 }
      },
      {
        id: 'bedroom', name: 'Kamar tidur', icon: '🛏️', rooms: ['bedroom'],
        dust: { x: -5.55, z: -2.45, yaw: 0 }, // meja rias
        duster: { x: -3.3, z: -2.4 },
        check: { spot: { x: -3.95, z: -3.6 }, target: { x: -5.2, z: -3.9 } } // kolong kasur
      },
      {
        id: 'bathroom', name: 'Kamar mandi', icon: '🛁', rooms: ['bathroom'],
        dust: { x: -0.9, z: -4.1, yaw: Math.PI }, // wastafel
        duster: { x: -1.2, z: -2.2 }
      },
      {
        id: 'hallway', name: 'Lorong', icon: '🚪', rooms: ['hallway'],
        dust: { x: -2.0, z: -0.95, yaw: Math.PI }, // kusen pintu
        duster: { x: 1.8, z: -0.9 }
      }
    ]
  }
};
