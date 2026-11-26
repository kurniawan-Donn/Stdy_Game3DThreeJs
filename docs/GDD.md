# Meong Mayhem — Game Design Document

> Dokumen ini adalah acuan desain gameplay. Baca sebelum mengerjakan fitur gameplay.
> Jika implementasi perlu menyimpang dari dokumen ini, tanyakan dulu.
>
> Semua angka di dokumen ini adalah **nilai awal** dan akan disetel ulang lewat playtest. Sumber kebenaran angkanya adalah `js/config.js`. Satuan jarak: 1 unit dunia = 1 meter, dengan **skala dunia nyata** (lihat bagian 1a).

## 1. Konsep

Seekor kucing ditinggal di rumah bersama pemiliknya yang sedang bekerja dari rumah. Pemain mengumpulkan **poin Chaos** dengan berbuat nakal sebelum waktu habis, **tanpa dipergoki pemilik**.

Genre: stealth-chaos, sudut pandang orang ketiga, 3D low-poly.

## 1a. Skala dunia

Semua benda memakai ukuran nyata (tabel `REAL_SCALE` di `config.js`):

| Benda | Ukuran (m) |
|---|---|
| Kucing | tinggi bahu 0,25 · sampai telinga 0,35 · badan 0,45 · ekor 0,30 |
| Pemilik | tinggi 1,70 |
| Sofa | dudukan 0,45 · sandaran 0,85 · dalam 0,9 · lebar 2,0 |
| Meja kopi / meja kerja / kursi | 0,45 / 0,75 / 0,45 (dudukan) |
| Konter dapur / kulkas | 0,90 / 1,80 |
| Rak TV / rak buku | 0,50 / 1,80 (lebar 0,8, dalam 0,3) |
| Rak rendah (batu loncatan ke rak buku) | 0,90 |
| Robot vacuum | Ø 0,34 × 0,09 |
| Gelas / pot / kardus | 0,12 / 0,40 / 0,40–0,50 |
| Pintu / plafon | 2,0 × 0,85 / 2,7 |

Ruang tamu berukuran **8,8 × 8 m** (tata letak prototipe 22 × 20 m dikali `WORLD_SCALE` 0,4), sehingga waktu tempuh kucing antar-objek terasa sama seperti sebelum skala diperbaiki. Kecepatan dan jarak persepsi ikut disesuaikan dengan perbandingan yang sama.

## 2. Loop inti

```
pilih misi kenakalan → menyelinap → lakukan kenakalan → kabur & sembunyi → (ulang) → capai target Chaos → menang level
```

- **Pilih misi kenakalan:** tentukan target, misalnya gelas di meja atau barang di rak.
- **Menyelinap:** dekati target tanpa terlihat pemilik.
- **Lakukan kenakalan:** Chaos bertambah, tapi aksi ini **menimbulkan suara** yang bisa menarik perhatian pemilik.
- **Kabur & sembunyi:** jauhi lokasi kejadian sebelum pemilik datang memeriksa.
- **Menang level:** capai target Chaos sebelum waktu habis.

## 3. Kontrol

| Tombol | Aksi | Catatan |
|---|---|---|
| `W` `A` `S` `D` | Gerak | Relatif terhadap kamera |
| `Spasi` | Lompat biasa | Gratis |
| `Shift` + `Spasi` | Lompat tinggi | Memakai stamina |
| `Shift` (tahan) | Lari | Cepat tapi **berisik**, menguras stamina |
| `C` (tahan) | Mengendap | **Senyap**, profil rendah (lebih sulit terlihat) |
| `E` | Interaksi | Dorong/jatuhkan barang, masuk kardus, dll. |
| `Q` | Mengeong | Memancing pemilik datang (pengalih) |
| Mouse | Putar kamera | Klik layar mengunci mouse (`Esc` melepas); tanpa kunci: tahan klik kiri + geser |
| Roda mouse | Zoom kamera | 1,0–4,0 m |
| `H` | Bantuan | Daftar kontrol; muncul otomatis 10 detik saat game pertama dibuka |

### Kamera
- Orbit third-person mengelilingi kucing: yaw bebas 360°, pitch 5°–65°. Gerak `WASD` selalu relatif terhadap arah kamera.
- Jika mouse diam 3 detik saat kucing berjalan, kamera pelan-pelan kembali ke belakang kucing (kecuali kucing berjalan ke arah kamera).
- Kamera tidak pernah menembus dinding atau plafon: lengannya memendek, lalu memanjang lagi pelan. Perabot yang menghalangi pandangan ke kucing menjadi semi-transparan sementara.
- Saat **KETAHUAN**, kamera berputar ke samping agar pemilik dan kucing terlihat bersama, lalu kembali ke belakang kucing setelah respawn.

