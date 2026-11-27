// Level 5 — Kedatangan Tamu: siang seperti Level 1. Pemilik & tamu mengobrol
// di meja makan; tamu ingin mengelus kucing dan mengadu kenakalan ke pemilik.
// Jadwal berdua: systems/visit.js; AI tamu: entities/guest/index.js.
export default {
  key: 'kedatangan-tamu',
  name: 'Kedatangan Tamu',
  description: 'Ada tamu! Ia ingin mengelusmu dan suka mengadu. Curi kuenya saat tak ada yang menatap meja.',
  DURATION: 300, // 5 menit
  TARGET_CHAOS: 500,
  STAR_THRESHOLDS: [1, 1.4, 1.8], // Fase 9.2: ★★ 700, ★★★ 900 (★★★ tercapai tanpa kalung lonceng)
  TIME_UP_REASON: 'Tamu pamit pulang!',
  LIGHTING: {},
  ACTIVE_MISCHIEF: null, // semua kenakalan biasa + 4 kenakalan tamu (LAYOUT)
  LAYOUT: {
    MISCHIEF_LAYOUT: {
      cake: [{ x: 4.85, y: 0.75, z: 3.02 }], // piring kue di depan tamu
      teacup: [{ x: 5.2, y: 0.75, z: 3.05 }], // cangkir teh tamu
      guestBag: [{ x: 5.65, y: 0.45, z: 1.93 }], // tas/jaket di kursi kosong samping pemilik
      guestChair: [{ x: 4.85, y: 0.45, z: 3.67 }] // kursi tamu
    }
  },
  OWNER: {},
  MEETINGS: null,
  GUEST: {
    // Pembuka & penutup
    INTRO_DURATION: 5,
    BELL_AT: 0.2,
    DOOR_OPEN_AT: 1.0,
    GUEST_ENTER_AT: 1.8,
    OUTRO_DURATION: 4,
    DOOR_INSIDE: { x: 2.6, z: 4.35 }, // berdiri di dalam pintu depan
    DOOR_OUTSIDE: { x: 2.6, z: 5.8 }, // tamu mulai di luar
    GREET_SPOT: { x: 2.6, z: 3.55, yaw: 0 }, // pemilik menyambut, menghadap pintu (+Z)
    // Tempat duduk di meja makan: pemilik menghadap selatan (ke tamu), tamu menghadap utara
    OWNER_SEAT: { x: 4.85, z: 1.93, yaw: 0, approach: { x: 4.85, z: 1.35 } },
    GUEST_SEAT: { x: 4.85, z: 3.67, yaw: Math.PI, approach: { x: 4.85, z: 4.25 } },
    // Jadwal berdua
    KITCHEN_EVERY: 70, // detik sekali ke dapur bersama
    KITCHEN_DURATION: 10,
    OWNER_KITCHEN: { x: 4.75, z: -4.0, yaw: Math.PI },
    GUEST_KITCHEN: { x: 4.1, z: -3.6, yaw: Math.PI },
    TOILET_WINDOW: [90, 180], // detik: tamu ke toilet sekali (acak)
    TOILET_DURATION: 20,
    TOILET_SPOT: { x: -1.5, z: -3.0 }, // di dalam kamar mandi
    CHAT_GLANCE_INTERVAL: [20, 30], // pemilik menoleh ke sekitar saat mengobrol
    CHAT_GLANCE_DURATION: 2.5,
    DRINK_EVERY: [8, 14], // tamu sesekali minum teh
    DRINK_DURATION: 2.5,
    // AI tamu
    CALL_RADIUS: 4, // "Pus, pus!" = suara 4 m
    OWNER_LOOK_TIME: 2, // pemilik menoleh ke tamu (tanpa curiga)
    APPROACH_SPEED: 1.0,
    GIVE_UP_UNSEEN: 3, // menyerah jika kucing tak terlihat selama ini
    GIVE_UP_DIST: 4,
    CALL_COOLDOWN: 15, // menyerah mendekat → jeda sebelum memanggil lagi
    REACH_WAIT: 2, // tak bisa menjangkau kucing selama ini → menyerah
    PET_DIST: 0.6,
    PET_MAX_HEIGHT: 1.0, // kucing setinggi ini masih bisa dielus (lantai, kursi, meja)
    PET_MAX_CAT_SPEED: 0.3, // kucing yang bergerak lebih cepat dianggap kabur
    PET_DURATION: 3,
    PET_STAMINA: 40,
    PET_COOLDOWN: 45, // jeda sebelum mau mendekat lagi
    REPORT_SUSPICION: 70, // tamu mengadu: curiga pemilik naik ke sini
    REPORT_COOLDOWN: 6,
    LAUGH_TIME: 2.5,
    MEOW_LURE_RADIUS: 4.8 // meong sejauh ini memancing tamu mendekat
  }
};
