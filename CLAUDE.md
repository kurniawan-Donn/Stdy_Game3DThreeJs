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
index.html              Canvas, elemen UI (HUD, layar hasil, teks melayang), importmap Three.js
css/style.css           Semua gaya UI
package.json            Script "start" (npx serve)
docs/GDD.md             Game Design Document + peta pengembangan (Fase 0–9)
js/
  main.js               Entry point: membuat objek konteks `ctx`, menjalankan game loop
  config.js             SEMUA angka penyetelan (lihat aturan di bawah)
  core/
    renderer.js         Scene, kamera, WebGLRenderer, resize
    input.js            Keyboard: input.keys (ditahan), input.pressed (baru ditekan frame ini)
    state.js            State bersama: Chaos, combo, waktu, nyawa (createState/resetRunState)
    camera.js           Kamera third-person + getaran kamera (triggerShake)
    audio.js            Efek suara Web Audio: audio.play(nama) dari AUDIO.SFX / AUDIO.NOISE_SFX
    save.js             Tabungan Chaos & rekor level di localStorage
  world/
    textures.js         Tekstur prosedural (lantai kayu, karpet)
    lighting.js         Lampu hemi, matahari, lampu berdiri, fill
    room.js             Lantai, dinding, plafon, jendela, baseboard
    furniture.js        Perabotan + pojok dapur + collider AABB; mengembalikan { colliders, refs }
    dust.js             Partikel debu di berkas cahaya jendela
    house.js            Pintu ke toilet, keranjang kucing, area gelap (isInDarkZone)
  entities/
    cat.js              Kucing pemain: model, gerak, lompat, animasi, aksi (startCatAction)
    fish.js             Ikan camilan (isi stamina), menggantikan kristal
    fishModel.js        Model ikan prosedural
    vacuum.js           Robot vacuum yang bergerak bolak-balik (tidak melukai, hanya menghalangi)
    owner/              Pemilik rumah
      index.js          Rutinitas, meter curiga, state machine, mengejar, pendengaran
      model.js          Model manusia low-poly (pivot sendi)
      animation.js      Pose: jalan, lari, duduk mengetik, minum, meregang, mengangkat
    particles.js        Percikan partikel saat camilan diambil
    mischief/           Objek kenakalan, satu file per jenis
      index.js          Buat/reset/update semua objek dari MISCHIEF_LAYOUT
      common.js         registerMischief, pose kucing, serpihan berfisika
      glass.js tissue.js scratch.js remote.js pot.js kitchenFish.js
  systems/
    collision.js        Lingkaran vs AABB, tinggi permukaan, cek posisi bebas
    spawn.js            Cari posisi lantai acak yang aman
    physics.js          Fisika benda sederhana (addBody, updatePhysics)
    chaos.js            scoreMischief: Chaos + combo + noise + umpan balik
    level.js            Timer level, akhir level, bintang, tabungan
    progression.js      Makan ikan, reset level
    navGrid.js          Grid navigasi pemilik + A* + penghalusan jalur
    perception.js       Penglihatan pemilik: kerucut, jangkauan, line-of-sight
    capture.js          Alur KETAHUAN: slow motion, efek layar, keranjang, nyawa −1
    noise.js            Event suara gameplay (emitNoise / onNoise) untuk didengar pemilik
    stamina.js          Stamina, lompat tinggi, status terengah
    meow.js             Mengeong (Q): cooldown, noise, riwayat untuk status jengkel
    interaction.js      Interaksi (E): registerInteractable, penanda, prompt
  ui/
    hud.js              Level, waktu, Chaos Meter, combo, nyawa, stamina, meong, prompt E
    results.js          Layar hasil akhir level + tombol Main Lagi
    floatingText.js     Teks melayang (+40, COMBO x1.5) yang mengikuti posisi 3D
    screenEffects.js    Efek layar CSS: desaturasi, vignette, teks KETAHUAN!, fade hitam
    ownerIndicator.js   Ikon ?/! + meter curiga di atas kepala pemilik (+ label debug)
    debugOverlay.js     Overlay developer (F3): ring noise, interaksi, kerucut pandang, LOS, jalur A*