### Gerak, lompat, dan suara langkah

| Mode | Kecepatan | Radius suara langkah | Profil |
|---|---|---|---|
| Jalan | 2,5 m/s | 0,4 m | normal (1,0) |
| Lari (`Shift`) | 4,0 m/s | 2 m | normal (1,0) |
| Mengendap (`C`) | 1,2 m/s | 0 (senyap) | rendah (0,5) |

- **Lompat biasa:** gratis, puncak sekitar 0,58 m. Cukup untuk dudukan sofa, meja kopi, kursi, dan rak TV.
- **Lompat tinggi:** puncak sekitar 1,0 m, biaya stamina (bagian 6). Cukup untuk sandaran sofa, konter dapur, meja kerja, dan rak rendah.
- **Tempat tinggi** (atas kulkas dan rak buku, 1,8 m) hanya bisa dicapai bertahap: konter → kulkas, rak rendah → rak buku.
- Tanpa input di udara kucing cepat mengerem, dan ada toleransi kecil saat mendarat di tepi sempit (sandaran sofa, atas rak), sehingga lompatan pendek bisa presisi.
- **Mendarat** dari lompatan menimbulkan suara dengan radius 0,8 m.
- Aturan mode:
  - Jika `Shift` dan `C` ditahan bersamaan, mengendap yang berlaku.
  - Mengendap hanya berlaku di tanah. Melompat membatalkan mengendap.
  - Lari butuh stamina dan tidak bisa dilakukan saat terengah.

## 4. Level & penilaian

| Level | Durasi | Target Chaos |
|---|---|---|
| 1 | 4 menit | 300 |

**Rating bintang** (dihitung dari target Chaos):

| Bintang | Syarat |
|---|---|
| ★ | Chaos ≥ 100% target |
| ★★ | Chaos ≥ 150% target |
| ★★★ | Chaos ≥ 200% target |

## 5. Kenakalan & Chaos

Setiap kenakalan memberi Chaos dan memancarkan suara dengan radius tertentu. Pemilik yang berada di dalam radius suara akan mendengarnya.

| Kenakalan | Chaos | Radius suara |
|---|---|---|
| Tumpahkan tisu | 15 | 0,8 m |
| Cakar sofa | 20 | 1,6 m |
| Injak remote (TV menyala) | 30 | 2,4 m |
| Jatuhkan gelas sampai pecah | 40 | 4 m |
| Gulingkan pot | 50 | 3,2 m |
| Curi ikan di dapur | 80 | 1,2 m |

Radius suara berskala 0,4 terhadap nilai awal (2/4/6/10/8/3 m) mengikuti skala ruangan.

**Combo:** kenakalan yang dilakukan beruntun, masing-masing dalam jarak **10 detik** dari kenakalan sebelumnya, mendapat bonus **×1,5**. Hasilnya dibulatkan (mis. tisu 15 × 1,5 = 23).

### Aturan kenakalan
- Setiap **objek** hanya bisa dipakai **sekali per level**. Setelah itu tampilannya berubah: gelas pecah, tisu berserakan, sofa tercakar, TV menyala, pot terguling, piring kosong.
- Gelas, tisu, remote, dan ikan dapur hanya bisa dilakukan jika kucing **berdiri di permukaan yang sama** dengan objeknya. Cakar dan pot dilakukan dari lantai.
- Noise **remote** dipancarkan dari **TV**, bukan dari remote.
- Chaos gelas diberikan saat gelas **pecah**, bukan saat didorong.

### Objek per level (level 1)

| Kenakalan | Jumlah | Lokasi | Total Chaos dasar |
|---|---|---|---|
| Gelas | 4 | meja kopi, rak TV, rak rendah, konter dapur | 160 |
| Pot | 2 | tanaman di dinding barat (selatan jendela) dan sudut tenggara | 100 |
| Ikan dapur | 1 | konter dapur | 80 |
| Cakar | 2 | sofa, kursi | 40 |
| Tisu | 2 | meja kopi, rak rendah | 30 |
| Remote | 1 | dudukan sofa | 30 |
| **Total** | **12** | | **440** (maks. ±660 dengan combo) |

