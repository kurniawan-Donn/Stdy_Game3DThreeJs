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

Kecepatan dan jarak persepsi disesuaikan dengan skala nyata (lihat bagian 3 dan 8).

## 1b. Rumah

Rumah kecil satu lantai **14 × 10 m** (denah lengkap: [docs/denah.md](denah.md)): ruang tamu, ruang makan + dapur terbuka, lorong, kamar tidur pemilik, kamar mandi, dan ruang kerja.

- **Loop kejar-kejaran:** (L1) ruang tamu ↔ lorong lewat dua bukaan; (L2) ruang tamu → lorong → dapur → ruang makan → ruang tamu; (L3) mengitari meja makan; (L4) mengitari pulau dapur.
- **Jalan pintas khusus kucing:**
  - Rute atas: dudukan sofa → meja kopi → rak TV → konter bar → ruang makan/dapur (pemilik harus memutar).
  - **Kolong perabot:** meja kopi (0,41 m) dan meja makan (0,70 m) bisa dilewati sambil berdiri; kasur (0,28 m) hanya sambil mengendap (di kolong kucing otomatis merunduk dan tidak bisa melompat). Kucing di kolong tertutup dari pandangan dan **tidak bisa diraih**: pemilik menunggu di dekatnya lalu menyerah.
- **Area gelap:** lorong dan kamar tidur (tirai tertutup). **Area terang:** depan jendela ruang tamu (berkas matahari) dan dekat jendela dapur.
- Dinding dalam menghalangi gerak, pandangan pemilik, dan kamera. Suara gameplay **tidak** diredam dinding (radius murni).

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
| `P` | Pause | Juga otomatis pause jika kunci mouse lepas saat main. `Esc` tetap untuk melepas kunci mouse |

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

### Daftar level

| # | Nama | Durasi | Target Chaos | Ringkasan | Status |
|---|---|---|---|---|---|
| 0 | **Latihan** | – | – | Tutorial (bagian 15) | dibangun |
| 1 | **Senin Pagi** | 4 menit | 300 | Hari kerja biasa: rutinitas, pencahayaan, dan objek seperti sekarang | dibangun |
| 2 | **Deadline** | 4 menit | 400 | Pemilik tegang: lebih sering menoleh, dua sesi rapat video | dibangun |
| 3 | **Sore Hujan** | 4,5 menit | 450 | Hujan & petir: kilat menyingkap, guntur menutupi suara, jejak kaki basah | dibangun |
| 4 | **Malam Hari** | 5 menit | 350 | Pemilik tidur; terbangun oleh suara, menyelidiki dengan senter | dibangun |
| 5 | **Kedatangan Tamu** | – | – | (ide) | dicatat |
| bonus | **Minggu Bersih-bersih** | – | – | (ide) | dicatat |

- **Terbuka:** Level 1 selalu terbuka. Level berikutnya terbuka jika level sebelumnya pernah selesai dengan **minimal 1 bintang**.
- Setiap level adalah **satu file data** di `js/levels/`: nama, deskripsi singkat, durasi, target Chaos, pencahayaan, kenakalan aktif, posisi objek, dan pengubah perilaku pemilik (menimpa nilai `config.js` selama level berjalan, dipulihkan saat ganti level). Menambah level = satu file baru + satu baris import di `js/levels/index.js` (tanpa build tool, browser tidak bisa membaca isi folder).
- Ganti atau ulang level mereset dunia dengan bersih (geometri & material objek level di-dispose, tanpa memory leak).

### Level 2 — Deadline
- Durasi 4 menit, target **400**.
- Pemilik **menoleh lebih sering**: tiap **8–12 detik** saat bekerja (Level 1: 12–20 detik).
- Ke toilet **paling banyak sekali**.
- **2 sesi RAPAT VIDEO**, masing-masing **40 detik**:
  - Pemilik duduk diam menghadap laptop (tidak menoleh). Layar laptop menampilkan kotak-kotak wajah, terdengar suara bicara samar.
  - Selama rapat, suara dengan **radius ≥ 3 m** yang terdengar pemilik (pemilik di dalam radiusnya) = langsung **"!"** (malu di depan bos): gelas pecah (4 m), pot (3,2 m), meong (4,8 m). *(Permintaan awal ≥ 6 m; diturunkan ke 3 m karena suara terbesar hanya 4,8 m.)*
  - Suara yang lebih pelan hanya menambah curiga; pemilik tetap duduk di rapat. Melihat kucing tetap menaikkan meter, tetapi pemilik tidak beranjak menyelidiki; meter penuh = "!".
  - **Jadwal:** rapat dimulai di detik **45** dan **150** sejak level dimulai. Jika pemilik sedang berkegiatan lain, kegiatannya dipersingkat dan ia kembali ke meja; rapat dimulai saat ia duduk. Rapat dilewati jika sisa waktu < 45 detik. Rapat bubar jika pemilik mengejar.
  - Indikator **"SEDANG RAPAT"** muncul di HUD.

