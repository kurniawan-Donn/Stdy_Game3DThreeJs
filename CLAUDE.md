# CLAUDE.md

Panduan untuk Claude (dan developer) yang bekerja di proyek ini.

## Ringkasan

Game 3D berbasis browser memakai **Three.js r128** (`three@0.128.0`, ES module dari jsDelivr lewat importmap di `index.html`). Tanpa build tool dan tanpa aset eksternal. Semua model dibuat dari bentuk dasar, dan tekstur dibuat secara prosedural dengan Canvas.

## Cara menjalankan

ES modules tidak bisa dibuka lewat `file://`, jadi game harus dijalankan dari server lokal:

```bash
npm start          # = npx serve .  → buka http://localhost:3000
```

Alternatif: `python -m http.server 8000`. Three.js dimuat dari CDN, jadi butuh internet.

## Struktur folder

```
index.html              Canvas, elemen UI (HUD, game over), importmap Three.js
css/style.css           Semua gaya UI
package.json            Script "start" (npx serve)
js/
  main.js               Entry point: membuat objek konteks `ctx`, menjalankan game loop
  config.js             SEMUA angka penyetelan (lihat aturan di bawah)
  core/
    renderer.js         Scene, kamera, WebGLRenderer, resize
    input.js            Status keyboard (input.keys[e.code])
    state.js            State bersama: skor, nyawa, level, timer (createState/resetRunState)
    camera.js           Kamera third-person yang dijepit di dalam ruangan
    audio.js            Efek suara Web Audio (nada dari config.AUDIO)
  world/
    textures.js         Tekstur prosedural (lantai kayu, karpet)
    lighting.js         Lampu hemi, matahari, lampu berdiri, fill
    room.js             Lantai, dinding, plafon, jendela, baseboard
    furniture.js        Perabotan + collider AABB (dari FURNITURE_LAYOUT)
    dust.js             Partikel debu di berkas cahaya jendela
  entities/
    cat.js              Kucing pemain: model, gerak, lompat, animasi
    vacuum.js           Robot vacuum (rintangan) yang berpatroli bolak-balik
    coin.js             Item koleksi + tarikan magnet
    powerup.js          Power-up magnet
    particles.js        Percikan partikel saat item diambil
  systems/
    collision.js        Lingkaran vs AABB, tinggi permukaan, cek posisi bebas
    spawn.js            Cari posisi lantai acak yang aman
    progression.js      Skor, naik level, damage, game over, reset
  ui/
    hud.js              Teks skor, nyawa, level, magnet
    gameOver.js         Modal game over + tombol Main Lagi
```

## Arsitektur

- `main.js` membuat satu objek konteks **`ctx`** yang berisi `scene`, `camera`, `renderer`, `colliders`, `cat`, `coin`, `powerUp`, `obstacles`, `particles`, `dust`, `state`, `input`, `audio`, `hud`, dan `gameOver`. Fungsi update menerima `(ctx, dt)`.
- **Tidak ada variabel global yang bisa diubah.** Dependensi dikirim lewat parameter atau `ctx`. Satu-satunya pengecualian yang diperbolehkan: vektor kerja privat di level modul (misalnya `camTargetPos` di `camera.js`) untuk menghindari alokasi setiap frame.
- Entitas tidak memanggil `systems/progression.js` secara langsung. Mereka mengembalikan sinyal, misalnya `updateCoin()` mengembalikan `true` saat koin diambil, lalu `main.js` memanggil `onCoinCollected(ctx)`. Pola ini mencegah import melingkar.
- Urutan update per frame (dipertahankan dari versi awal): kucing → koin → power-up → robot vacuum → partikel → debu → kamera → render.
- Urutan `scene.add` di `main.js` mempengaruhi urutan render objek transparan, jadi jangan diacak tanpa alasan.

## Aturan

1. **Angka penyetelan selalu masuk `config.js`.** Ini mencakup kecepatan, gravitasi, tinggi lompat, ukuran ruangan, warna/material, timer, peluang spawn, posisi dan collider perabot, parameter lampu, kamera, partikel, dan suara. Jangan menulis angka seperti ini langsung di modul lain. Pengecualian hanya untuk detail geometri model (ukuran telinga kucing, kaki meja, dsb.) yang tetap di modul pembuatnya.
2. Satu modul, satu tanggung jawab. Entitas baru masuk `js/entities/`, aturan atau logika lintas entitas masuk `js/systems/`.
3. Versi Three.js di-pin di importmap (`three@0.128.0`). Jangan upgrade tanpa diskusi, karena API seperti `outputEncoding` berubah di versi baru.
4. Refactor tidak boleh mengubah perilaku. Setelah perubahan, cek console browser dan mainkan sebentar.

## Konsep game ke depan

Game ini akan dikembangkan menjadi **game stealth-chaos tentang kucing nakal di rumah**:

- Pemain mengendalikan **kucing nakal** yang menyelinap di dalam rumah untuk membuat kekacauan: menjatuhkan barang dari meja/rak, mencakar sofa, dan sebagainya. Kekacauan menghasilkan poin.
- **Pemilik rumah berpatroli** di ruangan dengan rute dan pandangan tertentu. Kalau kucing ketahuan saat berbuat nakal, ada hukumannya. Kucing harus memanfaatkan perabotan (naik ke sofa, rak, bersembunyi) untuk menghindar.
- Sistem yang sudah ada menjadi fondasinya: gerak dan lompat kucing ke atas perabot (`cat.js`, `collision.js`), rintangan yang berpatroli (`vacuum.js` sebagai prototipe perilaku patroli), dan tata letak perabot di `FURNITURE_LAYOUT` (calon titik interaksi dan rute patroli).
- Rencana penempatan: pemilik rumah sebagai entitas baru di `js/entities/owner.js`, logika deteksi atau pandangan di `js/systems/`, dan semua angkanya (kecepatan patroli, jarak pandang, sudut pandang) di `config.js`.