**Pojok dapur:** konter dapur (bisa dinaiki dengan lompat tinggi) dan kulkas (tempat tinggi, dari konter) di sudut barat laut ruangan, menghadap kamera. Tempat ini juga menjadi waypoint "ambil minum" pemilik di Fase 3.

### Animasi khas
- **Gelas:** kucing mendorong gelas pelan dengan kaki depan, menoleh ke kamera sebentar, lalu gelas meluncur jatuh dan pecah. Pecahan berhamburan, mulai memudar setelah 3 detik, dan kamera bergetar kecil.
- **Cakar:** kucing berdiri dan mencakar bergantian dengan kedua kaki depan, serpihan kain beterbangan.
- **Tisu, pot:** kaki depan menepuk. **Remote:** kucing menginjak. **Ikan dapur:** kucing menggigit lalu membawa ikan di mulut sebentar.

### Umpan balik
- Angka "+N" melayang dari objek. Jika combo, muncul juga "COMBO x1.5".
- Chaos Meter di HUD dengan rentang 0–200% target, garis target di 100%, dan tanda bintang di 100%, 150%, dan 200% yang menyala saat tercapai.
- HUD menampilkan sisa waktu jendela combo.

## 6. Stamina

| Parameter | Nilai |
|---|---|
| Stamina maksimal | 100 |
| Lari | −20 per detik |
| Lompat tinggi | −15 per lompatan |
| Pulih saat jalan/diam | +10 per detik |
| Pulih saat tidur di sinar matahari | +25 per detik |
| Makan ikan | +40 |

**Stamina habis:** kucing terengah selama **2 detik**. Selama terengah, kucing hanya bisa berjalan (tidak bisa lari) dan tidak bisa lompat tinggi.

- Stamina pulih saat jalan, diam, dan mengendap. Stamina tidak pulih saat lari atau di udara.
- Lompat tinggi hanya bisa dilakukan jika stamina tersisa minimal sebesar biayanya. Jika kurang, `Shift` + `Spasi` menjadi lompat biasa.

## 7. Mengeong

- Cooldown **8 detik**, radius suara **4,8 m**.
- Pemilik yang mendengar akan **mendatangi titik suara**, dan rasa curiganya naik sedikit. Mengeong tidak langsung memicu "!".
- Jika kucing mengeong **3 kali dalam 30 detik**, pemilik menjadi **jengkel**: rasa curiganya naik lebih cepat.

## 8. Pemilik rumah

### Saat tidak curiga
Pemilik menjalankan **rutinitas waypoint** (jalan santai 1,1 m/s):

| Kegiatan | Catatan |
|---|---|
| Kerja di laptop | Kegiatan paling lama: 35–55 detik di meja kerja (dinding utara), duduk membelakangi ruangan. Setiap 12–20 detik **menoleh ke belakang** 2,5 detik; kadang meregang 4 detik |
| Ambil minum di dapur | 8 detik (peluang 40%) |
| Lihat ke luar jendela | 10 detik (peluang 35%) |
| Ke toilet | Peluang 25%, **maksimal sekali per level**. Jalan ke pintu di dinding timur, pintu terbuka, **keluar ruangan selama 20 detik**, lalu kembali (bunyi siraman) |

Setelah sesi kerja, pemilik memilih satu kegiatan secara acak berbobot, lalu kembali bekerja. Selama di toilet, pemilik tidak melihat dan tidak mendengar apa pun.

Pemilik berjalan memakai grid navigasi (A* + penghalusan jalur) dan tidak menembus perabot. Tubuh pemilik dan robot vacuum menghalangi kucing.

### Penglihatan
- Kerucut pandang **70°**, jangkauan **3,2 m**, diukur dari mata (1,6 m berdiri, 1,2 m duduk) ke arah kepala menoleh.
- Kucing hanya terlihat jika ada **line-of-sight** ke titik tubuhnya (kepala 0,28 m, punggung 0,23 m, pantat 0,20 m). Kucing kecil mudah tertutup meja kopi, sofa, dan perabot lain. Perabot menghalangi pandangan; lampu berdiri dan tanaman tidak. Perabot yang sedang dipijak kucing tidak menutupi kucing itu sendiri.
- Pengubah jangkauan: **mengendap ×0,5**, **area gelap ×0,7**.
- **Jarak < 0,6 m:** selalu terlihat, kecuali line-of-sight terhalang total.
- **Area gelap** (sementara; visual lengkap di Fase 5): di belakang sofa dan di sudut timur laut dekat rak tinggi, ditandai bayangan gelap di lantai.