**Rating bintang** (dihitung dari target Chaos):

| Bintang | Syarat |
|---|---|
| ★ | Chaos ≥ 100% target |
| ★★ | Chaos ≥ 150% target |
| ★★★ | Chaos ≥ 200% target |

### Level 3 — Sore Hujan
Terbuka setelah Level 2 mendapat minimal 1 bintang. Durasi **4,5 menit**, target **450**.

**Suasana**
- Cahaya sore kelabu-jingga yang redup (lampu berdiri menyala hangat), dengan **lebih banyak area gelap** daripada Level 1: selain lorong & kamar tidur, juga **ruang tamu sisi timur** (TV & meja kopi) dan **ruang makan**. Sisi barat dekat jendela tetap remang kelabu; ruang kerja tetap terang.
- Tidak ada sinar matahari: tidur di sinar matahari tidak tersedia, dan debu berkilau di berkas cahaya tidak tampil.
- Hujan di luar jendela: garis-garis hujan (instanced, ringan) dan tetesan yang mengalir di kaca (tekstur prosedural beranimasi).
- Suara hujan prosedural (white noise difilter) terus-menerus.

**Petir (mekanik utama)**
- Tiap **25–45 detik** (acak), tanpa peringatan: **KILAT**, seluruh rumah terang **0,4 detik**.
  - Selama kilat, area gelap tidak berlaku: pemilik bisa melihat kucing yang tadinya tersembunyi di area gelap.
  - Kucing di kolong atau di dalam kardus tetap tidak terlihat.
- **1–2 detik** setelah kilat: **GUNTUR** (gemuruh prosedural, getaran kamera kecil). Selama **2,5 detik** guntur, **semua suara kucing diabaikan pemilik**: barang bisa dipecahkan tanpa ketahuan jika waktunya tepat.
- Setelah kilat, HUD menampilkan **ikon petir kecil** yang menghitung mundur ke guntur.
- Selama hujan (di luar guntur), **suara kecil kucing (radius < 3 m) tertutup hujan** dan diabaikan pemilik.

**Jejak kaki basah**
- Ada **genangan kecil** (radius 0,45 m) di lantai bawah jendela ruang tamu yang bocor. Kucing yang menginjaknya meninggalkan **jejak kaki selama 15 detik** berikutnya (kiri-kanan bergantian, tiap ±0,17 m).
- Jejak di lantai: tanpa Chaos. Jejak di **sofa, kasur, meja kopi, meja makan, atau meja kerja**: **Chaos +5 per perabot** (sekali per perabot, maksimal +25, tanpa bonus combo).
- Jejak **segar** = umur ≤ **20 detik**. Pemilik hanya bereaksi pada jejak yang benar-benar **terlihat** (kerucut pandang, jangkauan, area gelap, terhalang perabot; kilat ikut menyingkap): curiga **+20**, lalu MENYELIDIKI ke **jejak terbaru**. Tiap jejak hanya memicu sekali. Jejak memudar dalam **60 detik**.

**Pemilik**
- **Menutup jendela bocor & menaruh ember:** pasti sekali per level, sebagai kegiatan pertama setelah **detik ke-60** (5 detik di jendela). Sesudahnya ember muncul dan genangan mengecil ke radius **0,2 m**. Jika terputus (misalnya mengejar), dicoba lagi nanti.
- **Membuat teh** (12 detik di dapur, bunyi ceret) **menggantikan** "ambil minum".
- Pengubah lain sama seperti Level 1.

**Performa:** garis hujan dan jejak kaki masing-masing satu `InstancedMesh`; kilat hanya menaikkan intensitas lampu matahari & langit yang sudah ada (tanpa lampu baru). Diukur di Chrome: 60 FPS normal maupun saat kilat berulang.
**Pengembang:** dengan overlay `F3` terbuka, `L` memicu kilat yang ditahan 1,5 detik untuk menyetel visual.

