# Denah rumah — Meong Mayhem

Rumah satu lantai **14 × 10 m** (x −7..7, z −5..5), plafon 2,7 m. Utara = −Z.
Sumber kebenaran koordinat: `HOUSE` dan `FURNITURE_LAYOUT` di `js/config.js`.

```
 x(m) -7          -4.6        -2.6   -0.4            3.5                  7
 z=-5 ┌─────────────────────────┬────────┬───────────────┬────────────────────┐
      │ KAMAR TIDUR  (gelap)    │ KAMAR  │ RUANG KERJA   │ DAPUR  [ konter  ]▓▓│kulkas
      │ ║tirai [ kasur ]  [lemari]│ MANDI │ [meja+laptop] │                    │
      │ ║      [ kolong]        │ toilet │    kursi      │     [ pulau ]      ║jendela
      │ ║      [ 0,28m ]        │ ▯tisu  │               │       ↺ L4         ║(terang)
      │      selimut            │wastafel│               │                    │
      │ [meja rias]             │        │               │                    │
 -1.5 ├──────────┤ ├────────────┴──╡▮╞───┴────┤ ├──────────┘                    │
      │░░░░░░░░░░░░░ L O R O N G  (gelap) ░░░░░░░░░░░░░░░  → terbuka ke dapur  │
 -0.3 ├──────┤ ├─────────────────────────────┤ ├──[ RAK TV ]─┬BAR┬ · · · · · ▣ │tanaman
      ║                                       [meja kopi]    └───┘             │
      ║ jendela   kursi baca                  [  SOFA  ]          [kursi][kursi]│
      ║ (terang)    lampu                                         [ MEJA MAKAN ]│
      │ keranjang                                                  ↺ L3        │
      │ tanaman  [rak rendah][rak buku]                           [kursi][kursi]│
   5  └────────────────────────────────────────────────────────────────────────┘
      RUANG TAMU (x −7..3,5, z −0,3..5)                RUANG MAKAN (x 3,5..7)

  ┤ ├  bukaan pintu 0,9 m          ╡▮╞  pintu kamar mandi (tertutup saat pemilik di dalam)
  ░    area gelap                   ║    jendela
```

## Ruangan

| Ruangan | Batas (x, z) | Isi |
|---|---|---|
| Ruang tamu | −7..3,5, −0,3..5 | sofa, meja kopi (kolong), rak TV, kursi baca, lampu berdiri, rak rendah + rak buku, tanaman, keranjang kucing, jendela barat (matahari) |
| Ruang makan | 3,5..7, −0,3..5 | meja makan (kolong) + 4 kursi, tanaman; dipisah dari ruang tamu oleh konter bar |
| Dapur | 3,5..7, −5..−0,3 | konter, kulkas (tempat tinggi), pulau dapur, jendela timur |
| Lorong | −7..3,5, −1,5..−0,3 | gelap; dua bukaan ke ruang tamu, terbuka ke dapur di ujung timur |
| Kamar tidur | −7..−2,6, −5..−1,5 | kasur (kolong 0,28 m), lemari, meja rias + cermin, jendela bertirai (gelap) |
| Kamar mandi | −2,6..−0,4, −5..−1,5 | toilet, wastafel, gulungan tisu toilet, pintu berdaun |
| Ruang kerja | −0,4..3,5, −5..−1,5 | meja kerja + laptop + kursi berputar (pos kerja pemilik) |

## Loop kejar-kejaran

| Loop | Rute |
|---|---|
| L1 | ruang tamu → bukaan barat (x −5,2) → lorong → bukaan timur (x 0,6) → ruang tamu |
| L2 | ruang tamu → lorong → dapur → ruang makan → ruang tamu (memutari konter bar) |
| L3 | mengitari meja makan |
| L4 | mengitari pulau dapur |

## Jalan pintas khusus kucing

- **Rute atas:** dudukan sofa → meja kopi → rak TV → konter bar (lompat tinggi) → ruang makan/dapur. Pemilik harus memutar.
- **Kolong:** meja kopi (0,41 m) dan meja makan (0,70 m) bisa dilewati sambil berdiri; kasur (0,28 m) harus sambil mengendap. Kucing di kolong tidak terlihat dari jauh dan **tidak bisa diraih** pemilik.
- **Tempat tinggi (> 1,2 m):** atas kulkas (dari konter) dan atas rak buku (dari rak rendah).

## Titik rutinitas pemilik

| Kegiatan | Titik (x, z) |
|---|---|
| Kerja | 1,6, −3,95 (ruang kerja) |
| Minum | 4,75, −4,0 (depan konter dapur) |
| Jendela | −6,4, 2,3 (jendela ruang tamu) |
| Kamar tidur | −3,3, −3,9 (depan lemari) |
| Toilet | −1,5, −3,0 (di dalam kamar mandi, pintu ditutup) |

## Area gelap & terang

- Gelap (jangkauan pandang pemilik ×0,7): lorong, kamar tidur.
- Terang: depan jendela ruang tamu (berkas matahari & debu), dekat jendela dapur.
