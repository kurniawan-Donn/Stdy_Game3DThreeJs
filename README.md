# 🐱 Meong Mayhem

Game stealth-chaos 3D berbasis browser. Kamu adalah seekor kucing yang ditinggal di rumah bersama pemiliknya yang sedang bekerja dari rumah. Kumpulkan poin **Chaos** dengan berbuat nakal sebelum waktu habis, tanpa dipergoki pemilik.

Ditulis dengan JavaScript ES modules biasa, tanpa build tool dan tanpa aset eksternal: semua model, tekstur, dan suara dibuat secara prosedural.

![Screenshot gameplay](screenshot/Screenshot.png)

> Ganti gambar di atas dengan screenshot game kamu (simpan di folder `screenshot/`).

---

## ✨ Fitur

- 🏠 **Ruang tamu 3D** dengan lantai kayu prosedural, jendela bercahaya matahari, dan pojok dapur
- 🐈 **Kucing low-poly** yang bisa jalan, lari, mengendap, lompat ke atas perabot, dan mengeong
- 😼 **12 objek kenakalan:** dorong gelas sampai pecah (sambil menatap kamera), tumpahkan tisu, cakar sofa, injak remote sampai TV menyala, gulingkan pot, curi ikan di dapur
- 🧱 **Fisika benda buatan sendiri:** benda jatuh dari meja, memantul kecil, pecahan kaca berhamburan
- 🔥 **Chaos & combo:** kenakalan beruntun dalam 10 detik mendapat bonus ×1,5
- ⏱️ **Level berwaktu** dengan target Chaos dan rating bintang ★★★
- 🔊 **Sistem suara gameplay:** setiap aksi menimbulkan suara dengan radius tertentu (dasar untuk pemilik rumah yang mendengar)
- 🐟 **Ikan camilan** untuk mengisi stamina
- 💾 **Tabungan Chaos** tersimpan di browser (untuk lobi & kustomisasi nanti)
- 🎵 **Efek suara prosedural** dengan Web Audio API
- ⚡ **Ringan**: tanpa model eksternal, tanpa post-processing berat

## 🎮 Cara Bermain

| Tombol | Aksi |
|---|---|
| `W` `A` `S` `D` / Panah | Gerak (relatif kamera) |
| `Spasi` | Lompat |
| `Shift` + `Spasi` | Lompat tinggi (pakai stamina) |
| `Shift` (tahan) | Lari: cepat tapi berisik, menguras stamina |
| `C` (tahan) | Mengendap: pelan, senyap, profil rendah |
| `E` | Lakukan kenakalan / interaksi |
| `Q` | Mengeong (cooldown 8 detik) |
| Mouse | Putar kamera (klik layar untuk mengunci mouse, `Esc` untuk melepas; atau tahan klik kiri + geser) |
| Roda mouse | Zoom kamera |
| `H` | Layar bantuan kontrol |

**Aturan:**

1. Dekati objek sampai muncul prompt **E**, lalu tekan `E` untuk berbuat nakal. Beberapa objek (gelas, tisu, remote, ikan dapur) hanya bisa dijangkau dari atas perabot.
2. Setiap objek hanya bisa dipakai **sekali per level**.
3. Lakukan kenakalan beruntun dalam **10 detik** untuk bonus **COMBO ×1,5**.
4. Capai **300 Chaos** dalam **4 menit** untuk menang. ★ = 100%, ★★ = 150%, ★★★ = 200% target.
5. Jangan sampai dipergoki **pemilik rumah**. Ikon **?** berarti curiga, **!** berarti mengejar. Tertangkap = **KETAHUAN!**, kucing dikembalikan ke keranjang dan **nyawa −1** (total 3). Nyawa habis = level gagal, dan hanya 50% Chaos yang masuk tabungan.
6. Makan ikan untuk mengisi stamina.

> Tips: mengendap (`C`) memperpendek jarak pandang pemilik, perabot menghalangi pandangannya, dan pemilik tidak bisa meraihmu di atas kulkas atau rak buku (lompat tinggi bertahap dari konter / rak rendah). Lihat [docs/GDD.md](docs/GDD.md) untuk desain lengkap.

## 🚀 Menjalankan Game

Kode game memakai ES modules, jadi harus dijalankan lewat server lokal (membuka `index.html` langsung dari file tidak akan berjalan).

```bash
git clone https://github.com/USERNAME/coin-rush-3d.git
cd coin-rush-3d
npm start            # = npx serve .
```