### Pendengaran
- Pemilik mendengar suara (`emitNoise`) jika berada di dalam radiusnya.
- Kenakalan: curiga **+ radius × 10** (gelas 4 m → +40), lalu pergi **menyelidiki** titik suara.
- Langkah & mendarat: curiga **+ radius × 10 × 0,15**; pemilik hanya menoleh (CURIGA).
- Meong: curiga **+15**, lalu menyelidiki.
- Suara saja **tidak bisa melebihi 80**, jadi tidak pernah langsung memicu "!".
- **Jengkel** (meong 3× dalam 30 detik): semua kenaikan curiga ×1,5.

### Meter curiga & state
| State | Ikon | Perilaku |
|---|---|---|
| RUTINITAS | – | Menjalankan rutinitas |
| CURIGA | ? | Berhenti dan menatap 1,5 detik. Meter ≥ 40 → menyelidiki; meter 0 → kembali rutinitas |
| MENYELIDIKI | ? | Berjalan (1,5 m/s) ke titik terakhir, menoleh ke sekeliling 3 detik |
| MENGEJAR | ! | Berlari 3,15 m/s (lebih cepat dari kucing jalan 2,5, lebih lambat dari lari 4,0). Kehilangan jejak 5 detik → rutinitas (meter 30) |

- Meter 0–100. Naik saat kucing terlihat: **60/detik** di ≤ 0,8 m, turun linear sampai **15/detik** di jangkauan maksimum, dikali visibilitas. Turun **8/detik** saat tidak melihat apa-apa. Penuh (100) → "!".
- **Kepergok sedang berbuat nakal** = meter langsung 100 ("!").
- **Meraih:** jarak horizontal ≤ 0,9 m (badan + lengan) dan kaki kucing ≤ 1,2 m dari lantai (lantai, meja, sofa termasuk sandarannya, konter, meja kerja).
- **Tempat tinggi (> 1,2 m):** atas kulkas (1,8 m, dari konter) dan atas rak buku (1,8 m, dari rak rendah), dicapai dengan `Shift` + `Spasi`. Pemilik menunggu di bawah **4 detik**, lalu menyerah.

## 9. Ketahuan

Urutan saat kucing terlihat pemilik:

1. **Pemilik melihat kucing** → muncul ikon **"?"** di atas pemilik dan **meter curiga** mulai terisi.
2. **Meter curiga penuh** → ikon berubah menjadi **"!"** dan pemilik **mengejar** kucing.
3. **Tertangkap** → sekuens tangkapan:
   - slow motion
   - layar mengalami desaturasi
   - vignette gelap
   - teks **"KETAHUAN!"**
   - fade ke hitam
4. **Setelah fade** → kucing berada di **keranjang** (sudut barat daya), **nyawa −1**, pemilik kembali ke rutinitas dengan meter 0, dan kucing **kebal 3 detik** (berkedip).

Detail: slow motion **0,3×** selama 1,6 detik nyata, desaturasi bertahap 1 detik, teks dengan efek dentum, bunyi dentum, getaran kamera, pemilik mengangkat kucing. Fade keluar 0,6 detik, hitam 0,5 detik, fade masuk 0,6 detik. Efek layar memakai CSS (filter + overlay), bukan post-processing.

Total **3 nyawa**.

## 10. Akhir level

- **Waktu habis:** pemilik selesai bekerja, lalu muncul **layar hasil**.
  - Chaos ≥ target → **menang**, beserta rating bintang.
  - Chaos < target → **kalah**, dengan pesan lucu *"Rumah masih terlalu rapi..."*
  - Dalam kedua kasus, **seluruh Chaos masuk tabungan** untuk lobi.
- **Nyawa habis sebelum waktu habis:** level gagal, dan hanya **50% Chaos** yang masuk tabungan.

## 11. Camilan

| Camilan | Efek |
|---|---|
| **Ikan** | Mengisi stamina +40. Muncul acak di lantai dan di atas perabot, satu ekor dalam satu waktu. Dimakan otomatis saat disentuh, lalu muncul lagi 12 detik kemudian. |
| **Catnip** (langka) | Mode **zoomies** selama 6 detik: kucing sangat cepat dan senyap |

## 12. Hal lucu (fitur karakter)

