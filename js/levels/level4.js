// Level 4 — Malam Hari: rumah gelap, pemilik tidur. Suara mengisi meter
// TERBANGUN; pemilik yang bangun menyelidiki dengan senter. Di akhir level
// matahari terbit. Aturan malam dijalankan systems/night.js & owner/index.js.
export default {
  key: 'malam-hari',
  name: 'Malam Hari',
  description: 'Pemilik tidur. Setiap suara bisa membangunkannya, dan ia datang membawa senter. Bertahan sampai pagi!',
  DURATION: 300, // 5 menit
  TARGET_CHAOS: 350,
  TIME_UP_REASON: 'Pagi telah tiba!', // alasan di layar hasil saat waktu habis
  // Bulan biru pucat (lampu matahari, sangat redup agar tidak menembus dinding saat
  // tak berbayangan) + tambalan berkas bulan di lantai (systems/night.js); lampu ruangan mati
  LIGHTING: {
    sun: { intensity: 0.12, color: 0x8fa9d8 },
    hemi: { intensity: 0.07 },
    points: {
      lamp: { intensity: 0 },
      living: { intensity: 0 },
      kitchen: { intensity: 0 },
      study: { intensity: 0 }
    }
  },
  // Semua kenakalan, kecuali "acak-acak selimut" (diganti kneading), + 2 kenakalan malam
  ACTIVE_MISCHIEF: ['glass', 'tissue', 'scratchSofa', 'remote', 'pot', 'kitchenFish', 'toiletPaper', 'knead', 'alarmClock'],
  LAYOUT: {
    MISCHIEF_LAYOUT: {
      knead: [{ x: -5.2, y: 0.55, z: -3.6 }], // di atas selimut, di samping pemilik
      alarmClock: [{ x: -6.5, y: 0.5, z: -4.6 }] // di atas nakas
    },
    // Hampir seluruh rumah gelap (gelapnya dari pencahayaan, tanpa lapisan)...
    EXTRA_DARK_ZONES: [{ x: 0, z: 0, width: 14, depth: 10, noOverlay: true }],
    // ...kecuali berkas cahaya bulan dari jendela ruang tamu
    EXTRA_LIGHT_ZONES: [{ x: -5.7, z: 2.3, width: 2.6, depth: 2.6 }]
  },
  OWNER: {
    SUSPICION: { INVESTIGATE_LOOK_TIME: 6 } // menyorot sekeliling lebih lama
  },
  MEETINGS: null,
  NIGHT: {
    WAKE: {
      HEAR_MULT: 2, // suara "sampai ke kamar" jika jarak ≤ 2 × radius
      GAIN: 25, // isi = GAIN × radius × (1 − jarak / (HEAR_MULT × radius))
      DECAY: 3, // turun per detik saat tidur
      MAX: 100,
      SPEEDUP: 1.25 // tiap kali terbangun, meter berikutnya terisi 25% lebih cepat
    },
    SIT_UP_TIME: 1.5, // duduk di tepi kasur sebelum menyalakan senter
    BED_SPOT: { x: -4.0, z: -3.9, yaw: -Math.PI / 2 }, // berdiri di sisi kasur
    SLEEP_POSE: { x: -5.2, y: 0.66, z: -3.05 }, // berbaring di atas kasur (kaki di ujung selatan)
    EAR: { x: -5.2, z: -4.4 }, // titik dengar saat tidur (kepala)
    SNACK_AT: 150, // detik: camilan tengah malam (sekali)
    SNACK_DURATION: 8,
    SNACK_SPOT: { x: 6.4, z: -3.75, yaw: Math.PI }, // depan kulkas
    FLASHLIGHT: { ANGLE_DEG: 35, RANGE: 12, NEAR_RANGE: 2 },
    GLINT: { SUSPICION_PER_SEC: 10, CAP: 80, FACING_DEG: 100 },
    KNEAD_WAKE: 45, // kneading langsung mengisi meter terbangun
    DAWN_DURATION: 5 // detik matahari terbit sebelum layar hasil
  }
};
