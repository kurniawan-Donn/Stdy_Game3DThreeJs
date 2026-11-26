// Level 1 — Senin Pagi: hari kerja biasa. Semua nilai bawaan config.js.
// Format file level dijelaskan di js/levels/index.js.
export default {
  key: 'senin-pagi',
  name: 'Senin Pagi',
  description: 'Hari kerja biasa. Pemilik sibuk di laptop, rumah masih rapi... untuk sekarang.',
  DURATION: 240, // detik
  TARGET_CHAOS: 300,
  LIGHTING: {}, // pakai LIGHTS di config.js
  ACTIVE_MISCHIEF: null, // null = semua jenis di MISCHIEF_LAYOUT
  LAYOUT: {}, // posisi objek bawaan config.js
  OWNER: {}, // perilaku pemilik bawaan
  MEETINGS: null // tidak ada rapat video
};