Lalu buka `http://localhost:3000`.

Alternatif tanpa Node.js: `python -m http.server 8000`, lalu buka `http://localhost:8000`.

> Three.js dimuat dari CDN, jadi butuh koneksi internet saat pertama kali membuka game.

**Untuk developer:** tekan `F3` di dalam game untuk overlay debug (radius suara, jangkauan interaksi, status kucing).

## 🧰 Teknologi

- [Three.js](https://threejs.org/) r128 untuk rendering 3D
- JavaScript (vanilla, ES modules), HTML, dan CSS
- Tekstur prosedural dengan Canvas API
- Efek suara sintetis dengan Web Audio API
- Fisika benda sederhana buatan sendiri (tanpa library)
- `requestAnimationFrame` dengan delta time agar gerakan stabil di berbagai FPS

## 📁 Struktur Proyek

```
├── index.html        # Canvas, UI, importmap Three.js
├── css/style.css     # Gaya UI
├── docs/GDD.md       # Game Design Document + peta pengembangan
├── js/
│   ├── main.js       # Entry point & game loop
│   ├── config.js     # Semua angka penyetelan
│   ├── core/         # Renderer, input, state, kamera, audio, simpanan
│   ├── world/        # Ruangan, perabotan, lampu, tekstur
│   ├── entities/     # Kucing, ikan, robot vacuum, objek kenakalan
│   ├── systems/      # Tabrakan, fisika, Chaos, level, stamina, suara, interaksi
│   └── ui/           # HUD, layar hasil, teks melayang, overlay debug
├── package.json      # Script "npm start"
├── screenshot/       # Gambar untuk README
└── README.md
```

Detail arsitektur dan aturan pengembangan ada di [CLAUDE.md](CLAUDE.md).

## 🗺️ Roadmap

Ringkasan dari peta pengembangan di [docs/GDD.md](docs/GDD.md):

- [x] Fase 0: Fondasi (ES modules, config, GDD)
- [x] Fase 1: Kontrol kucing lengkap (lari, mengendap, stamina, meong, sistem suara)
- [x] Fase 2: Kenakalan, Chaos, combo, timer level, layar hasil
- [x] Fase 3: Pemilik rumah (AI): rutinitas, penglihatan, pendengaran, curiga
- [x] Fase 4: Ketahuan & nyawa (sekuens tertangkap, keranjang)
- [ ] Fase 5: Sembunyi (kardus, area gelap) & camilan (catnip, tidur di sinar matahari)
- [ ] Fase 6: Hal lucu (tunggangi robot vacuum, loaf pose, bola benang)
- [ ] Fase 7: Level & tutorial
- [ ] Fase 8: Lobi & kustomisasi kucing
- [ ] Fase 9: Polish & performa

## 🤖 Catatan Pengembangan

Proyek ini dibuat sebagai uji coba kemampuan AI coding assistant (Antigravity dengan model Gemini 4 Hydrogen Medium) melalui prompt bertahap: dari prototipe bola sederhana, lalu transformasi menjadi ruangan, karakter kucing, dan perbaikan iteratif. Prototipe awalnya bernama *Coin Rush 3D*.

Pengembangan kemudian dilanjutkan dengan Claude Code: kode dipecah menjadi ES modules, lalu dikembangkan menjadi *Meong Mayhem* mengikuti [GDD](docs/GDD.md).

## 🐞 Masalah Umum

| Masalah | Solusi |
|---|---|
| Layar kosong / hitam | Jalankan lewat server lokal (`npm start`), pastikan internet aktif (Three.js dari CDN), lalu buka Console (`F12`) untuk melihat error |
| Tidak ada suara | Klik atau tekan tombol apa saja di dalam game dulu; browser baru mengizinkan audio setelah ada interaksi |
| FPS rendah | Turunkan pixel ratio atau kualitas shadow di `js/config.js` |
| Kamera terhalang perabotan | Atur offset kamera (`CAMERA`) di `js/config.js` |
| Ingin reset tabungan Chaos | Hapus data situs (localStorage) untuk `localhost` di pengaturan browser |

## 🤝 Kontribusi

Saran dan pull request sangat diterima.

1. Fork repository ini
2. Buat branch fitur: `git checkout -b fitur-baru`
3. Commit perubahan: `git commit -m "Tambah fitur baru"`
4. Push: `git push origin fitur-baru`
5. Buka Pull Request

---

⭐ Kalau suka proyek ini, beri bintang di GitHub!
