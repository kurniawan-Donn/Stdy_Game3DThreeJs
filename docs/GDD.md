# Meong Mayhem — Game Design Document

> Dokumen ini adalah acuan desain gameplay. Baca sebelum mengerjakan fitur gameplay.
> Jika implementasi perlu menyimpang dari dokumen ini, tanyakan dulu.

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
| `Spasi` | Lompat | |
| `Shift` | Lari | Cepat tapi **berisik** |
| `C` | Mengendap | **Senyap**, profil rendah (lebih sulit terlihat) |
| `E` | Interaksi | Dorong/jatuhkan barang, masuk kardus, dll. |
| `Q` | Mengeong | Memancing pemilik datang (pengalih) |

## 4. Ketahuan

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

## 5. Camilan

| Camilan | Efek |
|---|---|
| **Ikan** | Mengisi stamina |
| **Catnip** (langka) | Mode **zoomies** selama 6 detik: kucing sangat cepat dan senyap |

## 6. Hal lucu (fitur karakter)

- **Menunggangi robot vacuum:** senyap, tapi arahnya tidak bisa dikontrol.
- **Kardus untuk sembunyi:** kucing aman di dalamnya, tapi **ketahuan jika bergerak saat sedang dilihat**.
- **Mendorong gelas pelan sambil menatap kamera:** animasi khusus saat menjatuhkan gelas.
- **Loaf pose:** otomatis saat kucing diam selama 5 detik.
- **Tidur di sinar matahari:** memulihkan stamina.
- **Bola benang:** bisa ditendang sebagai pengalih perhatian pemilik.

## 7. Lobi (dikerjakan nanti)

- Ruangan nyaman dengan **preview kucing yang berputar**.
- **Pilih kucing:** oranye, hitam, putih, abu-abu, calico, tabby. Semua dibuat secara prosedural.
- **Aksesoris:** lonceng, dasi kupu-kupu, topi, syal.
- **Menu:**
  - Main
  - Pilih Level
  - Kustomisasi
  - Pengaturan: kualitas grafis, volume, sensitivitas
  - Cara Bermain
- **Unlock** kucing dan aksesoris dengan poin Chaos. Progres disimpan di `localStorage`.
- Semua item bersifat **kosmetik**, dengan dua pengecualian:
  - **Lonceng:** Chaos yang didapat lebih besar, tapi langkah kucing berbunyi.
  - **Kucing hitam:** lebih sulit terlihat di area gelap.

## 8. Tutorial

- **Level latihan** yang otomatis dimulai saat pertama kali main.
- Langkah bertahap:
  1. Gerak
  2. Lompat
  3. Naik ke meja
  4. Jatuhkan gelas
  5. Sembunyi di kardus
  6. Ditangkap sekali **tanpa kehilangan nyawa**
- Tutorial **bisa dilewati** dan **bisa diulang** (dari menu).

## 9. Prinsip teknis

- **Tanpa aset eksternal.** Semua model, tekstur, dan suara dibuat secara prosedural (bentuk dasar Three.js, Canvas, Web Audio).
- **Ringan** dan lancar di laptop biasa.
- **Semua angka penyetelan ada di `js/config.js`.**

## 10. Pertanyaan terbuka

Hal-hal berikut belum ditentukan oleh desain ini. Putuskan bersama sebelum diimplementasikan:

- Durasi tiap level dan besar target Chaos per level.
- Nilai Chaos untuk tiap jenis kenakalan, serta seberapa keras suara yang ditimbulkan.
- Mekanik stamina: apa saja yang menguranginya (lari? lompat?) dan apa akibatnya jika habis.
- Cooldown mengeong (`Q`) dan seberapa jauh suaranya terdengar.
- Perilaku pemilik saat tidak curiga: diam bekerja di meja, berpatroli, atau keduanya.
- Fitur prototipe yang sudah ada (kristal, power-up magnet, robot vacuum sebagai rintangan yang melukai): dihapus, dipertahankan, atau diubah fungsinya.
- Apa yang terjadi saat nyawa habis atau waktu habis sebelum target tercapai.

## 11. Peta pengembangan

### Fase 0 — Fondasi
- [x] Pecah kode menjadi ES modules (`core`, `world`, `entities`, `systems`, `ui`)
- [x] Kumpulkan angka penyetelan di `config.js`
- [x] Tulis CLAUDE.md dan GDD

### Fase 1 — Kontrol kucing lengkap
- [ ] Lari (`Shift`) dan mengendap (`C`) dengan kecepatan serta tinggi profil berbeda
- [ ] Sistem stamina
- [ ] Tombol interaksi (`E`) dengan penanda objek terdekat
- [ ] Mengeong (`Q`)
- [ ] Sistem suara: setiap aksi memancarkan "noise" dengan radius tertentu

### Fase 2 — Kenakalan & Chaos
- [ ] Objek yang bisa diganggu (gelas, barang di rak, dll.) beserta fisika jatuh sederhana
- [ ] Meter Chaos, timer level, dan target Chaos
- [ ] Kondisi menang dan kalah level
- [ ] HUD baru: Chaos, waktu, nyawa, stamina

### Fase 3 — Pemilik rumah (AI)
- [ ] Model pemilik prosedural dan perilaku dasar (bekerja/patroli)
- [ ] Penglihatan: jarak, kerucut pandang, line of sight, pengaruh profil rendah
- [ ] Pendengaran: memeriksa sumber suara
- [ ] Meter curiga dengan ikon "?" dan "!", serta perilaku mengejar

### Fase 4 — Ketahuan & nyawa
- [ ] Sekuens tertangkap: slow motion, desaturasi, vignette, teks "KETAHUAN!", fade hitam
- [ ] Respawn di keranjang, nyawa −1, total 3 nyawa
- [ ] Layar game over

### Fase 5 — Sembunyi & camilan
- [ ] Kardus (ketahuan jika bergerak saat dilihat)
- [ ] Area gelap yang mengurangi jarak pandang pemilik
- [ ] Ikan (isi stamina) dan catnip (zoomies 6 detik)
- [ ] Tidur di sinar matahari untuk memulihkan stamina

### Fase 6 — Hal lucu
- [ ] Menunggangi robot vacuum
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
- [ ] Unlock dengan poin Chaos dan penyimpanan di `localStorage`

### Fase 9 — Polish & performa
- [ ] Efek suara prosedural untuk semua aksi baru
- [ ] Preset kualitas grafis, volume, dan sensitivitas yang benar-benar diterapkan
- [ ] Uji performa di laptop biasa dan optimasi
- [ ] Penyeimbangan angka di `config.js` dan uji main menyeluruh