- **Menunggangi robot vacuum:** senyap, tapi arahnya tidak bisa dikontrol. Robot vacuum **tidak melukai** kucing.
- **Kardus untuk sembunyi:** kucing aman di dalamnya, tapi **ketahuan jika bergerak saat sedang dilihat**.
- **Mendorong gelas pelan sambil menatap kamera:** animasi khusus saat menjatuhkan gelas.
- **Loaf pose:** otomatis saat kucing diam selama 5 detik.
- **Tidur di sinar matahari:** memulihkan stamina (lihat bagian 6).
- **Bola benang:** bisa ditendang sebagai pengalih perhatian pemilik.

## 13. Transisi dari prototipe

Fitur dari prototipe *Coin Rush 3D* diubah sebagai berikut. Perubahan ini dikerjakan di fase yang relevan, tidak sekaligus.

| Fitur prototipe | Nasib | Fase |
|---|---|---|
| Kristal/koin | Diganti **ikan**, yang muncul acak di lantai dan di atas perabot | 2 ✅ |
| Power-up magnet | **Dinonaktifkan** di Fase 2, kodenya **dihapus** di Fase 3. Catnip menyusul di Fase 5 | 2 ✅ / 3 ✅ |
| Robot vacuum melukai kucing | **Tidak melukai lagi** (Fase 3), hanya menghalangi. Menjadi kendaraan di Fase 6 | 3 ✅ / 6 |
| Naik level karena mengumpulkan koin | **Dihapus** (jumlah dan kecepatan robot tetap) | 2 ✅ |
| Skor & high score | Diganti **Chaos** dan tabungan Chaos | 2 ✅ |

## 14. Lobi (dikerjakan nanti)

- Ruangan nyaman dengan **preview kucing yang berputar**.
- **Pilih kucing:** oranye, hitam, putih, abu-abu, calico, tabby. Semua dibuat secara prosedural.
- **Aksesoris:** lonceng, dasi kupu-kupu, topi, syal.
- **Menu:**
  - Main
  - Pilih Level
  - Kustomisasi
  - Pengaturan: kualitas grafis, volume, sensitivitas
  - Cara Bermain
- **Unlock** kucing dan aksesoris memakai tabungan Chaos (lihat bagian 10). Progres disimpan di `localStorage`.
- Semua item bersifat **kosmetik**, dengan dua pengecualian:
  - **Lonceng:** Chaos yang didapat lebih besar, tapi langkah kucing berbunyi.
  - **Kucing hitam:** lebih sulit terlihat di area gelap.

## 15. Tutorial

- **Level latihan** yang otomatis dimulai saat pertama kali main.
- Langkah bertahap:
  1. Gerak
  2. Lompat
  3. Naik ke meja
  4. Jatuhkan gelas
  5. Sembunyi di kardus
  6. Ditangkap sekali **tanpa kehilangan nyawa**
- Tutorial **bisa dilewati** dan **bisa diulang** (dari menu).

## 16. Prinsip teknis

- **Tanpa aset eksternal.** Semua model, tekstur, dan suara dibuat secara prosedural (bentuk dasar Three.js, Canvas, Web Audio).
- **Ringan** dan lancar di laptop biasa.
- **Semua angka penyetelan ada di `js/config.js`.**

## 17. Pertanyaan terbuka

Belum ada. Tambahkan di sini jika muncul keputusan desain yang belum ditentukan.

## 18. Peta pengembangan

### Fase 0 — Fondasi
- [x] Pecah kode menjadi ES modules (`core`, `world`, `entities`, `systems`, `ui`)
- [x] Kumpulkan angka penyetelan di `config.js`
- [x] Tulis CLAUDE.md dan GDD

### Fase 1 — Kontrol kucing lengkap
- [x] Lari (`Shift`) dan mengendap (`C`) dengan kecepatan serta tinggi profil berbeda
- [x] Lompat biasa dan lompat tinggi (`Shift` + `Spasi`)
- [x] Sistem stamina (bagian 6), dengan bar stamina sementara di HUD
- [x] Tombol interaksi (`E`) dengan penanda objek terdekat (kerangka; objek nyata di Fase 2)
- [x] Mengeong (`Q`) dengan cooldown (bagian 7)
- [x] Sistem suara: setiap aksi memancarkan "noise" dengan radius tertentu
- [x] Overlay debug developer (`F3`): radius noise, jangkauan interaksi, status kucing