### Level 4 — Malam Hari
Terbuka setelah Level 3 mendapat minimal 1 bintang. Durasi **5 menit**, target **350**.

**Suasana**
- Rumah gelap: lampu ruangan mati, cahaya bulan biru pucat yang sangat redup, satu lampu tidur kecil di lorong, cahaya jam digital (jam beker) di kamar.
- **Hampir seluruh rumah dihitung area gelap**, kecuali **berkas cahaya bulan** di lantai bawah jendela ruang tamu (tambalan cahaya biru lembut dengan bayang palang jendela).
- Gelapnya dari pencahayaan, bukan lapisan redup; tidak ada debu berkilau sampai matahari terbit.
- Suara malam prosedural: jangkrik samar, detak jam.
- Saat waktu habis: **matahari terbit** selama 5 detik (cahaya berubah hangat bertahap, kontrol dikunci), pemilik bangun pagi, lalu layar hasil ("Pagi telah tiba!").

**Pemilik tidur**
- Level dimulai dengan pemilik tidur di kasur.
- **Meter TERBANGUN (0–100):** suara "sampai ke kamar" jika jarak sumber ke kepala pemilik ≤ **2 × radius suara**; isinya **25 × radius × (1 − jarak / (2 × radius))**. Meter turun **3/detik**. Contoh: gelas pecah 3 m dari kepala → +62,5; lari di samping kasur → ±+37; jalan biasa beberapa meter → 0. Di HUD tampil sebagai ikon **"Zzz"** yang memudar menjadi **mata terbuka**, dengan bilah meter.
- Pemilik yang tidur tidak melihat apa pun dan tidak menghalangi kucing (kucing bisa berjalan di atas kasur).
- Meter penuh = pemilik bangun: duduk di tepi kasur **1,5 detik**, menyalakan **senter**, berjalan ke sumber suara terakhir, menyorot sekeliling **6 detik**, lalu kembali tidur (meter 0) jika tidak menemukan apa-apa. Jika melihat kucing: curiga/kejar seperti biasa; setelah menangkap, ia kembali tidur.
- Tiap kali terbangun karena suara, pengali meter naik **×1,25** (kumulatif).
- **Camilan tengah malam** sekali per level di **detik 150**: pemilik bangun sendiri, berjalan ke kulkas dengan senter, 8 detik di depan kulkas yang terbuka (lampu kulkas menyala), lalu kembali tidur. Tidak menaikkan pengali.

**Senter**
- Saat terjaga, pandangan pemilik = **kerucut senter 35°, jangkauan 12 m** (area gelap tidak berlaku di sorotan). Di luar sorotan, pemilik hanya melihat dalam **2 m** (kerucut pandang biasa 70°).
- Mengendap ×0,5 (sorotan 6 m). **Kucing hitam:** bonus area gelap berlaku penuh, ×0,5 lagi (sorotan 6 m, sambil mengendap 3 m, di luar sorotan 1 m).
- Kucing di **berkas cahaya bulan** terlihat dengan pandangan biasa (70°, 3,2 m) walau di luar sorotan.
- Sorotan terlihat jelas (SpotLight + kerucut cahaya semi-transparan, senter di tangan kanan).
- **Mata kucing berkilau** saat kepalanya di sorotan (≤ 12 m, tidak terhalang) dan menghadap kira-kira ke pemilik (±50°); tidak berlaku di kardus atau kolong. Jika kucing berkilau tapi tidak terlihat, curiga naik **+10/detik**, maksimal **80** (tidak bisa memicu "!" sendiri).

**Kenakalan khusus malam**
- **Menginjak-injak selimut** (kneading) di atas pemilik yang tidur: **60 Chaos**, suara 0,8 m, dan meter terbangun langsung **+45** (ikut pengali). Hanya saat pemilik tidur dan kucing di dekat badannya; sekali per level.
- **Menjatuhkan jam beker** dari **nakas** (di sisi kepala kasur): **40 Chaos**, suara **5 m**; jam berdering 3 detik di lantai. Di samping kasur, dering ini hampir pasti membangunkan pemilik.
- "Acak-acak selimut" tidak tersedia di Level 4 (digantikan kneading).

