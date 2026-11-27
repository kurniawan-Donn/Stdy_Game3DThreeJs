// Level 2 — Deadline: pemilik tegang, lebih sering menoleh, dan dua kali
// rapat video. Selama rapat, suara keras = langsung "!" (malu di depan bos).
export default {
  key: 'deadline',
  name: 'Deadline',
  description: 'Pemilik dikejar tenggat: sering menoleh dan dua kali rapat video. Jangan berisik saat rapat!',
  DURATION: 240,
  TARGET_CHAOS: 400,
  STAR_THRESHOLDS: [1, 1.4, 1.75], // Fase 9.2: ★★ 560, ★★★ 700 (★★★ tercapai tanpa kalung lonceng)
  // Pagi mendung: matahari sedikit lebih redup & dingin
  LIGHTING: {
    sun: { intensity: 1.15, color: 0xffeed8 },
    hemi: { intensity: 0.55 }
  },
  ACTIVE_MISCHIEF: null,
  LAYOUT: {},
  // Menimpa nilai config.js selama level ini (dipulihkan saat ganti level)
  OWNER: {
    OWNER_ROUTINE: {
      GLANCE_INTERVAL_MIN: 8, // menoleh tiap 8–12 detik (Level 1: 12–20)
      GLANCE_INTERVAL_MAX: 12
    }
  },
  MEETINGS: {
    START_TIMES: [45, 150], // detik sejak level dimulai
    DURATION: 40,
    LOUD_RADIUS: 3, // suara seradius ini (dan pemilik di dalamnya) = langsung "!"
    MIN_TIME_LEFT: 45 // rapat dilewati jika sisa waktu level kurang dari ini
  }
};
