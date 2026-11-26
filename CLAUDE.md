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
docs/GDD.md             Game Design Document + peta pengembangan (Fase 0–9)
js/
  main.js               Entry point: membuat objek konteks `ctx`, menjalankan game loop
  config.js             SEMUA angka penyetelan (lihat aturan di bawah)
  core/
    renderer.js         Scene, kamera, WebGLRenderer, resize
    input.js            Keyboard: input.keys (ditahan), input.pressed (baru ditekan frame ini)
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
    noise.js            Event suara gameplay (emitNoise / onNoise) untuk didengar pemilik
    stamina.js          Stamina, lompat tinggi, status terengah
    meow.js             Mengeong (Q): cooldown, noise, riwayat untuk status jengkel
    interaction.js      Interaksi (E): registerInteractable, penanda, prompt
  ui/
    hud.js              Skor, nyawa, level, magnet, stamina, cooldown meong, prompt E
    gameOver.js         Modal game over + tombol Main Lagi
    debugOverlay.js     Overlay developer (F3): ring noise, jangkauan interaksi, status
```

## Arsitektur

- `main.js` membuat satu objek konteks **`ctx`** yang berisi `scene`, `camera`, `renderer`, `colliders`, `cat`, `coin`, `powerUp`, `obstacles`, `particles`, `dust`, `state`, `input`, `audio`, `hud`, dan `gameOver`. Fungsi update menerima `(ctx, dt)`.
- **Tidak ada variabel global yang bisa diubah.** Dependensi dikirim lewat parameter atau `ctx`. Satu-satunya pengecualian yang diperbolehkan: vektor kerja privat di level modul (misalnya `camTargetPos` di `camera.js`) untuk menghindari alokasi setiap frame.
- Entitas tidak memanggil `systems/progression.js` secara langsung. Mereka mengembalikan sinyal, misalnya `updateCoin()` mengembalikan `true` saat koin diambil, lalu `main.js` memanggil `onCoinCollected(ctx)`. Pola ini mencegah import melingkar.
- Urutan update per frame: kucing → meong → interaksi → koin → power-up → robot vacuum → noise → HUD, lalu (juga saat game over) partikel → debu → overlay debug → kamera → render → `endFrame(input)`.
- Aksi yang berisik memanggil `emitNoise(ctx, { x, z, radius, source })`. Sistem yang perlu "mendengar" mendaftar lewat `onNoise(ctx.noise, fn)`.
- Objek interaktif didaftarkan lewat `registerInteractable(ctx.interaction, item)` (lihat komentar di `interaction.js`).
- Tekan `F3` di game untuk overlay debug. Pakai overlay ini untuk memeriksa radius noise dan jangkauan interaksi.
- Urutan `scene.add` di `main.js` mempengaruhi urutan render objek transparan, jadi jangan diacak tanpa alasan.

## Aturan

1. **Angka penyetelan selalu masuk `config.js`.** Ini mencakup kecepatan, gravitasi, tinggi lompat, ukuran ruangan, warna/material, timer, peluang spawn, posisi dan collider perabot, parameter lampu, kamera, partikel, dan suara. Jangan menulis angka seperti ini langsung di modul lain. Pengecualian hanya untuk detail geometri model (ukuran telinga kucing, kaki meja, dsb.) yang tetap di modul pembuatnya, serta gaya tampilan HUD/HTML (warna, ukuran font) yang tetap di `css/style.css`.
2. Satu modul, satu tanggung jawab. Entitas baru masuk `js/entities/`, aturan atau logika lintas entitas masuk `js/systems/`.
3. Versi Three.js di-pin di importmap (`three@0.128.0`). Jangan upgrade tanpa diskusi, karena API seperti `outputEncoding` berubah di versi baru.
4. Refactor tidak boleh mengubah perilaku. Setelah perubahan, cek console browser dan mainkan sebentar.
5. **Baca [docs/GDD.md](docs/GDD.md) sebelum mengerjakan fitur gameplay. Jika implementasi menyimpang dari GDD, tanyakan dulu.** Hal yang tercantum di bagian "Pertanyaan terbuka" GDD juga harus ditanyakan sebelum diputuskan. Centang checklist di peta pengembangan GDD saat sebuah item selesai.

## Konsep game ke depan

Desain lengkapnya ada di **[docs/GDD.md](docs/GDD.md)**: *Meong Mayhem*. Ringkasnya, pemain adalah kucing yang ditinggal di rumah bersama pemilik yang bekerja dari rumah. Tugasnya mengumpulkan poin Chaos dengan berbuat nakal sebelum waktu habis, tanpa dipergoki pemilik.

Catatan teknis untuk menuju desain itu:
- Fondasi yang sudah ada: gerak dan lompat kucing ke atas perabot (`cat.js`, `collision.js`), rintangan yang bergerak (`vacuum.js`), dan tata letak perabot di `FURNITURE_LAYOUT`.
- Pemilik rumah direncanakan sebagai entitas baru di `js/entities/owner.js`, logika penglihatan dan pendengaran di `js/systems/`, dan semua angkanya di `config.js`.