**Performa:** maksimal **1 lampu berbayangan**: kualitas Tinggi = senter, Sedang = bulan, Rendah = tidak ada; saat matahari terbit, matahari yang berbayangan. Bulan sengaja sangat redup karena lampu arah tanpa bayangan menembus dinding; berkas bulan di lantai dibuat sebagai tambalan cahaya. Diukur di Chrome: 60 FPS.
**Pengembang:** dengan overlay `F3` terbuka, `T` memajukan waktu ke 5 detik terakhir (melihat matahari terbit).

## 5. Kenakalan & Chaos

Setiap kenakalan memberi Chaos dan memancarkan suara dengan radius tertentu. Pemilik yang berada di dalam radius suara akan mendengarnya.

| Kenakalan | Chaos | Radius suara |
|---|---|---|
| Tumpahkan tisu | 15 | 0,8 m |
| Acak-acak selimut | 25 | 0,6 m |
| Menginjak-injak selimut (Level 4) | 60 | 0,8 m (+45 meter terbangun) |
| Jatuhkan jam beker (Level 4) | 40 | 5 m |
| Tarik tisu toilet | 35 | 1,2 m |
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
| Gelas | 4 | meja kopi & rak TV (ruang tamu), pulau dapur, meja rias (kamar tidur) | 160 |
| Pot | 2 | tanaman ruang tamu & ruang makan | 100 |
| Ikan dapur | 1 | konter dapur | 80 |
| Cakar | 2 | sofa, kursi baca | 40 |
| **Tarik tisu toilet** | 1 | kamar mandi | 35 |
| Tisu | 2 | meja kopi, meja kerja | 30 |
| Remote | 1 | dudukan sofa | 30 |
| **Acak-acak selimut** | 1 | kasur (kamar tidur) | 25 |
| **Total** | **14** | | **500** (maks. ±750 dengan combo) |

Target level tetap 300 Chaos / 4 menit; disetel ulang lewat playtest karena rumah lebih luas.

**Kenakalan baru:**
- **Tarik tisu toilet** (35 Chaos, suara 1,2 m): dari lantai, kucing berdiri dan menepuk gulungan berkali-kali; gulungan berputar berderak, kertas menjuntai lalu terurai ±1 m di lantai.
- **Acak-acak selimut** (25 Chaos, suara 0,6 m — kain, sangat senyap): di atas kasur, kucing menguleni selimut; selimut rapi berubah jadi gumpalan kusut.

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
| Kerja di laptop | Kegiatan paling lama: 35–55 detik di **ruang kerja**, duduk membelakangi pintu. Setiap 12–20 detik **menoleh ke belakang** 2,5 detik; kadang meregang 4 detik |
| Ambil minum di dapur | 8 detik (peluang 30%) |
| Lihat ke luar jendela ruang tamu | 10 detik (peluang 25%) |
| Merapikan lemari di kamar tidur | 8 detik (peluang 25%) |
| Ke toilet | Peluang 20%, **maksimal sekali per level**. Masuk kamar mandi, **pintu tertutup selama 20 detik** (kucing tidak bisa masuk, pandangan terhalang), bunyi siraman, pintu membuka, lalu kembali bekerja |

Setelah sesi kerja, pemilik memilih satu kegiatan secara acak berbobot, lalu kembali bekerja. Selama di toilet, pemilik tidak melihat dan tidak mendengar apa pun.

Pemilik berjalan memakai grid navigasi (A* + penghalusan jalur) dan tidak menembus perabot. Tubuh pemilik dan robot vacuum menghalangi kucing.

### Penglihatan
- Kerucut pandang **70°**, jangkauan **3,2 m**, diukur dari mata (1,6 m berdiri, 1,2 m duduk) ke arah kepala menoleh.
- Kucing hanya terlihat jika ada **line-of-sight** ke titik tubuhnya (kepala 0,28 m, punggung 0,23 m, pantat 0,20 m). Kucing kecil mudah tertutup meja kopi, sofa, dan perabot lain. Perabot menghalangi pandangan; lampu berdiri dan tanaman tidak. Perabot yang sedang dipijak kucing tidak menutupi kucing itu sendiri.
- Pengubah jangkauan: **mengendap ×0,5**, **area gelap ×0,7**.
- **Jarak < 0,6 m:** selalu terlihat, kecuali line-of-sight terhalang total.
- **Area gelap:** lorong dan kamar tidur. Tampak jelas lebih redup: lantai, dinding, dan plafon zona diberi lapisan gelap kecokelatan, hanya diterangi lampu malam hangat yang lemah, dan kucing serta pemilik di dalamnya ikut meredup. Saat kucing di area gelap, ikon mata HUD diberi **tanda bulan kecil**; `F3` menggambar batas zona di lantai.

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
4. **Setelah fade** → kucing berada di **keranjang** (pojok barat laut ruang tamu), **nyawa −1**, pemilik kembali ke rutinitas dengan meter 0, dan kucing **kebal 3 detik** (berkedip).