```

## Arsitektur

- `main.js` membuat satu objek konteks **`ctx`** (lihat isinya di `main.js`): scene/kamera/renderer, `colliders` & `furnitureRefs`, entitas (`cat`, `fish`, `obstacles`, `owner`), dunia (`nav`, `door`), sistem (`state`, `stamina`, `noise`, `meow`, `physics`, `mischief`, `interaction`, `capture`), dan UI (`hud`, `results`, `floatText`, `screenFx`, `ownerIndicator`, `debug`). Fungsi update menerima `(ctx, dt)`.
- **Tidak ada variabel global yang bisa diubah.** Dependensi dikirim lewat parameter atau `ctx`. Satu-satunya pengecualian yang diperbolehkan: vektor kerja privat di level modul (misalnya `camTargetPos` di `camera.js`) untuk menghindari alokasi setiap frame.
- Entitas tidak memanggil `systems/progression.js` secara langsung. Mereka mengembalikan sinyal, misalnya `updateFish()` mengembalikan `true` saat ikan dimakan, lalu `main.js` memanggil `onFishEaten(ctx)`. Pola ini mencegah import melingkar.
- Urutan update per frame: kucing → meong → interaksi → kenakalan → ikan → robot vacuum → pemilik → noise → HUD → timer level → pintu, lalu (juga setelah level berakhir) fisika → partikel → debu → overlay debug → kamera → teks melayang → indikator pemilik → render → `endFrame(input)`.
- **Waktu nyata vs waktu dunia:** saat tertangkap, `ctx.capture.timeScale` = 0,3 (slow motion). Pemilik, kenakalan, robot, fisika, partikel, dan debu memakai waktu dunia (`dt × timeScale`); alur KETAHUAN, kamera, dan UI memakai waktu nyata. Input kucing dikunci selama alur KETAHUAN.
- Pemilik mendengar lewat `onNoise` (didaftarkan di `main.js` → `ownerHearNoise`). Penglihatan dihitung di `systems/perception.js`. Collider perabot dengan `occludes: false` tidak menghalangi pandangan, dan `navBlocks: false` tidak menghalangi jalur pemilik.
- **Kenakalan baru:** buat file di `js/entities/mischief/`, daftarkan di `FACTORIES` (`index.js`), tambahkan posisinya di `MISCHIEF_LAYOUT` dan nilainya di `MISCHIEF` (config). Selesaikan kenakalan lewat `scoreMischief(ctx, type, posisi)`, yang otomatis memanggil `emitNoise` dengan radius dari GDD. Animasi kucing dijalankan lewat `startCatAction(cat, { duration, faceYaw, pose, events })`, dan semua perubahan tampilan harus dikembalikan di `inst.dispose()` karena objek dibuat ulang setiap level diulang.
- Benda yang jatuh, memantul, atau berserakan memakai `addBody(ctx, {...})` dari `systems/physics.js`. Semua benda dibersihkan saat level diulang.
- Kamera selalu berada di selatan (+Z) kucing. Objek atau perubahan tampilan yang perlu terlihat pemain sebaiknya menghadap +Z atau terlihat dari atas.
- Aksi yang berisik memanggil `emitNoise(ctx, { x, z, radius, source })`. Sistem yang perlu "mendengar" mendaftar lewat `onNoise(ctx.noise, fn)`.
- Objek interaktif didaftarkan lewat `registerInteractable(ctx.interaction, item)` (lihat komentar di `interaction.js`).
- Tekan `F3` di game untuk overlay debug. Pakai overlay ini untuk memeriksa radius noise dan jangkauan interaksi.
- Urutan `scene.add` di `main.js` mempengaruhi urutan render objek transparan, jadi jangan diacak tanpa alasan.

## Aturan

1. **Angka penyetelan selalu masuk `config.js`.** Ini mencakup kecepatan, gravitasi, tinggi lompat, ukuran ruangan, warna/material, timer, peluang spawn, posisi dan collider perabot, parameter lampu, kamera, partikel, dan suara. Jangan menulis angka seperti ini langsung di modul lain. Pengecualian hanya untuk detail geometri model (ukuran telinga kucing, kaki meja, dsb.) yang tetap di modul pembuatnya, serta gaya tampilan HUD/HTML (warna, ukuran font) yang tetap di `css/style.css`.
2. **Skala dunia nyata.** Ukuran benda mengikuti tabel `REAL_SCALE` di `config.js` (kucing bahu 0,25 m, pemilik 1,7 m, dst.), dan ruang tamu berukuran 8,8 × 8 m (`WORLD_SCALE` 0,4 terhadap prototipe). Model perabot dibangun dari dimensi collider di `FURNITURE_LAYOUT`, jadi ubah ukuran di config, bukan di model. Benda baru harus diberi ukuran nyata.
3. Satu modul, satu tanggung jawab. Entitas baru masuk `js/entities/`, aturan atau logika lintas entitas masuk `js/systems/`.
4. Versi Three.js di-pin di importmap (`three@0.128.0`). Jangan upgrade tanpa diskusi, karena API seperti `outputEncoding` berubah di versi baru.
5. Refactor tidak boleh mengubah perilaku. Setelah perubahan, cek console browser dan mainkan sebentar.
6. **Baca [docs/GDD.md](docs/GDD.md) sebelum mengerjakan fitur gameplay. Jika implementasi menyimpang dari GDD, tanyakan dulu.** Hal yang tercantum di bagian "Pertanyaan terbuka" GDD juga harus ditanyakan sebelum diputuskan. Centang checklist di peta pengembangan GDD saat sebuah item selesai.

## Konsep game ke depan

Desain lengkapnya ada di **[docs/GDD.md](docs/GDD.md)**: *Meong Mayhem*. Ringkasnya, pemain adalah kucing yang ditinggal di rumah bersama pemilik yang bekerja dari rumah. Tugasnya mengumpulkan poin Chaos dengan berbuat nakal sebelum waktu habis, tanpa dipergoki pemilik.

Catatan teknis untuk menuju desain itu:
- Fondasi yang sudah ada: gerak dan lompat kucing ke atas perabot (`cat.js`, `collision.js`), rintangan yang bergerak (`vacuum.js`), dan tata letak perabot di `FURNITURE_LAYOUT`.
- Pemilik rumah ada di `js/entities/owner/`, navigasi & penglihatan di `js/systems/`, alur KETAHUAN di `systems/capture.js`. Semua angkanya di `config.js` (`OWNER`, `OWNER_ROUTINE`, `PERCEPTION`, `SUSPICION`, `CHASE`, `CAPTURE`, `NAV`).
