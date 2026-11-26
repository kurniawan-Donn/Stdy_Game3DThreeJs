# Meong Mayhem — Game Design Document

> Dokumen ini adalah acuan desain gameplay. Baca sebelum mengerjakan fitur gameplay.
> Jika implementasi perlu menyimpang dari dokumen ini, tanyakan dulu.
>
> Semua angka di dokumen ini adalah **nilai awal** dan akan disetel ulang lewat playtest. Sumber kebenaran angkanya adalah `js/config.js`. Satuan jarak: 1 unit dunia = 1 meter.

## 1. Konsep

Seekor kucing ditinggal di rumah bersama pemiliknya yang sedang bekerja dari rumah. Pemain mengumpulkan **poin Chaos** dengan berbuat nakal sebelum waktu habis, **tanpa dipergoki pemilik**.

Genre: stealth-chaos, sudut pandang orang ketiga, 3D low-poly.

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

### Gerak, lompat, dan suara langkah

| Mode | Kecepatan | Radius suara langkah | Profil |
|---|---|---|---|
| Jalan | 6 m/s | 1 m | normal (1,0) |
| Lari (`Shift`) | 9,5 m/s | 5 m | normal (1,0) |
| Mengendap (`C`) | 2,8 m/s | 0 (senyap) | rendah (0,5) |

- **Lompat biasa:** gratis, puncak sekitar 1 m. Cukup untuk naik ke meja, dudukan sofa, kursi, rak rendah, dan kabinet TV.
- **Lompat tinggi:** puncak sekitar 1,4 m, biaya stamina (bagian 6).
- **Mendarat** dari lompatan menimbulkan suara dengan radius 2 m.
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
| Tumpahkan tisu | 15 | 2 m |
| Cakar sofa | 20 | 4 m |
| Injak remote (TV menyala) | 30 | 6 m |
| Jatuhkan gelas sampai pecah | 40 | 10 m |
| Gulingkan pot | 50 | 8 m |
| Curi ikan di dapur | 80 | 3 m |

**Combo:** kenakalan yang dilakukan beruntun, masing-masing dalam jarak **10 detik** dari kenakalan sebelumnya, mendapat bonus **×1,5**.

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

- Cooldown **8 detik**, radius suara **12 m**.
- Pemilik yang mendengar akan **mendatangi titik suara**, dan rasa curiganya naik sedikit. Mengeong tidak langsung memicu "!".
- Jika kucing mengeong **3 kali dalam 30 detik**, pemilik menjadi **jengkel**: rasa curiganya naik lebih cepat.

## 8. Pemilik rumah

### Saat tidak curiga
Pemilik menjalankan **rutinitas waypoint**:

| Kegiatan | Catatan |
|---|---|
| Kerja di laptop | Kegiatan paling lama |
| Ambil minum di dapur | |
| Lihat ke luar jendela | |
| Ke toilet | **Keluar ruangan selama 20 detik** |

### Penglihatan
- Kerucut pandang **70°**, jangkauan **8 m**.
- Jangkauan berkurang jika kucing **mengendap** atau berada di **area gelap**.

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
4. **Setelah fade** → kucing berada di **keranjang**, **nyawa −1**.

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
| **Ikan** | Mengisi stamina +40. Muncul acak di lantai dan di atas perabot. |
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
| Kristal/koin | Diganti **ikan**, yang muncul acak di lantai dan di atas perabot | 5 |
| Power-up magnet | **Dihapus**, digantikan catnip | 5 |
| Robot vacuum melukai kucing | **Tidak melukai lagi**, menjadi kendaraan | 6 |
| Naik level karena mengumpulkan koin | **Dihapus** | 2 |
| Skor | Diganti **Chaos** | 2 |

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
- [ ] Objek kenakalan (tisu, sofa, remote/TV, gelas, pot, ikan dapur) beserta fisika jatuh sederhana
- [ ] Meter Chaos dan combo (bagian 5)
- [ ] Timer level, target Chaos, dan rating bintang (bagian 4)
- [ ] Layar hasil dan tabungan Chaos (bagian 10)
- [ ] HUD baru: Chaos, waktu, nyawa, stamina (rapikan bar stamina sementara dari Fase 1)
- [ ] Hapus skor dan kenaikan level berbasis koin (bagian 13)

### Fase 3 — Pemilik rumah (AI)
- [ ] Model pemilik prosedural dan rutinitas waypoint (bagian 8)
- [ ] Penglihatan: kerucut pandang, jangkauan, line of sight, pengaruh mengendap
- [ ] Pendengaran: mendatangi sumber suara dan meongan, status jengkel
- [ ] Meter curiga dengan ikon "?" dan "!", serta perilaku mengejar

### Fase 4 — Ketahuan & nyawa
- [ ] Sekuens tertangkap: slow motion, desaturasi, vignette, teks "KETAHUAN!", fade hitam
- [ ] Respawn di keranjang, nyawa −1, total 3 nyawa
- [ ] Level gagal saat nyawa habis (50% Chaos ke tabungan)

### Fase 5 — Sembunyi & camilan
- [ ] Kardus (ketahuan jika bergerak saat dilihat)
- [ ] Area gelap yang mengurangi jangkauan pandang pemilik
- [ ] Ikan menggantikan kristal; catnip (zoomies 6 detik) menggantikan magnet
- [ ] Tidur di sinar matahari untuk memulihkan stamina

### Fase 6 — Hal lucu
- [ ] Robot vacuum tidak melukai dan bisa ditunggangi
- [ ] Animasi mendorong gelas sambil menatap kamera
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