Detail: slow motion **0,3×** selama 1,6 detik nyata, desaturasi bertahap 1 detik, teks dengan efek dentum, bunyi dentum, getaran kamera, pemilik mengangkat kucing. Fade keluar 0,6 detik, hitam 0,5 detik, fade masuk 0,6 detik. Efek layar memakai CSS (filter + overlay), bukan post-processing.

Total **3 nyawa**.

## 10. Akhir level

- **Layar hasil:** bintang, Chaos didapat, Chaos yang masuk tabungan, dan tombol **Ulangi**, **Level Berikutnya** (jika sudah terbuka), dan **Lobi**.

- **Waktu habis:** pemilik selesai bekerja, lalu muncul **layar hasil**.
  - Chaos ≥ target → **menang**, beserta rating bintang.
  - Chaos < target → **kalah**, dengan pesan lucu *"Rumah masih terlalu rapi..."*
  - Dalam kedua kasus, **seluruh Chaos masuk tabungan** untuk lobi.
- **Nyawa habis sebelum waktu habis:** level gagal, dan hanya **50% Chaos** yang masuk tabungan.

## 11. Camilan

| Camilan | Efek |
|---|---|
| **Ikan** | Mengisi stamina +40. Muncul acak di lantai dan di atas perabot, satu ekor dalam satu waktu. Dimakan otomatis saat disentuh, lalu muncul lagi 12 detik kemudian. |
| **Catnip** (langka) | Mode **zoomies** selama 6 detik: kucing sangat cepat (6 m/s), langkah senyap, stamina tidak terkuras, tepi layar berpelangi tipis. **Satu per level**, di lantai samping meja kerja pemilik (tempat berisiko). Dimakan otomatis saat disentuh. |

## 12. Hal lucu (fitur karakter)

- **Mendorong gelas pelan sambil menatap kamera:** animasi khusus saat menjatuhkan gelas.

### Kardus
- 4 kardus (0,45 × 0,40 × 0,45 m) tersebar di rumah, sebagian dekat jalur loop (posisi di `docs/denah.md`).
- `E` di dekat kardus = **masuk**. Kucing tidak terlihat; hanya dua mata menyala yang mengintip dari lubang. Kamera orbit tetap bebas di luar kardus.
- Di dalam kardus: kecepatan mengendap, tidak bisa melompat, langkah senyap. `E` lagi = **keluar** lewat sisi depan.
- Kardus **diam** = pemilik tidak curiga sama sekali. Kardus **bergerak** di dalam kerucut pandang = curiga naik ×1,6 dari biasa (dan jarak pandang tidak dikurangi efek mengendap).
- Masuk kardus **di depan mata pemilik** (atau ≤ 1 detik setelah terlihat saat dikejar) tidak menyelamatkan: pemilik tetap mengejar, lalu mengangkat & melempar kardusnya saat menangkap.
- Kardus yang ditinggal menjadi rintangan: kucing bisa berdiri di atasnya (0,40 m), dan jalur pemilik dihitung ulang memutarinya.

### Kolong tempat sembunyi
- Kolong **sofa** (kaki 0,28 m), **kasur** (0,28 m), **meja kerja**, dan **meja makan**: kucing yang **merendah** (mengendap, atau terpaksa merendah di kolong rendah) tidak terlihat dan tidak bisa diraih.
- Kolong **meja kopi** bisa dilewati tetapi **bukan** tempat sembunyi; daun mejanya tetap menghalangi pandangan dari atas.
- Pemilik yang **menyelidiki** tepat di dekat kolong (≤ 0,8 m) punya peluang **25%** membungkuk memeriksanya selama 1,5 detik. Jika kucing bersembunyi di sana, kucing **ditarik keluar** (alur KETAHUAN).
- Kamera tetap di luar kolong (perabot yang menghalangi memudar, kamera tidak bergetar).

