// Level 3 — Sore Hujan: cahaya sore kelabu-jingga, lebih banyak area gelap,
// petir (kilat menyingkap, guntur menutupi suara), dan jejak kaki basah.
export default {
  key: 'sore-hujan',
  name: 'Sore Hujan',
  description: 'Hujan deras dan petir. Kilat menyingkap, guntur menutupi suara. Awas jejak kaki basah!',
  DURATION: 270, // 4,5 menit
  MUSIC_CALM: 0.3, // musik latar lebih pelan (hujan)
  TARGET_CHAOS: 450,
  LIGHTING: {
    sun: { intensity: 0.22, color: 0xc98f6a }, // sore kelabu-jingga redup (mendung)
    hemi: { intensity: 0.2 },
    points: {
      lamp: { intensity: 1.0 }, // lampu berdiri menyala hangat
      living: { intensity: 0.18 },
      kitchen: { intensity: 0.42 },
      study: { intensity: 0.55 }
    }
  },
  ACTIVE_MISCHIEF: null,
  LAYOUT: {
    // Area gelap tambahan: ruang tamu sisi timur (TV & meja kopi) dan ruang makan
    EXTRA_DARK_ZONES: [
      { x: 2.0, z: 2.35, width: 3.0, depth: 5.3 },
      { x: 5.25, z: 2.35, width: 3.5, depth: 5.3 }
    ]
  },
  OWNER: {
    OWNER_ROUTINE: {
      // "Buat teh" menggantikan "ambil minum"
      ACTIVITIES: [
        { id: 'tea', weight: 30, duration: 12 },
        { id: 'window', weight: 25, duration: 10 },
        { id: 'bedroom', weight: 25, duration: 8 },
        { id: 'toilet', weight: 20, maxPerLevel: 1 }
      ]
    }
  },
  MEETINGS: null,
  WEATHER: {
    LIGHTNING_INTERVAL: [25, 45], // detik antar-kilat (acak)
    FLASH_DURATION: 0.4,
    THUNDER_DELAY: [1, 2], // detik dari kilat ke guntur
    THUNDER_MUTE: 2.5, // selama guntur semua suara kucing diabaikan
    RAIN_MASK_RADIUS: 3, // suara lebih kecil dari ini tertutup hujan
    PUDDLE: { x: -6.5, z: 1.3, RADIUS: 0.45, FIXED_RADIUS: 0.2 }, // genangan di bawah jendela bocor
    WINDOW_FIX_AFTER: 60, // kegiatan pertama setelah detik ini: tutup jendela & taruh ember
    WINDOW_FIX_DURATION: 5,
    FOOTPRINT: {
      WET_TIME: 15, // detik meninggalkan jejak setelah menginjak genangan
      FADE_TIME: 60, // jejak memudar dalam
      FRESH_TIME: 20, // jejak "segar" (memancing pemilik)
      SUSPICION: 20,
      FURNITURE: ['sofa', 'bed', 'coffeeTable', 'diningTable', 'workDesk'] // Chaos +5, sekali per perabot
    }
  }
};
