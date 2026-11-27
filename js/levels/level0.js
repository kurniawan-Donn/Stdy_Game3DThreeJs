// Level 0 — Latihan (tutorial, GDD §15). Tanpa timer & target; langkah-
// langkahnya dijalankan systems/tutorial.js. Tidak menambah tabungan.
export default {
  key: 'latihan',
  name: 'Latihan',
  description: 'Belajar bergerak, melompat, berbuat nakal, bersembunyi, dan rasanya tertangkap. Nyawa tidak berkurang.',
  TUTORIAL: true,
  DURATION: 0, // tanpa timer
  TARGET_CHAOS: 0,
  LIGHTING: {},
  ACTIVE_MISCHIEF: ['glass'], // hanya gelas untuk latihan
  LAYOUT: {},
  // Tanpa robot vacuum agar tidak mengganggu langkah latihan
  OWNER: { VACUUM: { INITIAL_COUNT: 0 } },
  MEETINGS: null,
  // Teks langkah (urutan = urutan latihan). Syarat selesai di systems/tutorial.js.
  STEPS: [
    { id: 'move', title: 'Gerak', text: 'Gerakkan kucing dengan {move} (arahnya mengikuti kamera). Klik layar lalu gerakkan mouse untuk memutar kamera.', touch: { text: 'Geser joystick di kiri layar untuk bergerak (dorong sedikit = mengendap). Geser jari di sisi kanan untuk memutar kamera.' } },
    { id: 'jump', title: 'Lompat', text: 'Tekan {jump} untuk melompat.', touch: { text: 'Ketuk tombol Lompat untuk melompat.' } },
    { id: 'table', title: 'Naik ke meja', text: 'Lompat ke atas meja kopi yang ditandai panah.' },
    { id: 'glass', title: 'Jatuhkan gelas', text: 'Dekati gelas di atas meja, lalu tekan {interact} untuk mendorongnya jatuh. Prang!', touch: { text: 'Dekati gelas di atas meja, lalu ketuk tombol aksi (kanan bawah) untuk mendorongnya jatuh. Prang!' } },
    { id: 'box', title: 'Sembunyi di kardus', text: 'Masuk ke kardus yang ditandai panah ({interact}), lalu diam. Pemilik akan lewat.', touch: { text: 'Masuk ke kardus yang ditandai panah (tombol aksi), lalu diam. Pemilik akan lewat.' }, waitText: 'Diam! Pemilik datang... jangan bergerak.', failText: 'Ketahuan bergerak! Masuk kardus lagi dan jangan bergerak saat pemilik melihat.' },
    { id: 'caught', title: 'Ditangkap sekali', text: 'Pemilik melihatmu! Biarkan dia menangkapmu sekali. Di latihan, nyawa tidak berkurang.' }
  ]
};