### Menumpang robot vacuum
- Robot (Ø 0,34 m) berkeliaran di seluruh rumah dengan kecepatan 0,6 m/s: jalan lurus, berbelok acak saat menabrak dan sesekali, sehingga bisa pindah ruangan. Robot **tidak melukai** kucing.
- Lompat ke atas robot = **menumpang**: kucing duduk tenang, langkah senyap, **WASD tidak mengarahkan**, `Spasi` = turun. Jika robot masuk kolong yang terlalu rendah, kucing turun otomatis.
- Pemilik yang melihat kucing menumpang: curiga naik **setengah** kecepatan biasa.
- Saat pemilik **MENGEJAR**, robot dalam radius 5 m dari kucing/pemilik **menyingkir** ke dinding samping terdekat (sisi lorong) lalu diam; di ruang terbuka robot cukup berhenti. Robot kembali berkeliaran 1,5 detik setelah kejaran selesai. Di lorong 1,2 m tersisa celah ±0,75 m untuk kabur.
- Robot berbelok sebelum menabrak kucing yang berdiri di lantai (tidak mendorongnya).

### Bola benang
- 2 bola (ruang tamu, kamar tidur). `E` = **tendang** ke arah hadap kucing (jeda 1 detik); bola menggelinding ±1,7 m.
- Saat bola berhenti, ia memancarkan suara **1,5 m**: pemilik di dalam radius datang menyelidiki (curiga +15). Bisa ditendang berulang.

### Tingkah kucing
- **Animasi kecil acak** saat diam ±2 detik: menjilat kaki, menggaruk telinga, menguap.
- **Loaf pose:** diam 5 detik = duduk melingkar seperti roti, ikon ♥ kecil melayang.
- **Tidur di sinar matahari:** di zona cahaya jendela (ruang tamu & dapur), **tahan `E`** 0,6 detik. Muncul "Zzz", stamina pulih 25/detik, bangun dengan input gerak, `E`, atau `Q`. Pemilik yang melihat kucing tidur **tidak curiga**, kecuali ada kekacauan baru dalam radius 3 m selama 10 detik terakhir.

### Umpan balik
- Ikon mata di HUD: **tertutup** (hijau) = tersembunyi, **setengah** (kuning) = terlihat sebagian, **terbuka** (merah) = terlihat penuh.
- Prompt `E` menyesuaikan konteks: Masuk kardus / Keluar kardus / Tendang / Tahan E: Tidur / kenakalan.
- Overlay `F3` menampilkan status persembunyian.

## 13. Transisi dari prototipe

Fitur dari prototipe *Coin Rush 3D* diubah sebagai berikut. Perubahan ini dikerjakan di fase yang relevan, tidak sekaligus.

| Fitur prototipe | Nasib | Fase |
|---|---|---|
| Kristal/koin | Diganti **ikan**, yang muncul acak di lantai dan di atas perabot | 2 ✅ |
| Power-up magnet | **Dinonaktifkan** di Fase 2, kodenya **dihapus** di Fase 3. Catnip menyusul di Fase 5 | 2 ✅ / 3 ✅ |
| Robot vacuum melukai kucing | **Tidak melukai lagi** (Fase 3), hanya menghalangi. Menjadi kendaraan di Fase 6 | 3 ✅ / 6 |
| Naik level karena mengumpulkan koin | **Dihapus** (jumlah dan kecepatan robot tetap) | 2 ✅ |
| Skor & high score | Diganti **Chaos** dan tabungan Chaos | 2 ✅ |

## 14. Lobi, kustomisasi & pengaturan

### Alur game
**LOBI → PILIH LEVEL → MAIN → (PAUSE) → HASIL → LOBI**

- **Pause** dengan `P`. `Esc` tetap melepas kunci mouse; jika kunci mouse lepas saat main, game otomatis pause.

### Lobi
- Scene 3D kecil: **sudut rumah yang nyaman**. Kucing pemain duduk di bantal dan berputar pelan, dengan animasi idle (loaf, menjilat kaki).
- **Tabungan Chaos** terlihat di pojok atas.
- **Menu:**
  - **Main:** lanjut ke level tertinggi yang terbuka.
  - **Pilih Level:** kartu per level dengan nama, deskripsi, bintang terbaik, dan status terkunci/terbuka.
  - **Kustomisasi**
  - **Pengaturan**
  - **Cara Bermain:** sementara berisi daftar kontrol (tutorial menyusul).