### Fase 2 — Kenakalan & Chaos
- [x] Objek kenakalan (tisu, sofa/kursi, remote/TV, gelas, pot, ikan dapur), sekali per objek per level, dengan tampilan berubah setelahnya
- [x] Fisika benda sederhana buatan sendiri (gravitasi, pantulan kecil, gesekan) dan pecahan gelas yang memudar
- [x] Animasi khas mendorong gelas sambil menatap kamera (dimajukan dari Fase 6)
- [x] Pojok dapur (meja dapur + kulkas)
- [x] Meter Chaos dan combo (bagian 5), angka melayang, teks COMBO, getaran kamera
- [x] Timer level, target Chaos, dan rating bintang (bagian 4)
- [x] Layar hasil dan tabungan Chaos di `localStorage` (bagian 10)
- [x] HUD baru: level, waktu, Chaos Meter, combo, nyawa, stamina, meong
- [x] Hapus skor dan kenaikan level berbasis koin (bagian 13)
- [x] Ikan menggantikan kristal; magnet dinonaktifkan (dimajukan dari Fase 5)

### Fase 3 — Pemilik rumah (AI)
- [x] Model pemilik prosedural (~1,7 m) dengan animasi jalan, lari, duduk mengetik, minum, meregang, melihat jendela, menoleh
- [x] Pos kerja (meja, kursi berputar, laptop), pintu ke toilet, keranjang kucing
- [x] Rutinitas waypoint (bagian 8), termasuk toilet 20 detik di luar ruangan
- [x] Grid navigasi + A* + penghalusan jalur
- [x] Penglihatan: kerucut pandang, jangkauan, line of sight, pengaruh mengendap & area gelap
- [x] Pendengaran: mendatangi sumber suara dan meongan, status jengkel
- [x] Meter curiga dengan ikon "?" dan "!", serta perilaku mengejar & menunggu di bawah tempat tinggi
- [x] Robot vacuum tidak melukai; sisa kode magnet dihapus
- [x] Overlay `F3`: kerucut pandang, line-of-sight, jalur A*, state & meter di atas kepala pemilik

### Fase 4 — Ketahuan & nyawa
- [x] Sekuens tertangkap: slow motion, desaturasi, vignette, teks "KETAHUAN!", fade hitam — dikerjakan di Fase 3
- [x] Respawn di keranjang, nyawa −1, total 3 nyawa, kebal 3 detik — dikerjakan di Fase 3
- [x] Level gagal saat nyawa habis (50% Chaos ke tabungan) — dikerjakan di Fase 2

### Fase 5 — Sembunyi & camilan
- [ ] Kardus (ketahuan jika bergerak saat dilihat)
- [ ] Area gelap: visual & pencahayaan yang lebih jelas (efek jangkauan ×0,7 sudah ada sejak Fase 3)
- [ ] Catnip (zoomies 6 detik) menggantikan magnet (kode magnet sudah dihapus di Fase 3)
- [ ] Tidur di sinar matahari untuk memulihkan stamina

### Fase 6 — Hal lucu
- [ ] Robot vacuum bisa ditunggangi (tidak melukai sejak Fase 3)
- [x] Animasi mendorong gelas sambil menatap kamera — dikerjakan di Fase 2
- [ ] Loaf pose setelah diam 5 detik
- [ ] Bola benang yang bisa ditendang sebagai pengalih

### Fase 7 — Level & tutorial
- [ ] Sistem level (layout ruangan, target, durasi) yang didefinisikan sebagai data
- [ ] Beberapa level dengan tingkat kesulitan yang meningkat
- [ ] Tutorial bertahap yang otomatis dimulai saat pertama main, bisa dilewati dan diulang

### Fase 8 — Lobi & kustomisasi
- [ ] Ruang lobi dengan preview kucing berputar
- [ ] Varian kucing prosedural (oranye, hitam, putih, abu-abu, calico, tabby)
- [ ] Aksesoris (lonceng, dasi kupu-kupu, topi, syal), termasuk efek lonceng dan kucing hitam
- [ ] Menu: Main, Pilih Level, Kustomisasi, Pengaturan, Cara Bermain
- [ ] Unlock dengan tabungan Chaos dan penyimpanan di `localStorage`

### Fase 9 — Polish & performa
- [ ] Efek suara prosedural untuk semua aksi baru
- [ ] Preset kualitas grafis, volume, dan sensitivitas yang benar-benar diterapkan
- [ ] Uji performa di laptop biasa dan optimasi
- [ ] Penyeimbangan angka di `config.js` dan uji main menyeluruh