### Kustomisasi (kosmetik, prosedural, tanpa aset)
Preview langsung di lobi saat memilih. Item terkunci tampil dengan harga dan bisa dibeli dengan tabungan Chaos.

| Kucing | Harga |
|---|---|
| Oranye | gratis |
| Putih | 300 |
| Abu-abu | 300 |
| Hitam | 500 |
| Tabby bergaris | 600 |
| Calico | 800 |
| Gemuk/chonky oranye | 1000 |

- **Chonky:** badan lebih bulat, jalan bergoyang, loaf lebih bulat; kemampuan **sama**.

| Aksesoris (satu slot) | Harga |
|---|---|
| Dasi kupu-kupu | 150 |
| Syal | 200 |
| Topi kecil | 250 |
| Kalung lonceng | 400 |

- Semua kosmetik, dengan dua pengecualian:
  - **Kalung lonceng:** Chaos **×1,2**, tetapi langkah kucing berbunyi: radius suara langkah jalan 0,4 → **1,2 m**, lari 2 → **3 m**, mengendap 0 → **0,6 m**.
  - **Kucing hitam:** lebih sulit terlihat di area gelap: jangkauan pandang pemilik di area gelap ×0,7 → **×0,5**.

### Pengaturan
- **Kualitas grafis:** Rendah (tanpa bayangan, pixel ratio 1), Sedang (bayangan 1024, pixel ratio maks. 1,5), Tinggi (seperti sekarang: bayangan 2048, pixel ratio maks. 2).
- **Volume**, **sensitivitas mouse**, **balik sumbu Y**, **tampilkan FPS**.
- Tombol **Hapus Progres** dengan konfirmasi.

### Simpan progres
- `localStorage` dengan **versi skema** (update berikutnya tidak merusak save lama): tabungan, bintang terbaik per level, item yang dimiliki, kucing & aksesoris terpilih, pengaturan, status tutorial.
- Semua akses dibungkus `try/catch`; game tetap jalan tanpa save.

## 15. Tutorial

- **Level 0 "Latihan"** di rumah yang sama, otomatis dimulai saat pertama kali menekan **Main**. Pemain lama yang sudah punya progres (tabungan atau rekor level) dianggap sudah lulus.
- Tanpa timer dan target, tanpa robot vacuum, hanya gelas sebagai kenakalan. Tidak menambah tabungan Chaos.
- Langkah bertahap dengan kotak petunjuk di atas layar (Latihan 1/6 … 6/6) dan panah kuning di atas sasaran:
  1. **Gerak:** berjalan ±1,5 m.
  2. **Lompat:** `Spasi` lalu mendarat.
  3. **Naik ke meja:** berdiri di atas meja kopi.
  4. **Jatuhkan gelas:** gelas pecah (`E`).
  5. **Sembunyi di kardus:** masuk kardus K1 dan diam; pemilik muncul dari lorong, lewat di samping kardus, menoleh ke sekeliling, lalu pergi. Jika kardus bergerak saat dilihat: "Ketahuan!", langkah diulang.
  6. **Ditangkap sekali:** pemilik muncul dan mengejar; alur KETAHUAN tampil penuh **tanpa kehilangan nyawa**.
- Pemilik dikendalikan naskah: di luar layar (tidak melihat/mendengar) selama langkah 1–4.
- Selesai → layar "Latihan selesai!" (Main Level 1 / Lobi).
- **Bisa dilewati** (tombol di kotak petunjuk dan di menu pause) dan **bisa diulang** (kartu Level 0 di Pilih Level, tombol di Cara Bermain).

## 16. Prinsip teknis

- **Tanpa aset eksternal.** Semua model, tekstur, dan suara dibuat secara prosedural (bentuk dasar Three.js, Canvas, Web Audio).
- **Ringan** dan lancar di laptop biasa.
- **Semua angka penyetelan ada di `js/config.js`.**
- **Performa:** hanya satu lampu yang memakai bayangan (matahari; di Level 4 senter atau bulan); lampu ruangan tanpa bayangan. Geometri statis digabung per material (rumah dan tiap perabot). Target 60 FPS di laptop biasa; FPS tampil di overlay `F3`.

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
- [x] Kardus (ketahuan jika bergerak saat dilihat; masuk di depan mata tidak menyelamatkan)
- [x] Area gelap: visual & pencahayaan yang lebih jelas (lapisan redup hangat, lampu malam lemah, entitas meredup, tanda bulan di HUD, batas di F3)
- [x] Robot menyingkir/berhenti saat pemilik mengejar agar jalur kabur tidak tertutup
- [x] Kolong perabot untuk sembunyi — dikerjakan saat perbaikan peta; diperbarui: sofa, kasur, meja kerja, meja makan (merendah = tersembunyi), meja kopi hanya bisa dilewati, pemilik kadang membungkuk mengecek
- [x] Catnip (zoomies 6 detik, satu per level) menggantikan magnet
- [x] Tidur di sinar matahari untuk memulihkan stamina (pemilik tidak curiga pada kucing tidur)

### Fase 6 — Hal lucu
- [x] Robot vacuum berkeliaran & bisa ditunggangi (tidak melukai sejak Fase 3)
- [x] Animasi mendorong gelas sambil menatap kamera — dikerjakan di Fase 2
- [x] Loaf pose setelah diam 5 detik + animasi idle acak (menjilat, menggaruk, menguap)
- [x] Bola benang yang bisa ditendang sebagai pengalih
- [x] Ikon mata status persembunyian di HUD, prompt E kontekstual, status sembunyi di F3

### Perbaikan peta (di luar fase)
- [x] Rumah 14 × 10 m: ruang tamu, ruang makan + dapur, lorong, kamar tidur, kamar mandi, ruang kerja
- [x] 4 loop kejar-kejaran, rute atas & kolong khusus kucing
- [x] Kenakalan dipindah ke ruangan yang cocok + 2 baru (tisu toilet, selimut)
- [x] Rutinitas pemilik di seluruh rumah, toilet dengan pintu tertutup
- [x] Denah di `docs/denah.md`

### Fase 7 — Level & tutorial
- [x] Sistem level data-driven: satu file per level di `js/levels/`, level manager, reset bersih tanpa memory leak
- [x] Level 1 Senin Pagi dan Level 2 Deadline (menoleh lebih sering, rapat video, indikator SEDANG RAPAT)
- [x] State game LOBI → PILIH LEVEL → MAIN → PAUSE → HASIL; pause `P` & saat kunci mouse lepas
- [x] Layar hasil dengan Ulangi / Level Berikutnya / Lobi; level terbuka dengan minimal 1 bintang
- [x] Simpanan `localStorage` berversi skema (v2, migrasi dari save lama), aman tanpa `localStorage`
- [x] Level 3 Sore Hujan: hujan & tetesan di kaca, petir (kilat menyingkap, guntur menutupi suara, ikon hitung mundur), suara kecil tertutup hujan, jejak kaki basah, tutup jendela & ember, buat teh
- [x] Level 4 Malam Hari: pemilik tidur & meter terbangun, senter (SpotLight, kilau mata), berkas bulan, camilan tengah malam, kneading & jam beker, matahari terbit, nakas baru di kamar
- [ ] Level 5 (Kedatangan Tamu) dan bonus Minggu Bersih-bersih
- [x] Tutorial bertahap (Level 0 Latihan) yang otomatis dimulai saat pertama main, bisa dilewati dan diulang
- [x] Pose loaf dirapikan: kaki terselip di bawah badan, perut menyentuh alas

### Fase 8 — Lobi & kustomisasi
- [x] Lobi 3D: sudut rumah nyaman, kucing di bantal berputar pelan dengan animasi idle (loaf, duduk, menjilat kaki), tabungan di pojok atas
- [x] Menu: Main, Pilih Level, Kustomisasi, Pengaturan, Cara Bermain
- [x] Varian kucing prosedural (oranye, putih, abu-abu, hitam, tabby, calico, chonky) dengan harga & preview langsung
- [x] Aksesoris satu slot (dasi kupu-kupu, syal, topi kecil, kalung lonceng), termasuk efek lonceng dan kucing hitam
- [x] Pengaturan: kualitas grafis, volume, sensitivitas mouse, balik sumbu Y, tampilkan FPS, hapus progres dengan konfirmasi
- [x] Simpanan berversi skema (dikerjakan di Fase 7)

### Fase 9 — Polish & performa
- [ ] Efek suara prosedural untuk semua aksi baru
- [ ] Uji performa di laptop biasa dan optimasi (sudah: bayangan hanya dari matahari, geometri statis digabung, FPS di F3)
- [ ] Penyeimbangan angka di `config.js` dan uji main menyeluruh
