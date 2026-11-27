// =====================================================================
// config.js — SEMUA angka penyetelan game ada di sini.
// Aturan proyek: angka penyetelan (kecepatan, gravitasi, ukuran, warna,
// timer, peluang spawn, dll.) selalu ditambahkan ke file ini, bukan
// ditulis langsung di modul lain. Modul lain hanya menyimpan detail
// geometri model (ukuran telinga kucing, kaki meja, dsb.).
// =====================================================================

// --- Skala dunia nyata (meter). Acuan semua model & collider. ---
// Rumah satu lantai 14 × 10 m (denah: docs/denah.md). WORLD_SCALE dipakai
// sebagai acuan saat skala diperbaiki (prototipe 22 × 20 m × 0,4).
export const WORLD_SCALE = 0.4;
export const REAL_SCALE = {
  cat: { SHOULDER: 0.25, EAR_TIP: 0.35, BODY_LENGTH: 0.45, TAIL: 0.3 },
  owner: { HEIGHT: 1.7 },
  sofa: { SEAT: 0.45, BACK: 0.85, DEPTH: 0.9, WIDTH: 2.0, LEGS: 0.28 }, // kaki 0,28 m: kolong untuk kucing mengendap
  coffeeTable: { HEIGHT: 0.45, WIDTH: 1.1, DEPTH: 0.6 },
  workDesk: { HEIGHT: 0.75, WIDTH: 1.2, DEPTH: 0.6, UNDERSIDE: 0.71 },
  chair: { SEAT: 0.45, WIDTH: 0.55 },
  counter: { HEIGHT: 0.9, WIDTH: 1.8, DEPTH: 0.6 },
  fridge: { HEIGHT: 1.8, WIDTH: 0.7, DEPTH: 0.65 },
  tvRack: { HEIGHT: 0.5, WIDTH: 1.6, DEPTH: 0.4 },
  bookshelf: { HEIGHT: 1.8, WIDTH: 0.8, DEPTH: 0.3 },
  lowShelf: { HEIGHT: 0.9, WIDTH: 0.9, DEPTH: 0.4 }, // batu loncatan ke rak buku
  island: { HEIGHT: 0.9, WIDTH: 1.2, DEPTH: 0.8 }, // pulau dapur
  barCounter: { HEIGHT: 0.9, WIDTH: 0.6 }, // konter bar pemisah ruang tamu–makan
  diningTable: { HEIGHT: 0.75, WIDTH: 1.6, DEPTH: 0.9, UNDERSIDE: 0.7 },
  diningChair: { SEAT: 0.45, WIDTH: 0.42 },
  bed: { HEIGHT: 0.55, WIDTH: 1.6, LENGTH: 2.0, UNDERSIDE: 0.28 },
  wardrobe: { HEIGHT: 2.0, WIDTH: 1.2, DEPTH: 0.6 },
  dresser: { HEIGHT: 0.75, WIDTH: 1.0, DEPTH: 0.45 }, // meja rias
  nightstand: { HEIGHT: 0.5, WIDTH: 0.45, DEPTH: 0.4 }, // nakas di sisi kepala kasur
  toilet: { SEAT: 0.42, TANK: 0.8 },
  sink: { HEIGHT: 0.85, WIDTH: 0.7, DEPTH: 0.45 },
  coffeeTableUnderside: 0.41,
  vacuum: { DIAMETER: 0.34, HEIGHT: 0.09 },
  glass: { HEIGHT: 0.12 },
  pot: { HEIGHT: 0.4 }, // rentang nyata 0,30–0,50
  plant: { HEIGHT: 1.0 },
  box: { HEIGHT_MIN: 0.4, HEIGHT_MAX: 0.5, SIZE: 0.45, HEIGHT: 0.4 }, // kardus
  door: { HEIGHT: 2.0, WIDTH: 0.85 },
  doorway: { WIDTH: 0.9 }, // bukaan pintu dalam rumah
  ceiling: 2.7
};
const RS = REAL_SCALE;

// --- Ruangan ---
export const ROOM = {
  WIDTH: 14, // batas luar rumah (x -7..7)
  DEPTH: 10, // (z -5..5)
  HEIGHT: RS.ceiling,
  WALL_THICKNESS: 0.15, // dinding luar
  INNER_WALL_THICKNESS: 0.12,
  BASEBOARD_HEIGHT: 0.09,
  BASEBOARD_DEPTH: 0.02,
  WINDOW_FRAME: { THICKNESS: 0.07, DEPTH: 0.19, MULLION: 0.05, GLASS_INSET: 0.06, BACKDROP_DISTANCE: 0.5, BACKDROP_PADDING: 1.6 }
};
export const ROOM_HALF_W = ROOM.WIDTH / 2;
export const ROOM_HALF_D = ROOM.DEPTH / 2;

// --- Denah rumah (lihat docs/denah.md). Utara = -Z. ---
// Zona terang yang membatalkan area gelap (mis. berkas cahaya bulan di
// Level 4). Diisi file level lewat LAYOUT.EXTRA_LIGHT_ZONES.
export const LIGHT_ZONES = [];

// Dinding dalam: axis 'x' = dinding membentang sepanjang X pada z = at;
// axis 'z' = membentang sepanjang Z pada x = at. openings: bukaan pintu
// (center di sepanjang dinding, lebar, tinggi).
const DW = RS.doorway.WIDTH;
export const HOUSE = {
  innerWalls: [
    // Kamar-kamar utara ↔ lorong (pintu kamar tidur, kamar mandi, ruang kerja)
    { axis: 'x', at: -1.5, from: -7, to: 3.5, openings: [
      { center: -3.4, width: DW, height: RS.door.HEIGHT }, // kamar tidur
      { center: -1.5, width: DW, height: RS.door.HEIGHT }, // kamar mandi (berdaun pintu)
      { center: 0.45, width: DW, height: RS.door.HEIGHT } // ruang kerja
    ] },
    // Lorong ↔ ruang tamu (dua bukaan = loop kecil)
    { axis: 'x', at: -0.3, from: -7, to: 3.5, openings: [
      { center: -5.2, width: DW, height: RS.door.HEIGHT },
      { center: 0.6, width: DW, height: RS.door.HEIGHT }
    ] },
    { axis: 'z', at: -2.6, from: -5, to: -1.5, openings: [] }, // kamar tidur | kamar mandi
    { axis: 'z', at: -0.4, from: -5, to: -1.5, openings: [] }, // kamar mandi | ruang kerja
    { axis: 'z', at: 3.5, from: -5, to: -1.5, openings: [] } // ruang kerja | dapur
  ],
  // Pintu depan di dinding selatan ruang tamu (Level 5: tamu datang). Selalu
  // tertutup bagi kucing (batas rumah); hanya dibuka saat adegan.
  frontDoor: { wall: 'south', center: 2.6, width: 0.9, height: 2.05 },
  // Jendela di dinding luar. type: 'sun' (cahaya matahari), 'plain', 'curtain' (tirai tertutup)
  windows: [
    { wall: 'west', from: 1.0, to: 3.6, yMin: 0.8, yMax: 2.2, type: 'sun' }, // ruang tamu
    { wall: 'west', from: -4.2, to: -2.6, yMin: 0.9, yMax: 2.1, type: 'curtain' }, // kamar tidur
    { wall: 'east', from: -3.6, to: -1.8, yMin: 1.0, yMax: 2.1, type: 'plain' } // dapur
  ],
  // Lantai keramik (sisanya kayu)
  tileFloors: [
    { minX: 3.5, maxX: 7, minZ: -5, maxZ: -0.3 }, // dapur
    { minX: -2.6, maxX: -0.4, minZ: -5, maxZ: -1.5 } // kamar mandi
  ],
  // Nama ruangan (untuk denah, debug, dan uji)
  rooms: {
    livingRoom: { minX: -7, maxX: 3.5, minZ: -0.3, maxZ: 5 },
    dining: { minX: 3.5, maxX: 7, minZ: -0.3, maxZ: 5 },
    kitchen: { minX: 3.5, maxX: 7, minZ: -5, maxZ: -0.3 },
    hallway: { minX: -7, maxX: 3.5, minZ: -1.5, maxZ: -0.3 },
    bedroom: { minX: -7, maxX: -2.6, minZ: -5, maxZ: -1.5 },
    bathroom: { minX: -2.6, maxX: -0.4, minZ: -5, maxZ: -1.5 },
    study: { minX: -0.4, maxX: 3.5, minZ: -5, maxZ: -1.5 }
  }
};

// --- Fisika umum ---
export const PHYSICS = {
  GRAVITY: -15,
  CLIMB_TOLERANCE: 0.05, // kaki boleh sedikit di bawah topHeight dan tetap dianggap di atas perabot
  MAX_DT: 0.05 // batas delta time per frame (detik)
};

// --- Kucing (pemain) ---
export const PLAYER = {
  RADIUS: 0.17,
  CENTER_HEIGHT: 0.18, // tinggi titik tengah badan untuk cek pickup
  START_POSITION: { x: -1.5, y: 0, z: 1.5 }, // ruang tamu
  START_YAW: Math.PI, // menghadap -Z saat awal
  // Kecepatan per mode gerak (m/detik). Perbandingan dipertahankan dari
  // Fase 3: kejar pemilik (OWNER.CHASE_SPEED) di antara jalan dan lari.
  WALK_SPEED: 2.5,
  RUN_SPEED: 4.0, // Shift, menguras stamina
  SNEAK_SPEED: 1.2, // C (tahan), senyap
  SPEED_CAP_DAMPING: 10, // seberapa cepat melambat saat ganti ke mode yang lebih lambat
  ACCELERATION: 18,
  GROUND_FRICTION: 10,
  AIR_FRICTION: 6, // tanpa input di udara kucing cepat mengerem (mendarat presisi di tepi sempit)
  LEDGE_ASSIST: 0.08, // toleransi mendarat di tepi perabot sempit (sandaran sofa, atas rak)
  // Kolong perabot: kucing lolos di bawah perabot dengan crawlHeight >= tinggi badannya
  HEIGHT_STAND: 0.35,
  HEIGHT_SNEAK: 0.26, // badan merendah saat mengendap
  STOP_SPEED: 0.02,
  TURN_SPEED: 12,
  JUMP_FORCE: 4.17, // lompat biasa (gratis), puncak ±0,58 m: dudukan sofa, meja kopi, kursi, rak TV
  HIGH_JUMP_FORCE: 5.48, // Shift + Spasi, puncak ±1,0 m: sandaran sofa, konter, meja kerja; biaya STAMINA.HIGH_JUMP_COST
  // Profil (seberapa mudah terlihat; dipakai penglihatan pemilik)
  NORMAL_PROFILE: 1.0,
  SNEAK_PROFILE: 0.5
};

// --- Suara langkah & gerak (radius noise dalam meter; 0 = senyap) ---
export const NOISE = {
  WALK_STEP_RADIUS: 0.4,
  RUN_STEP_RADIUS: 2,
  SNEAK_STEP_RADIUS: 0,
  LAND_RADIUS: 0.8,
  EVENT_LIFETIME: 0.8 // berapa lama event noise disimpan (untuk overlay debug)
};

// --- Interaksi (tombol E) ---
export const INTERACT = {
  RADIUS: 0.6,
  MAX_HEIGHT_DIFF: 0.5,
  MARKER_HEIGHT: 0.35, // tinggi penanda di atas objek
  MARKER_SIZE: 0.05,
  MARKER_COLOR: 0xfacc15,
  MARKER_BOB_SPEED: 4,
  MARKER_BOB_AMP: 0.03,
  MARKER_SPIN_SPEED: 2
};

// --- Overlay debug developer (F3) ---
export const DEBUG = {
  TOGGLE_KEY: 'F3',
  ENABLED_AT_START: false,
  NOISE_RING_COLOR: 0x38bdf8,
  NOISE_RING_OPACITY: 0.8,
  INTERACT_RING_COLOR: 0xfacc15,
  INTERACT_RING_OPACITY: 0.5,
  CONE_COLOR: 0xfacc15,
  CONE_SEEN_COLOR: 0xef4444,
  LOS_CLEAR_COLOR: 0x22c55e,
  LOS_BLOCKED_COLOR: 0xef4444,
  PATH_COLOR: 0xe879f9,
  DARK_ZONE_COLOR: 0x818cf8, // batas area gelap di lantai
  DARK_ZONE_OPACITY: 0.85,
  DARK_ZONE_BORDER: 0.06, // lebar pita batas (m)
  DARK_ZONE_INSET: 0.1, // jarak pita dari tepi zona (tepi zona = tengah dinding)
  LIGHTNING_KEY: 'KeyL', // (F3 terbuka, level hujan) picu kilat untuk menyetel visual
  LIGHTNING_HOLD: 1.5, // detik kilat ditahan saat dipicu dari debug
  SKIP_TIME_KEY: 'KeyT', // (F3 terbuka) majukan waktu level ke detik-detik terakhir
  SKIP_TIME_LEFT: 5
};

// --- Animasi kucing ---
export const CAT_ANIM = {
  WALK_SPEED_THRESHOLD: 0.15,
  // Di udara
  AIR_LEG_ANGLE: 0.75,
  AIR_LEG_LERP: 14,
  AIR_LEAN_FACTOR: 0.025,
  AIR_LEAN_MAX: 0.25,
  AIR_TAIL_FREQ: 10,
  AIR_TAIL_AMP: 0.25,
  LEAN_LERP: 10,
  // Berjalan
  WALK_CADENCE_BASE: 6,
  WALK_CADENCE_SPEED: 9,
  WALK_LEG_SWING: 0.65,
  WALK_BOB: 0.012,
  WALK_LEAN: 0.11,
  WALK_TAIL_FREQ: 1.1,
  WALK_TAIL_AMP: 0.38,
  // Diam
  IDLE_LERP: 12,
  IDLE_BREATH_FREQ: 2.6,
  IDLE_BREATH_AMP: 0.006,
  IDLE_TAIL_FREQ: 2.4,
  IDLE_TAIL_AMP: 0.16,
  // Pendaratan (squash & stretch)
  SQUASH_DURATION: 0.16,
  SQUASH_WIDEN: 0.12,
  SQUASH_FLATTEN: 0.16,
  // Kedip saat kebal
  BLINK_RATE: 12,
  // Mengendap: badan merendah
  CROUCH_LERP: 10,
  SNEAK_SQUASH: 0.28,
  SNEAK_WIDEN: 0.06,
  // Terengah (stamina habis)
  PANT_FREQ: 14,
  PANT_AMP: 0.01,
  // Mengeong: kepala mendongak
  MEOW_DURATION: 0.6,
  MEOW_HEAD_TILT: 0.5,
  // Aksi kenakalan
  SWIPE_REACH: 1.1, // kaki depan menyapu/menepuk
  SWIPE_RETRACT: 0.25,
  SWIPE_LEAN: 0.12,
  PUSH_REACH: 1.25, // dorong gelas pelan
  PUSH_TAP_AMP: 0.1,
  PUSH_TAP_FREQ: 10,
  STARE_MAX_YAW: 1.3, // batas menoleh ke kamera (radian)
  STARE_HEAD_TILT: 0.12,
  STARE_BLEND_IN: 0.15,
  SCRATCH_REACH: 1.0,
  SCRATCH_SWING: 0.45,
  SCRATCH_REAR: 0.35, // badan berdiri saat mencakar
  SCRATCH_BLEND: 0.15,
  STOMP_REACH: 0.8,
  STOMP_HOP: 0.025,
  BITE_HEAD_DIP: 0.5,
  BITE_LEAN: 0.25
};

// --- Aturan game ---
export const GAME = {
  MAX_LIVES: 3
};

// --- Ikan camilan (menggantikan kristal; GDD §11) ---
export const FISH = {
  RADIUS: 0.15, // radius untuk ambil & spawn
  MODEL_SCALE: 0.4, // panjang ±0,18 m
  HOVER_HEIGHT: 0.12,
  SPIN_SPEED: 1.6,
  BOB_SPEED: 3,
  BOB_AMP: 0.025,
  RESPAWN_DELAY: 12, // detik setelah dimakan
  FURNITURE_SPAWN_CHANCE: 0.35, // peluang muncul di atas perabot yang bisa dinaiki
  FURNITURE_SPAWN_ATTEMPTS: 20,
  FURNITURE_EDGE_PAD: 0.05,
  MIN_PLAYER_DIST_FURNITURE: 0.8,
  MIN_PLAYER_DIST_FLOOR: 1.0
};

// --- Robot vacuum (rintangan) ---
export const VACUUM = {
  RADIUS: RS.vacuum.DIAMETER / 2,
  HEIGHT: RS.vacuum.HEIGHT,
  BASE_SPEED: 0.6, // mendekati robot asli, nyaman ditumpangi
  SPIN_SPEED: 2.5,
  // Pola berkeliaran: jalan lurus, berbelok acak saat menabrak / sesekali
  TURN_RATE: 2.5, // rad/detik saat berbelok
  BOUNCE_TURN_MIN: 1.6, // sudut belok saat menabrak (rad)
  BOUNCE_TURN_MAX: 3.6,
  WANDER_INTERVAL_MIN: 4, // belok acak sesekali (detik)
  WANDER_INTERVAL_MAX: 9,
  WANDER_TURN: 1.2, // besar belok acak (rad)
  INITIAL_COUNT: 2,
  MIN_PLAYER_DIST: 1.5,
  SUBSTEP_THRESHOLD: 0.12, // jika langkah per frame > ini, pecah jadi 2 sub-step
  WALL_CHECK_SHRINK: 0.04,
  BLOCK_HEIGHT: 0.12, // kucing di bawah ketinggian ini tertahan tubuh robot
  CAT_AVOID_MARGIN: 0.04, // robot berbelok sebelum menabrak kucing (tidak mendorongnya)
  // Saat pemilik MENGEJAR: robot di dekat kejaran menyingkir ke sisi lalu diam
  YIELD_RADIUS: 5, // robot dalam jarak ini dari kucing/pemilik ikut menyingkir
  YIELD_PROBE: 0.8, // jarak cari dinding di samping robot
  YIELD_SPEED: 0.6,
  YIELD_WALL_GAP: 0.02, // berhenti sedekat ini dari dinding
  YIELD_RESUME_DELAY: 1.5 // detik diam setelah kejaran selesai
};

// --- Pencarian posisi spawn bebas ---
export const SPAWN = {
  WALL_MARGIN_EXTRA: 0.15,
  FURNITURE_MARGIN_EXTRA: 0.1,
  RANGE_MARGIN: 0.25,
  MAX_ATTEMPTS: 60,
  FALLBACK_POSITION: { x: -1.5, z: 1.5 }
};

// --- Kamera third-person ---
export const CAMERA = {
  FOV: 58,
  NEAR: 0.05,
  FAR: 40,
  // Orbit third-person mengelilingi titik fokus di atas kucing
  FOCUS_HEIGHT: 0.2,
  FOCUS_SMOOTHING: 12, // laju titik fokus mengejar kucing (lebih besar = lebih kaku)
  DISTANCE: 2.6, // jarak awal
  MIN_DISTANCE: 1.0, // zoom terdekat (scroll)
  MAX_DISTANCE: 4.0, // zoom terjauh
  ZOOM_STEP: 0.0015, // meter per unit deltaY roda mouse (±0,15 m per klik roda)
  ZOOM_SMOOTHING: 10,
  PITCH_DEFAULT_DEG: 28,
  PITCH_MIN_DEG: 5, // tidak menembus lantai
  PITCH_MAX_DEG: 65, // tidak terlalu tegak
  MOUSE_SENSITIVITY: 0.0025, // radian per piksel
  INVERT_Y: false,
  // Kembali ke belakang kucing jika mouse diam saat kucing berjalan
  AUTO_RECENTER: true,
  RECENTER_DELAY: 3,
  RECENTER_SPEED: 1.5, // rad/detik
  RECENTER_MIN_CAT_SPEED: 0.3,
  RECENTER_MAX_ANGLE_DEG: 135, // jangan recenter jika kamera perlu berputar lebih dari ini (kucing berjalan ke arah kamera)
  // Spring arm: kamera tidak pernah keluar dari ruangan
  WALL_MARGIN: 0.2, // jarak minimum kamera ke dinding & plafon
  FLOOR_MIN: 0.15, // tinggi minimum kamera dari lantai
  MIN_ARM: 0.3,
  ARM_IN_RATE: 15, // memendek cepat (eksponensial, per detik)
  ARM_OUT_SPEED: 1.5, // memanjang lagi pelan (m/detik)
  // Kamera dramatis saat KETAHUAN: berputar ke samping pemilik & kucing
  CAPTURE_PITCH_DEG: 18,
  CAPTURE_FOCUS_HEIGHT: 0.8,
  CAPTURE_MIN_DISTANCE: 2.2,
  CAPTURE_SPAN_FACTOR: 1.3, // jarak kamera ≥ jarak pemilik–kucing × ini
  CAPTURE_BLEND_RATE: 2.5
};

// --- Perabot yang menghalangi pandangan kamera ke kucing memudar ---
export const CAMERA_OCCLUSION = {
  FADE_OPACITY: 0.3,
  FADE_SPEED: 8,
  CAMERA_PADDING: 0.1 // kamera dianggap "di dalam" perabot jika sedekat ini
};

// --- Layar bantuan (daftar kontrol) ---
export const HELP = {
  TOGGLE_KEY: 'KeyH',
  AUTO_SHOW_SECONDS: 10 // muncul otomatis sekali saat game pertama dibuka
};

// --- Renderer & atmosfer ---
export const RENDERER = {
  ANTIALIAS: true,
  MAX_PIXEL_RATIO: 2,
  TONE_MAPPING_EXPOSURE: 1.05,
  BACKGROUND_COLOR: 0x1f1914,
  FOG_COLOR: 0x2b221a,
  FOG_NEAR: 7,
  FOG_FAR: 17
};

// --- Pencahayaan (maksimal 2 shadow caster aktif) ---
export const LIGHTS = {
  hemi: { skyColor: 0xfff4e0, groundColor: 0x7d5836, intensity: 0.6 },
  // Satu-satunya lampu dengan bayangan: matahari lewat jendela ruang tamu (barat)
  sun: {
    color: 0xffe8c2,
    intensity: 1.35,
    position: [-10.5, 3.0, 2.3],
    target: [-3, 0, 2.3],
    shadowMapSize: 2048,
    shadowCamera: { near: 1, far: 22, left: -6, right: 6, top: 4, bottom: -4 },
    shadowBias: -0.0006
  },
  // Lampu ruangan tanpa bayangan (murah)
  points: [
    { name: 'lamp', color: 0xffcb85, intensity: 1.0, distance: 6, decay: 2, position: [-5.4, 1.45, 3.7] }, // lampu berdiri ruang tamu
    { name: 'living', color: 0xffe6cc, intensity: 0.45, distance: 7, decay: 2, position: [1.5, 2.4, 2.0] },
    { name: 'kitchen', color: 0xfff1dc, intensity: 0.7, distance: 6.5, decay: 2, position: [5.2, 2.4, -1.5] },
    { name: 'study', color: 0xe8f0ff, intensity: 0.45, distance: 4.5, decay: 2, position: [1.6, 2.3, -3.2] }
  ]
};

// --- Tekstur prosedural ---
export const TEXTURES = {
  woodFloor: {
    SIZE: 512,
    ROWS: 8,
    COLS: 2,
    ROW_OFFSET: 128,
    BASE_COLOR: '#9c6b43',
    TONES: ['#a47148', '#8f5f39', '#b07b4f', '#97663e', '#845633'],
    GRAIN_COLOR: 'rgba(58, 34, 16, 0.16)',
    GRAIN_WIDTH: 1.2,
    GRAIN_LINES: 9,
    SEAM_COLOR: 'rgba(42, 24, 12, 0.45)',
    SEAM_WIDTH: 2,
    TILE_METERS: 1.76 // satu ulangan tekstur = 1,76 m
  },
  tile: {
    SIZE: 256,
    COUNT: 4, // ubin per sisi tekstur
    TILE_METERS: 1.2,
    BASE_COLOR: '#e7e2d8',
    ALT_COLOR: '#dcd5c8',
    GROUT_COLOR: '#b9b0a2',
    GROUT_WIDTH: 3
  },
  rug: {
    SIZE: 256,
    BASE_COLOR: '#c8b6a6',
    BORDER_COLOR: '#8d6e63',
    INNER_BORDER_COLOR: '#a47e65',
    WEAVE_COLOR: 'rgba(255, 255, 255, 0.06)'
  }
};

// --- Material & warna (parameter MeshStandardMaterial / MeshBasicMaterial) ---
export const MATERIALS = {
  // Ruangan
  floor: { roughness: 0.62, metalness: 0.05 },
  ceiling: { color: 0xf4efe6, roughness: 0.9, metalness: 0.0 },
  wall: { color: 0xe7ded0, roughness: 0.88, metalness: 0.02 },
  trim: { color: 0x5c3d28, roughness: 0.6, metalness: 0.05 },
  windowBackdrop: { color: 0xfff3d1 },
  glass: { color: 0xfff8e7, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.1 },
  // Perabotan
  woodDark: { color: 0x5d3a22, roughness: 0.55, metalness: 0.08 },
  woodWarm: { color: 0x8b5a36, roughness: 0.6, metalness: 0.05 },
  fabricSofa: { color: 0x4b6b78, roughness: 0.9, metalness: 0.02 },
  cushion: { color: 0xe6a15c, roughness: 0.85, metalness: 0.02 },
  metalDark: { color: 0x22262b, roughness: 0.35, metalness: 0.75 },
  metalBrass: { color: 0xd4a853, roughness: 0.3, metalness: 0.8 },
  rug: { roughness: 0.95, metalness: 0.0 },
  mug: { color: 0xf8fafc, roughness: 0.3 },
  tvScreen: { color: 0x0f172a, roughness: 0.15, metalness: 0.45, emissive: 0x0b1628, emissiveIntensity: 0.4 },
  book: { roughness: 0.75 },
  bookColors: [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899],
  lampShade: { color: 0xfff3db, emissive: 0xffb85c, emissiveIntensity: 0.75, roughness: 0.6 },
  pot: { color: 0xb85d3b, roughness: 0.75 },
  soil: { color: 0x3b281c, roughness: 0.95 },
  leaf: { color: 0x2e7d32, roughness: 0.65 },
  // Kucing
  catFurMain: { color: 0xf59e42, roughness: 0.75, metalness: 0.02 },
  catFurLight: { color: 0xfde6c4, roughness: 0.75, metalness: 0.02 },
  catPink: { color: 0xf472b6, roughness: 0.6 },
  catEye: { color: 0x111827, roughness: 0.2, metalness: 0.2 },
  // Pojok dapur
  counterBody: { color: 0xf1ede4, roughness: 0.7, metalness: 0.02 },
  counterTop: { color: 0x6b7280, roughness: 0.35, metalness: 0.15 },
  fridge: { color: 0xe5e7eb, roughness: 0.3, metalness: 0.25 },
  plate: { color: 0xf8fafc, roughness: 0.35 },
  // Ikan (camilan & ikan dapur)
  fishBody: { color: 0x8fb3c9, roughness: 0.35, metalness: 0.35 },
  fishFin: { color: 0xf59e0b, roughness: 0.5 },
  fishEye: { color: 0x0f172a, roughness: 0.2 },
  // Objek kenakalan
  drinkGlass: { color: 0xdbeafe, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1 },
  drinkWater: { color: 0x7dd3fc, transparent: true, opacity: 0.6, roughness: 0.1 },
  glassShard: { color: 0xe0f2fe, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.2 },
  tissueBox: { color: 0x60a5fa, roughness: 0.7 },
  tissue: { color: 0xfafafa, roughness: 0.95 },
  remote: { color: 0x1f2937, roughness: 0.5, metalness: 0.2 },
  remoteButton: { color: 0xef4444, roughness: 0.4 },
  scratchMark: { color: 0x1e2f36, roughness: 1.0 },
  fluff: { color: 0xd6e2e6, roughness: 1.0 },
  soilSpill: { color: 0x3b281c, roughness: 1.0 },
  tvOn: { color: 0xffffff, emissiveIntensity: 1.0, roughness: 0.3 },
  // Rumah: dapur, makan, kamar tidur, kamar mandi
  tileFloor: { roughness: 0.4, metalness: 0.02 },
  curtain: { color: 0x3f4f6b, roughness: 0.95 },
  islandBody: { color: 0x6b8f71, roughness: 0.7 },
  bedFrame: { color: 0x6b4a33, roughness: 0.6 },
  mattress: { color: 0xf3efe6, roughness: 0.95 },
  pillow: { color: 0xffffff, roughness: 0.95 },
  blanket: { color: 0x7c9cc9, roughness: 0.95 },
  wardrobe: { color: 0xc9a77c, roughness: 0.6 },
  mirror: { color: 0xdbe7f0, roughness: 0.05, metalness: 0.9 },
  porcelain: { color: 0xf8fafc, roughness: 0.25, metalness: 0.05 },
  toiletPaper: { color: 0xfbfaf5, roughness: 0.95 },
  chrome: { color: 0xcbd5e1, roughness: 0.2, metalness: 0.9 },
  bathMat: { color: 0x8ec5c2, roughness: 1.0 },
  // Item & rintangan
  // Pemilik rumah
  ownerSkin: { color: 0xe0ac80, roughness: 0.7 },
  ownerHair: { color: 0x3b2618, roughness: 0.85 },
  ownerShirt: { color: 0x5b8bd6, roughness: 0.85 },
  ownerPants: { color: 0x9ca3af, roughness: 0.9 },
  ownerShoes: { color: 0xf3f4f6, roughness: 0.6 },
  ownerMug: { color: 0xef4444, roughness: 0.4 },
  // Pos kerja, pintu, keranjang
  deskTop: { color: 0xd6c2a3, roughness: 0.55, metalness: 0.05 },
  deskLeg: { color: 0x374151, roughness: 0.4, metalness: 0.6 },
  deskChair: { color: 0x1f2937, roughness: 0.6, metalness: 0.2 },
  laptop: { color: 0x9ca3af, roughness: 0.35, metalness: 0.6 },
  laptopScreen: { color: 0xbfdbfe, emissive: 0x60a5fa, emissiveIntensity: 0.8, roughness: 0.3 },
  door: { color: 0xc8a27a, roughness: 0.6 },
  doorFrame: { color: 0x5c3d28, roughness: 0.6 },
  doorHandle: { color: 0xd4a853, roughness: 0.3, metalness: 0.8 },
  corridor: { color: 0x0b0a09 },
  basket: { color: 0xb07a3f, roughness: 0.9 },
  basketCushion: { color: 0xe8a0a8, roughness: 0.95 },
  cardboard: { color: 0xc49a6c, roughness: 0.95 },
  cardboardDark: { color: 0x7a5c3a, roughness: 1.0 },
  catEyeGlow: { color: 0xfde047 },
  yarn: { color: 0xe11d48, roughness: 0.95 },
  yarnStrand: { color: 0xbe123c, roughness: 0.95 },
  catnipLeaf: { color: 0x65a30d, roughness: 0.7 },
  catnipGlow: { color: 0xbef264, emissive: 0x84cc16, emissiveIntensity: 0.6, roughness: 0.6 },
  vacuumBody: { color: 0x27272a, roughness: 0.35, metalness: 0.55 },
  vacuumRing: { color: 0xdc2626, roughness: 0.3, metalness: 0.3 },
  vacuumSensor: { color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.7, roughness: 0.2 }
};

// --- Tata letak perabotan (posisi grup & collider AABB) ---
// Collider: koordinat dunia. topHeight = tinggi permukaan atas,
// climbable = kucing bisa mendarat/berdiri di atasnya.
// Urutan collider penting: menentukan urutan resolusi tabrakan.
export const FURNITURE_LAYOUT = {
  // ---------------- RUANG TAMU ----------------
  rug: { x: 2.0, z: 1.2, width: 2.6, depth: 1.9 },
  // Sofa: dudukan menghadap utara (-Z, ke TV), sandaran di sisi selatan
  sofa: {
    x: 2.0, z: 1.75,
    colliders: [
      { x: 2.0, z: 1.64, width: RS.sofa.WIDTH, depth: 0.68, topHeight: RS.sofa.SEAT, climbable: true, crawlHeight: RS.sofa.LEGS, hideSpot: true }, // dudukan + kolong
      { x: 2.0, z: 2.09, width: RS.sofa.WIDTH, depth: 0.22, topHeight: RS.sofa.BACK, climbable: true } // sandaran
    ]
  },
  // Meja kopi: kolongnya bisa dilewati kucing (berdiri)
  coffeeTable: {
    x: 2.0, z: 0.72,
    colliders: [{ x: 2.0, z: 0.72, width: RS.coffeeTable.WIDTH, depth: RS.coffeeTable.DEPTH, topHeight: RS.coffeeTable.HEIGHT, climbable: true, crawlHeight: RS.coffeeTableUnderside, hideSpot: false }] // kolong terbuka: bisa dilewati, bukan tempat sembunyi
  },
  // Rak TV menempel dinding lorong; bagian rute atas sofa → meja kopi → rak TV → konter bar
  tvUnit: {
    x: 2.3, z: -0.04,
    colliders: [{ x: 2.3, z: -0.04, width: RS.tvRack.WIDTH, depth: RS.tvRack.DEPTH, topHeight: RS.tvRack.HEIGHT, climbable: true }]
  },
  chair: { // kursi baca
    x: -4.6, z: 2.8,
    colliders: [{ x: -4.6, z: 2.8, width: RS.chair.WIDTH, depth: RS.chair.WIDTH, topHeight: RS.chair.SEAT, climbable: true }]
  },
  floorLamp: {
    x: -5.4, z: 3.7,
    colliders: [{ x: -5.4, z: 3.7, width: 0.4, depth: 0.4, topHeight: 1.6, climbable: false, occludes: false }]
  },
  // Rak rendah + rak buku di dinding selatan, menghadap utara (rak rendah = batu loncatan)
  lowShelf: {
    x: -2.0, z: 4.8,
    colliders: [{ x: -2.0, z: 4.8, width: RS.lowShelf.WIDTH, depth: RS.lowShelf.DEPTH, topHeight: RS.lowShelf.HEIGHT, climbable: true }]
  },
  tallShelf: {
    x: -1.15, z: 4.85,
    colliders: [{ x: -1.15, z: 4.85, width: RS.bookshelf.WIDTH, depth: RS.bookshelf.DEPTH, topHeight: RS.bookshelf.HEIGHT, climbable: true }]
  },
  plants: {
    positions: [{ x: -6.5, z: 4.5 }, { x: 6.55, z: 0.15 }], // ruang tamu (sudut barat daya), ruang makan (sudut timur laut)
    collider: { width: 0.45, depth: 0.45, topHeight: RS.plant.HEIGHT, climbable: false, occludes: false }
  },
  // Konter bar: pemisah ruang tamu–ruang makan (pemilik memutar, kucing melompat)
  barCounter: {
    x: 3.8, z: 0.2,
    colliders: [{ x: 3.8, z: 0.2, width: RS.barCounter.WIDTH, depth: 1.0, topHeight: RS.barCounter.HEIGHT, climbable: true }]
  },
  // ---------------- DAPUR ----------------
  kitchenCounter: {
    x: 4.75, z: -4.7,
    colliders: [{ x: 4.75, z: -4.7, width: 2.3, depth: RS.counter.DEPTH, topHeight: RS.counter.HEIGHT, climbable: true }]
  },
  fridge: {
    x: 6.4, z: -4.675,
    colliders: [{ x: 6.4, z: -4.675, width: RS.fridge.WIDTH, depth: RS.fridge.DEPTH, topHeight: RS.fridge.HEIGHT, climbable: true }] // tempat tinggi: dari konter
  },
  island: {
    x: 5.2, z: -2.5,
    colliders: [{ x: 5.2, z: -2.5, width: RS.island.WIDTH, depth: RS.island.DEPTH, topHeight: RS.island.HEIGHT, climbable: true }]
  },
  // ---------------- RUANG MAKAN ----------------
  diningTable: {
    x: 5.25, z: 2.8,
    colliders: [{ x: 5.25, z: 2.8, width: RS.diningTable.WIDTH, depth: RS.diningTable.DEPTH, topHeight: RS.diningTable.HEIGHT, climbable: true, crawlHeight: RS.diningTable.UNDERSIDE, hideSpot: true }]
  },
  diningChairs: {
    // yaw: arah hadap kursi (ke meja)
    positions: [
      { x: 4.85, z: 1.93, yaw: 0 }, { x: 5.65, z: 1.93, yaw: 0 },
      { x: 4.85, z: 3.67, yaw: Math.PI }, { x: 5.65, z: 3.67, yaw: Math.PI }
    ],
    collider: { width: RS.diningChair.WIDTH, depth: RS.diningChair.WIDTH, topHeight: RS.diningChair.SEAT, climbable: true }
  },
  // ---------------- RUANG KERJA ----------------
  workDesk: {
    x: 1.6, z: -4.7,
    colliders: [{ x: 1.6, z: -4.7, width: RS.workDesk.WIDTH, depth: RS.workDesk.DEPTH, topHeight: RS.workDesk.HEIGHT, climbable: true, crawlHeight: RS.workDesk.UNDERSIDE, hideSpot: true }]
  },
  workChair: {
    x: 1.6, z: -3.95,
    colliders: [{ x: 1.6, z: -3.95, width: 0.5, depth: 0.5, topHeight: RS.chair.SEAT, climbable: false, occludes: false, navBlocks: false }]
  },
  // ---------------- KAMAR TIDUR ----------------
  // Kasur: kolong 0,28 m, kucing harus mengendap untuk masuk
  bed: {
    x: -5.2, z: -3.9,
    colliders: [{ x: -5.2, z: -3.9, width: RS.bed.WIDTH, depth: RS.bed.LENGTH, topHeight: RS.bed.HEIGHT, climbable: true, crawlHeight: RS.bed.UNDERSIDE, hideSpot: true }]
  },
  wardrobe: {
    x: -3.3, z: -4.7,
    colliders: [{ x: -3.3, z: -4.7, width: RS.wardrobe.WIDTH, depth: RS.wardrobe.DEPTH, topHeight: RS.wardrobe.HEIGHT, climbable: false }]
  },
  nightstand: {
    x: -6.5, z: -4.55, // sisi kepala kasur, antara kasur & dinding barat
    colliders: [{ x: -6.5, z: -4.55, width: RS.nightstand.WIDTH, depth: RS.nightstand.DEPTH, topHeight: RS.nightstand.HEIGHT, climbable: true }]
  },
  dresser: {
    x: -5.6, z: -1.8, // menempel dinding lorong, cermin di dinding
    colliders: [{ x: -5.6, z: -1.8, width: RS.dresser.WIDTH, depth: RS.dresser.DEPTH, topHeight: RS.dresser.HEIGHT, climbable: true }]
  },
  // ---------------- KAMAR MANDI ----------------
  toilet: {
    x: -1.9, z: -4.66,
    colliders: [
      { x: -1.9, z: -4.57, width: 0.42, depth: 0.5, topHeight: RS.toilet.SEAT, climbable: true }, // dudukan
      { x: -1.9, z: -4.91, width: 0.42, depth: 0.18, topHeight: RS.toilet.TANK, climbable: true } // tangki
    ]
  },
  sink: {
    x: -0.85, z: -4.775,
    colliders: [{ x: -0.85, z: -4.775, width: RS.sink.WIDTH, depth: RS.sink.DEPTH, topHeight: RS.sink.HEIGHT, climbable: true }]
  }
};

// --- Partikel saat mengambil camilan ---
export const PICKUP_PARTICLES = {
  COUNT: 12,
  SIZE: 0.04,
  COLOR: 0x7dd3fc,
  SPEED_MIN: 1.0,
  SPEED_RANGE: 1.6,
  UP_MIN: 1.2,
  UP_RANGE: 1.6,
  LIFE: 0.45,
  GRAVITY_SCALE: 0.5,
  SPIN_SPEED: 6,
  MIN_SCALE: 0.01
};

// --- Partikel debu cahaya di dekat jendela ---
export const DUST = {
  COUNT: 80,
  COLOR: 0xfff3c4,
  SIZE: 0.03,
  OPACITY: 0.55,
  // Berkas cahaya di depan jendela ruang tamu (dinding barat)
  SPAWN: { X_MIN: -6.85, X_RANGE: 2.6, Y_MIN: 0.35, Y_RANGE: 1.85, Z_MIN: 1.0, Z_RANGE: 2.6 },
  VELOCITY: { X_SCALE: 0.06, X_BIAS: 0.3, Y_SCALE: 0.05, Z_SCALE: 0.06 },
  WRAP: {
    X_MAX: -4.2, X_MAX_RESET: -6.85,
    X_MIN: -6.95, X_MIN_RESET: -4.3,
    Y_MAX: 2.3, Y_MAX_RESET: 0.35,
    Y_MIN: 0.3, Y_MIN_RESET: 2.2,
    Z_MAX: 3.65, Z_MAX_RESET: 1.0,
    Z_MIN: 0.95, Z_MIN_RESET: 3.6
  }
};

// --- Efek suara (Web Audio) ---
// Tiap nada: [freqStart, freqEnd, duration, type, volume, delay]
export const AUDIO = {
  MIN_FREQ: 20,
  FADE_TO: 0.001,
  SFX: {
    jump: [[260, 520, 0.12, 'sine', 0.12, 0]],
    gameOver: [
      [300, 220, 0.15, 'triangle', 0.16, 0],
      [220, 150, 0.18, 'triangle', 0.16, 0.14],
      [150, 90, 0.28, 'sawtooth', 0.14, 0.3]
    ],
    pant: [
      [320, 220, 0.12, 'triangle', 0.08, 0],
      [320, 220, 0.12, 'triangle', 0.08, 0.3],
      [320, 220, 0.12, 'triangle', 0.08, 0.6]
    ],
    robotBeep: [[880, 1320, 0.08, 'square', 0.04, 0], [1320, 1760, 0.08, 'square', 0.04, 0.09]],
    kick: [[220, 140, 0.08, 'sine', 0.12, 0]],
    yarnStop: [[330, 300, 0.06, 'triangle', 0.05, 0]],
    catnip: [
      [660, 990, 0.1, 'triangle', 0.1, 0],
      [880, 1320, 0.1, 'triangle', 0.1, 0.08],
      [1175, 1760, 0.14, 'triangle', 0.1, 0.16]
    ],
    fishEat: [
      [500, 760, 0.08, 'sine', 0.13, 0],
      [760, 1040, 0.12, 'triangle', 0.11, 0.07]
    ],
    shatter: [
      [2600, 2400, 0.12, 'triangle', 0.06, 0.02],
      [3300, 3000, 0.1, 'triangle', 0.05, 0.08],
      [2900, 2700, 0.14, 'triangle', 0.04, 0.15]
    ],
    potThud: [[140, 50, 0.3, 'sine', 0.22, 0]],
    tvOn: [[1000, 1000, 0.1, 'sine', 0.08, 0]],
    bite: [
      [300, 520, 0.07, 'square', 0.05, 0],
      [320, 560, 0.07, 'square', 0.05, 0.12]
    ],
    chaos: [[523, 784, 0.12, 'sine', 0.1, 0]],
    combo: [
      [660, 660, 0.07, 'triangle', 0.1, 0],
      [880, 880, 0.07, 'triangle', 0.1, 0.07],
      [1046, 1046, 0.12, 'triangle', 0.1, 0.14]
    ],
    star: [[880, 1320, 0.25, 'triangle', 0.12, 0]],
    timerTick: [[1000, 1000, 0.05, 'square', 0.04, 0]],
    suspicious: [[520, 700, 0.15, 'sine', 0.08, 0]], // "?"
    bellStep: [[2600, 2450, 0.12, 'sine', 0.025, 0], [3300, 3150, 0.1, 'sine', 0.018, 0.03]], // kalung lonceng
    tutorialStep: [[660, 660, 0.09, 'sine', 0.08, 0], [990, 990, 0.14, 'sine', 0.08, 0.09]], // langkah latihan selesai
    kettle: [[1800, 2100, 0.6, 'sine', 0.03, 0.4], [1900, 2200, 0.8, 'sine', 0.03, 1.0]], // ceret teh (Level 3)
    windowClose: [[220, 160, 0.12, 'square', 0.06, 0], [180, 140, 0.1, 'square', 0.05, 0.1]], // jendela ditutup
    cricket: [[4300, 4250, 0.04, 'sine', 0.012, 0], [4300, 4250, 0.04, 'sine', 0.012, 0.07], [4300, 4250, 0.04, 'sine', 0.012, 0.14]], // jangkrik samar
    clockTick: [[2400, 1800, 0.015, 'square', 0.012, 0]], // detak jam
    alarmRing: [[1500, 1500, 0.08, 'square', 0.05, 0], [1500, 1500, 0.08, 'square', 0.05, 0.15], [1500, 1500, 0.08, 'square', 0.05, 0.3], [1500, 1500, 0.08, 'square', 0.05, 0.45], [1500, 1500, 0.08, 'square', 0.05, 0.6], [1500, 1500, 0.08, 'square', 0.05, 0.75]], // jam beker berdering
    ownerYawn: [[220, 160, 0.6, 'sawtooth', 0.04, 0]], // pemilik terbangun
    doorbell: [[784, 784, 0.35, 'sine', 0.09, 0], [659, 659, 0.5, 'sine', 0.09, 0.35]], // ding-dong
    pusPus: [[1300, 1700, 0.08, 'triangle', 0.05, 0], [1300, 1700, 0.08, 'triangle', 0.05, 0.16]], // "Pus, pus!"
    guestLaugh: [[420, 360, 0.09, 'sawtooth', 0.05, 0], [440, 370, 0.09, 'sawtooth', 0.05, 0.13], [460, 380, 0.09, 'sawtooth', 0.05, 0.26], [430, 350, 0.12, 'sawtooth', 0.045, 0.39]], // tawa tamu
    purr: [[55, 50, 0.4, 'sawtooth', 0.04, 0]], // dengkur
    fishTreat: [[880, 1320, 0.12, 'sine', 0.06, 0]], // camilan dari tamu
    tidy: [[520, 660, 0.1, 'triangle', 0.05, 0], [660, 880, 0.12, 'triangle', 0.05, 0.12]], // pemilik membereskan (Bonus)
    chaosLoss: [[440, 260, 0.25, 'triangle', 0.07, 0]], // Chaos berkurang
    lhoKok: [[300, 520, 0.18, 'sine', 0.07, 0], [520, 360, 0.2, 'sine', 0.06, 0.2]], // "Lho, kok?!"
    duster: [[1400, 1100, 0.06, 'triangle', 0.03, 0]], // kemoceng digigit/dilepas
    frontDoor: [[200, 140, 0.25, 'square', 0.035, 0]], // pintu depan
    meetingBusted: [[880, 300, 0.35, 'square', 0.07, 0], [600, 200, 0.4, 'square', 0.06, 0.12]], // ketahuan berisik saat rapat
    alarm: [
      [880, 880, 0.08, 'square', 0.08, 0],
      [1175, 1175, 0.16, 'square', 0.08, 0.09]
    ], // "!"
    caught: [
      [90, 40, 0.5, 'sine', 0.35, 0],
      [180, 60, 0.3, 'triangle', 0.18, 0]
    ], // dentum KETAHUAN!
    flush: [[300, 120, 0.8, 'sine', 0.06, 0.1]],
    win: [
      [523, 523, 0.12, 'triangle', 0.14, 0],
      [659, 659, 0.12, 'triangle', 0.14, 0.12],
      [784, 784, 0.12, 'triangle', 0.14, 0.24],
      [1046, 1046, 0.3, 'triangle', 0.14, 0.36]
    ]
  },
  // Ledakan noise (white noise terfilter). Tiap item:
  // { DURATION, VOLUME, FILTER: 'highpass'|'lowpass'|'bandpass', FREQ, Q, DELAY }
  NOISE_SFX: {
    shatter: [{ DURATION: 0.35, VOLUME: 0.22, FILTER: 'highpass', FREQ: 3000, Q: 0.7, DELAY: 0 }],
    scratch: [
      { DURATION: 0.08, VOLUME: 0.12, FILTER: 'bandpass', FREQ: 2500, Q: 1.2, DELAY: 0 },
      { DURATION: 0.08, VOLUME: 0.12, FILTER: 'bandpass', FREQ: 2200, Q: 1.2, DELAY: 0.15 },
      { DURATION: 0.08, VOLUME: 0.12, FILTER: 'bandpass', FREQ: 2600, Q: 1.2, DELAY: 0.3 }
    ],
    tissue: [{ DURATION: 0.35, VOLUME: 0.1, FILTER: 'lowpass', FREQ: 1500, Q: 0.7, DELAY: 0 }],
    potThud: [{ DURATION: 0.4, VOLUME: 0.2, FILTER: 'lowpass', FREQ: 400, Q: 0.7, DELAY: 0 }],
    tvOn: [{ DURATION: 0.9, VOLUME: 0.07, FILTER: 'bandpass', FREQ: 3000, Q: 0.5, DELAY: 0.08 }],
    caught: [{ DURATION: 0.35, VOLUME: 0.25, FILTER: 'lowpass', FREQ: 300, Q: 0.7, DELAY: 0 }],
    toiletPaper: [
      { DURATION: 0.25, VOLUME: 0.07, FILTER: 'bandpass', FREQ: 1800, Q: 0.8, DELAY: 0 },
      { DURATION: 0.25, VOLUME: 0.07, FILTER: 'bandpass', FREQ: 1600, Q: 0.8, DELAY: 0.45 },
      { DURATION: 0.4, VOLUME: 0.06, FILTER: 'bandpass', FREQ: 1400, Q: 0.8, DELAY: 0.9 }
    ],
    blanket: [{ DURATION: 0.8, VOLUME: 0.035, FILTER: 'lowpass', FREQ: 700, Q: 0.7, DELAY: 0 }],
    knead: [{ DURATION: 1.6, VOLUME: 0.03, FILTER: 'lowpass', FREQ: 500, Q: 0.7, DELAY: 0 }],
    clockDrop: [{ DURATION: 0.12, VOLUME: 0.12, FILTER: 'bandpass', FREQ: 1800, Q: 1.5, DELAY: 0 }],
    door: [{ DURATION: 0.4, VOLUME: 0.05, FILTER: 'bandpass', FREQ: 900, Q: 4, DELAY: 0 }],
    boxIn: [{ DURATION: 0.18, VOLUME: 0.08, FILTER: 'lowpass', FREQ: 700, Q: 0.7, DELAY: 0 }],
    boxOut: [{ DURATION: 0.15, VOLUME: 0.07, FILTER: 'lowpass', FREQ: 900, Q: 0.7, DELAY: 0 }],
    kick: [{ DURATION: 0.06, VOLUME: 0.06, FILTER: 'lowpass', FREQ: 500, Q: 0.7, DELAY: 0 }],
    flush: [{ DURATION: 1.2, VOLUME: 0.08, FILTER: 'lowpass', FREQ: 1200, Q: 0.7, DELAY: 0 }],
    laundry: [{ DURATION: 0.9, VOLUME: 0.04, FILTER: 'lowpass', FREQ: 800, Q: 0.7, DELAY: 0 }],
    suck: [{ DURATION: 0.12, VOLUME: 0.03, FILTER: 'highpass', FREQ: 2500, Q: 0.7, DELAY: 0 }],
    sweep: [{ DURATION: 0.25, VOLUME: 0.012, FILTER: 'bandpass', FREQ: 3500, Q: 0.8, DELAY: 0 }],
    drag: [{ DURATION: 0.3, VOLUME: 0.02, FILTER: 'bandpass', FREQ: 1800, Q: 0.8, DELAY: 0 }]
  },
  // Suara meong sintetis: sawtooth melalui filter bandpass dengan nada naik-turun
  MEOW_VOICE: {
    START_FREQ: 520,
    PEAK_FREQ: 880,
    END_FREQ: 480,
    PEAK_AT: 0.35, // fraksi durasi saat nada mencapai puncak
    DURATION: 0.55,
    ATTACK: 0.05,
    VOLUME: 0.18,
    FILTER_FREQ: 1200,
    FILTER_Q: 2.5
  }
};

// =====================================================================
// MEONG MAYHEM — nilai awal dari docs/GDD.md (disetel ulang lewat playtest).
// Satuan jarak: 1 unit dunia = 1 meter. Waktu dalam detik.
// Sebagian besar nilai di bawah belum dipakai; akan dipakai sesuai fase
// di peta pengembangan GDD.
// =====================================================================

// --- Level & penilaian (GDD §4) ---
// Data level (durasi, target, pencahayaan, pengubah) ada di js/levels/.
// Level berikutnya terbuka jika level sebelumnya mendapat minimal sekian bintang.
export const LEVEL_UNLOCK_MIN_STARS = 1;
// Alur game & lobi
export const GAME_FLOW = {
  PAUSE_KEY: 'KeyP'
};
// Rating bintang: kelipatan target Chaos untuk 1, 2, 3 bintang
export const STAR_THRESHOLDS = [1.0, 1.5, 2.0];

// --- Kenakalan & Chaos (GDD §5) ---
export const MISCHIEF = {
  tissue: { CHAOS: 15, NOISE_RADIUS: 0.8 }, // tumpahkan tisu
  scratchSofa: { CHAOS: 20, NOISE_RADIUS: 1.6 }, // cakar sofa / kursi
  remote: { CHAOS: 30, NOISE_RADIUS: 2.4 }, // injak remote, TV menyala
  glass: { CHAOS: 40, NOISE_RADIUS: 4 }, // jatuhkan gelas sampai pecah
  pot: { CHAOS: 50, NOISE_RADIUS: 3.2 }, // gulingkan pot
  kitchenFish: { CHAOS: 80, NOISE_RADIUS: 1.2 }, // curi ikan di dapur
  toiletPaper: { CHAOS: 35, NOISE_RADIUS: 1.2 }, // tarik gulungan tisu toilet (gulungan berderak)
  blanket: { CHAOS: 25, NOISE_RADIUS: 0.6 }, // acak-acak selimut (kain, sangat senyap)
  cake: { CHAOS: 70, NOISE_RADIUS: 0.5 }, // mencuri kue dari piring tamu (Level 5)
  guestBag: { CHAOS: 45, NOISE_RADIUS: 0 }, // tidur di tas/jaket tamu (Level 5), senyap
  teacup: { CHAOS: 45, NOISE_RADIUS: 4 }, // menjatuhkan cangkir teh tamu (Level 5)
  guestChair: { CHAOS: 20, NOISE_RADIUS: 0 }, // merebut kursi tamu saat ia di toilet (Level 5)
  knead: { CHAOS: 60, NOISE_RADIUS: 0.8 }, // menginjak-injak selimut di atas pemilik tidur (Level 4)
  alarmClock: { CHAOS: 40, NOISE_RADIUS: 5 }, // jam beker jatuh & berdering (Level 4)
  laundry: { CHAOS: 75, NOISE_RADIUS: 0.6 }, // mengacak tumpukan pakaian bersih (Bonus), kain
  duster: { CHAOS: 35, NOISE_RADIUS: 0.6 }, // menyeret kemoceng ≥ 2 m (Bonus)
  lhoKok: { CHAOS: 30, NOISE_RADIUS: 0, NO_COMBO: true }, // bonus "Lho, kok?!" (Bonus): pemilik menemukan kekacauan ulang
  wetPaws: { CHAOS: 5, NOISE_RADIUS: 0, NO_COMBO: true } // jejak kaki basah di sofa/kasur/meja (Level 3), sekali per perabot, tanpa bonus combo
};
export const COMBO = {
  WINDOW: 10, // detik sejak kenakalan sebelumnya
  MULTIPLIER: 1.5
};

// --- Stamina (GDD §6) ---
export const STAMINA = {
  MAX: 100,
  RUN_DRAIN_PER_SEC: 20,
  HIGH_JUMP_COST: 15,
  REGEN_PER_SEC: 10, // saat jalan/diam
  SUN_NAP_REGEN_PER_SEC: 25, // saat tidur di sinar matahari
  FISH_RESTORE: 40,
  EXHAUSTED_DURATION: 2 // terengah: hanya bisa jalan, tidak bisa lompat tinggi
};

// --- Mengeong (GDD §7) ---
export const MEOW = {
  COOLDOWN: 8,
  NOISE_RADIUS: 4.8,
  ANNOY_COUNT: 3, // jumlah meongan ...
  ANNOY_WINDOW: 30 // ... dalam jendela waktu ini membuat pemilik jengkel
};

// --- Pemilik rumah (GDD §8) ---
export const OWNER = {
  VISION_ANGLE_DEG: 70, // lebar total kerucut pandang
  VISION_RANGE: 3.2,
  TOILET_DURATION: 20, // keluar ruangan
  RADIUS: 0.32, // tubuh (navigasi & penghalang kucing)
  BLOCK_HEIGHT: 1.2, // kucing di bawah ketinggian ini tertahan tubuh pemilik
  EYE_HEIGHT_STAND: 1.6,
  EYE_HEIGHT_SIT: 1.2,
  WALK_SPEED: 1.1, // rutinitas
  INVESTIGATE_SPEED: 1.5,
  CHASE_SPEED: 3.15, // > kucing jalan (2,5), < kucing lari (4,0): perbandingan sama seperti Fase 3
  TURN_SPEED: 8, // laju putar badan
  HEAD_MAX_YAW_DEG: 80,
  HEAD_TURN_SPEED: 7
};

// --- Akhir level & tabungan Chaos (GDD §10) ---
export const RESULTS = {
  BANK_FRACTION_TIME_UP: 1.0, // waktu habis: semua Chaos masuk tabungan
  BANK_FRACTION_OUT_OF_LIVES: 0.5, // nyawa habis: hanya 50%
  LOSE_MESSAGE: 'Rumah masih terlalu rapi...',
  WIN_MESSAGE: 'Rumah berantakan sesuai rencana!',
  OUT_OF_LIVES_MESSAGE: 'Hanya {pct}% Chaos yang masuk tabungan.', // {pct} diganti otomatis
  TIME_UP_REASON: 'Pemilik selesai kerja!',
  OUT_OF_LIVES_REASON: 'Nyawa habis!'
};

// --- Camilan & fitur lucu (GDD §11–12) ---
export const CATNIP = {
  ZOOMIES_DURATION: 6,
  POSITION: { x: 0.2, z: -4.6 }, // lantai di samping meja kerja, di belakang pemilik
  PICKUP_RADIUS: 0.2,
  HOVER: 0.04,
  BOB_AMP: 0.02,
  BOB_SPEED: 3,
  SPIN_SPEED: 1.2,
  SPEED: 6.0, // kecepatan saat zoomies (pemilik mengejar 3,15)
  ANIM_CADENCE: 34, // kaki berayun sangat cepat
  TAIL_UP: 1.0
};
export const IDLE = {
  LOAF_DELAY: 5, // detik diam sebelum loaf pose
  ANIM_DELAY: 2, // detik diam sebelum animasi kecil acak
  ANIM_INTERVAL_MIN: 3,
  ANIM_INTERVAL_MAX: 6,
  ANIM_DURATION: 1.2, // menjilat kaki / menggaruk telinga / menguap
  LOAF_HEART_INTERVAL: 2.5,
  LOAF_SQUASH: 0.3, // badan merendah saat loaf
  LOAF_LEG_FOLD: 1.45, // rad: kaki terlipat di bawah badan
  LOAF_DROP: 0.075, // badan turun sampai perut menyentuh alas
  POSE_LERP: 8,
  CALM_SPEED: 0.05 // di bawah kecepatan ini kucing dianggap diam
};

// =====================================================================
// FASE 2 — kenakalan, fisika benda, umpan balik, HUD, simpanan
// =====================================================================

// --- Objek kenakalan per level (GDD §5). Tiap objek hanya bisa dipakai
// sekali per level. y = tinggi permukaan tempat objek berada; untuk objek
// di atas perabot kucing harus berdiri di permukaan yang sama. ---
export const MISCHIEF_LAYOUT = {
  glass: [
    { x: 2.4, y: RS.coffeeTable.HEIGHT, z: 0.88 }, // meja kopi (ruang tamu)
    { x: 2.9, y: RS.tvRack.HEIGHT, z: 0.06 }, // rak TV (ruang tamu)
    { x: 5.65, y: RS.island.HEIGHT, z: -2.24 }, // pulau dapur
    { x: -5.3, y: RS.dresser.HEIGHT, z: -1.7 } // meja rias (kamar tidur)
  ],
  tissue: [
    { x: 1.6, y: RS.coffeeTable.HEIGHT, z: 0.55 }, // meja kopi
    { x: 1.05, y: RS.workDesk.HEIGHT, z: -4.55 } // meja kerja
  ],
  // Cakar: target = nama referensi collider perabot di furniture.js
  scratchSofa: [
    { target: 'sofaSeat', markYMin: 0.1, markYMax: 0.38 },
    { target: 'chair', markYMin: 0.3, markYMax: 0.43 }
  ],
  remote: [{ x: 1.4, y: RS.sofa.SEAT, z: 1.55 }], // dudukan sofa; suara dari TV
  pot: [{ plant: 0 }, { plant: 1 }], // tanaman ruang tamu & ruang makan
  kitchenFish: [{ x: 4.0, y: RS.counter.HEIGHT, z: -4.78 }], // konter dapur
  toiletPaper: [{ x: -2.47, y: 0.62, z: -4.2 }], // gulungan di dinding samping toilet
  blanket: [{ x: -5.2, y: RS.bed.HEIGHT, z: -3.55 }] // selimut di kasur
};

// Toleransi tinggi: kucing dianggap "di permukaan yang sama" dengan objek
export const SURFACE_TOLERANCE = 0.1;

// --- Fisika benda sederhana ---
export const BODY_PHYSICS = {
  BOUNCE_MIN_SPEED: 0.8, // di bawah ini tidak memantul lagi
  ANGULAR_DAMPING: 3,
  SLEEP_SPEED: 0.02,
  DEBRIS_RESTITUTION: 0.25, // serpihan kecil (kain, tanah)
  DEBRIS_FRICTION: 6
};

// --- Gelas (dorong pelan → menoleh ke kamera → jatuh → pecah) ---
export const GLASS = {
  RADIUS: 0.035,
  HEIGHT: RS.glass.HEIGHT,
  PAW_DURATION: 0.8, // kaki depan mendorong pelan
  PUSH_DISTANCE: 0.05, // jarak gelas tergeser saat didorong pelan
  STARE_DURATION: 0.7, // menoleh ke kamera
  RECOVER_DURATION: 0.3,
  RELEASE_SPEED: 0.6, // dorongan akhir hingga jatuh dari tepi
  TUMBLE_SPIN: 10, // putaran gelas saat jatuh
  MARKER_OFFSET: 0.1, // penanda E di atas gelas
  MAX_SLIDE_TIME: 3, // pengaman: pecah di tempat jika tidak jatuh
  RESTITUTION: 0.2,
  FRICTION: 6,
  SHARD_COUNT: 16,
  SHARD_SIZE: 0.018,
  SHARD_SPEED_MIN: 0.7,
  SHARD_SPEED_RANGE: 1.1,
  SHARD_UP_MIN: 1.0,
  SHARD_UP_RANGE: 1.1,
  SHARD_SPIN: 12,
  SHARD_RESTITUTION: 0.35,
  SHARD_FRICTION: 5,
  SHARD_LIFE: 3, // mulai memudar setelah 3 detik
  SHARD_FADE: 1, // lama memudar
  SHAKE_AMPLITUDE: 0.05,
  SHAKE_DURATION: 0.3
};

// --- Tisu ---
export const TISSUE = {
  ACTION_DURATION: 0.55,
  HIT_AT: 0.25, // detik saat kaki mengenai kotak
  SHEET_COUNT: 7,
  SHEET_SIZE: 0.08,
  SHEET_SPEED_MIN: 0.35,
  SHEET_SPEED_RANGE: 0.7,
  SHEET_UP_MIN: 0.8,
  SHEET_UP_RANGE: 0.8,
  SHEET_SPIN: 5,
  SHEET_RESTITUTION: 0.1,
  SHEET_FRICTION: 8,
  SPREAD_ANGLE: Math.PI * 1.2, // lebar sebaran lembar tisu
  BOX_SPEED: 0.5, // kotak ikut terlempar
  BOX_UP: 0.8,
  BOX_SPIN: 5,
  BOX_SIZE: { W: 0.13, H: 0.06, D: 0.08 }, // kotak tisu
  MARKER_HEIGHT: 0.15
};

// --- Cakar sofa/kursi ---
export const SCRATCH = {
  ACTION_DURATION: 1.1,
  FREQ: 16, // kecepatan kaki mencakar
  MARK_COUNT: 4,
  MARK_SPREAD: 0.2, // lebar area bekas cakaran
  TUFT_COUNT: 6, // serpihan kain robek di atas tepi dudukan
  TUFT_SIZE: 0.035,
  TUFT_INSET: 0.05,
  FLUFF_COUNT: 10,
  FLUFF_SIZE: 0.02,
  FLUFF_LIFE: 1.2,
  FLUFF_SPEED_MIN: 0.15,
  FLUFF_SPEED_RANGE: 0.35,
  FLUFF_UP_MIN: 0.4,
  FLUFF_UP_RANGE: 0.5,
  FLUFF_SPIN: 6,
  MARK_WIDTH: 0.01,
  FLUFF_OFFSET: 0.04, // serpihan muncul sedikit di depan sisi perabot
  MARKER_OFFSET: 0.15
};

// --- Remote & TV ---
export const REMOTE = {
  ACTION_DURATION: 0.5,
  STOMP_AT: 0.25,
  TV_NOISE_POSITION: { x: 2.3, z: -0.2 }, // noise dipancarkan dari TV (dinding lorong)
  SIZE: { L: 0.16, H: 0.02, W: 0.05 },
  MARKER_HEIGHT: 0.12,
  TV_REFRESH_RATE: 12, // frame/detik gambar statis TV
  TV_TEXTURE_SIZE: 64,
  TV_BAR_COLORS: ['#f8fafc', '#facc15', '#22d3ee', '#4ade80', '#e879f9', '#f87171', '#3b82f6']
};

// --- Pot terguling ---
export const POT = {
  ACTION_DURATION: 0.5,
  HIT_AT: 0.2,
  TIP_DURATION: 0.45,
  TIP_ANGLE: Math.PI / 2 * 0.92,
  LIE_LIFT: 0.18, // pot naik sedikit saat rebah agar tidak menembus lantai
  FALLEN_TOP_HEIGHT: 0.4, // collider pot setelah rebah
  SPILL_RADIUS: 0.22,
  SPILL_DISTANCE: 0.5,
  MARKER_HEIGHT: 1.1,
  CHAOS_TEXT_HEIGHT: 0.3
};

// --- Tarik gulungan tisu toilet ---
export const TOILET_PAPER = {
  ACTION_DURATION: 1.6, // kucing berdiri & menepuk gulungan berkali-kali
  ROLL_RADIUS: 0.055,
  ROLL_LENGTH: 0.1,
  ROLL_SPIN: 25,
  STRIP_WIDTH: 0.09,
  STRIP_FLOOR_LENGTH: 1.1, // kertas terurai di lantai
  ROLL_RADIUS_AFTER: 0.035,
  MARKER_HEIGHT: 0.18
};

// --- Acak-acak selimut ---
export const BLANKET = {
  ACTION_DURATION: 1.3, // kucing menguleni selimut
  KNEAD_FREQ: 9,
  SIZE: { W: 1.5, H: 0.05, D: 1.3 },
  CRUMPLE_PIECES: 7,
  MARKER_HEIGHT: 0.2
};

// --- Curi ikan di dapur ---
export const KITCHEN_FISH = {
  ACTION_DURATION: 0.6,
  BITE_AT: 0.3,
  CARRY_DURATION: 3, // ikan terlihat di mulut kucing
  MODEL_SCALE: 0.5,
  PLATE_RADIUS: 0.1,
  MOUTH_OFFSET: { y: -0.035, z: 0.09 },
  MOUTH_SCALE: 0.35,
  MARKER_HEIGHT: 0.15
};

// --- Getaran kamera ---
export const CAMERA_SHAKE = {
  FREQUENCY: 40
};

// --- Teks melayang (+40, COMBO x1.5) ---
export const FLOAT_TEXT = {
  DURATION: 1.3,
  SPEECH_DURATION: 2.0, // balon teks NPC ("Pus, pus!")
  SPEECH_HEIGHT: 0.25, // di atas kepala
  RISE_PX: 70,
  COMBO_OFFSET_PX: 30,
  START_HEIGHT: 0.2
};

// --- HUD ---
export const HUD = {
  TIMER_WARNING: 30, // detik terakhir: timer merah
  TIMER_TICK_FROM: 10 // detik terakhir: bunyi tik tiap detik
};

// --- Simpanan (localStorage) ---
export const SAVE = {
  KEY: 'meongMayhem.save', // versi skema disimpan di dalam data (lihat core/save.js)
  VERSION: 2,
  LEGACY_KEYS: ['meongMayhem.save.v1'] // save lama yang dimigrasi otomatis
};

// --- Pengaturan (lobi → Pengaturan) ---
export const SETTINGS = {
  DEFAULTS: { quality: 'high', volume: 0.8, music: true, sensitivity: 1, invertY: false, showFps: false },
  QUALITY: {
    low: { label: 'Rendah', shadows: false, shadowMapSize: 512, maxPixelRatio: 1 },
    medium: { label: 'Sedang', shadows: true, shadowMapSize: 1024, maxPixelRatio: 1.5 },
    high: { label: 'Tinggi', shadows: true, shadowMapSize: 2048, maxPixelRatio: 2 }
  },
  SENSITIVITY_MIN: 0.3, // pengali CAMERA.MOUSE_SENSITIVITY
  SENSITIVITY_MAX: 2.5,
  SENSITIVITY_STEP: 0.1,
  VOLUME_STEP: 0.05
};

// --- Kustomisasi kucing (GDD §14). Harga dalam tabungan Chaos. ---
// Warna: fur = bulu utama, light = perut/moncong/kaki, pattern = belang/bercak,
// eye = mata. pattern: null | 'tabby' (belang) | 'calico' (bercak 3 warna).
export const CUSTOMIZATION = {
  DEFAULT_CAT: 'orange',
  FREE_CATS: ['orange'],
  CATS: [
    { id: 'orange', name: 'Oranye', price: 0, fur: 0xf59e42, light: 0xfde6c4, eye: 0x111827, pattern: null },
    { id: 'white', name: 'Putih', price: 300, fur: 0xf4f1ea, light: 0xffffff, eye: 0x2563eb, pattern: null },
    { id: 'gray', name: 'Abu-abu', price: 300, fur: 0x8b8f98, light: 0xd7d9de, eye: 0x15803d, pattern: null },
    { id: 'black', name: 'Hitam', price: 500, fur: 0x1f1f24, light: 0x34343b, eye: 0xfacc15, pattern: null, darkStealth: true },
    { id: 'tabby', name: 'Tabby Bergaris', price: 600, fur: 0xc98a4b, light: 0xf2dcc0, eye: 0x166534, pattern: 'tabby', patternColor: 0x6b4226 },
    { id: 'calico', name: 'Calico', price: 800, fur: 0xf8f4ec, light: 0xffffff, eye: 0x92400e, pattern: 'calico', patternColor: 0xe07b2a, patternColor2: 0x2a2523 },
    { id: 'chonky', name: 'Chonky Oranye', price: 1000, fur: 0xf59e42, light: 0xfde6c4, eye: 0x111827, pattern: null, chonky: true }
  ],
  ACCESSORIES: [
    { id: 'bowtie', name: 'Dasi Kupu-kupu', price: 150, color: 0xdc2626 },
    { id: 'scarf', name: 'Syal', price: 200, color: 0x2563eb, color2: 0xf8fafc },
    { id: 'hat', name: 'Topi Kecil', price: 250, color: 0x3f3f46, color2: 0xfacc15 },
    { id: 'bell', name: 'Kalung Lonceng', price: 400, color: 0xdc2626, color2: 0xfacc15 }
  ],
  // Kalung lonceng: Chaos lebih besar, tapi langkah berbunyi (GDD §14)
  BELL: { CHAOS_MULT: 1.2, STEP_RADIUS: { walk: 1.2, run: 3, sneak: 0.6 } },
  // Kucing hitam: jangkauan pandang pemilik di area gelap (biasa: PERCEPTION.DARK_RANGE_MULT)
  BLACK_CAT_DARK_RANGE_MULT: 0.5,
  // Chonky: badan lebih bulat, jalan bergoyang, loaf lebih bulat (kemampuan sama)
  CHONKY: { BODY_WIDTH: 1.35, BODY_HEIGHT: 1.15, BELLY_DROP: 0.012, WADDLE_ROLL: 0.12, WADDLE_SWAY: 0.012, LOAF_WIDEN: 1.12, LOAF_DROP: 0.05 }
};

// --- Cuaca (Level 3 "Sore Hujan"). Aturan main (jadwal petir, genangan,
// jejak) ada di file level (WEATHER); di sini hanya tampilan & suara. ---
export const RAIN_FX = {
  // Garis hujan di luar jendela (satu InstancedMesh)
  STREAKS_PER_WINDOW: 90,
  STREAK_LENGTH: 0.4,
  STREAK_WIDTH: 0.01,
  SPEED: 7.5, // m/detik
  SLANT: 0.12, // kemiringan (rad)
  COLOR: 0x8796aa, // dijumlahkan (additive) ke latar
  OPACITY: 0.45,
  DEPTH_MIN: 0.06, // jarak dari dinding ke luar (sebelum latar langit 0,5 m)
  DEPTH_MAX: 0.42,
  SPAN_PAD: 0.4,
  HEIGHT_PAD: 0.4,
  BACKDROP_COLOR: 0x1d2128, // langit mendung (tampil lebih terang setelah konversi sRGB)
  // Tetesan mengalir di kaca (kanvas beranimasi)
  DROPS: { SIZE: 128, COUNT: 26, SPEED_MIN: 6, SPEED_MAX: 40, RADIUS_MIN: 1.5, RADIUS_MAX: 3.5, FPS: 20, COLOR: 'rgba(214, 226, 240, 0.7)', TRAIL: 'rgba(214, 226, 240, 0.25)', OFFSET: 0.012, TILE_METERS: 0.8 },
  // Genangan bocor & ember
  PUDDLE: { COLOR: 0x2f4a63, OPACITY: 0.6, ROUGHNESS: 0.05, LIFT: 0.006, RIPPLE_PERIOD: 1.1, RIPPLE_COLOR: 0xcfe0f0 },
  BUCKET: { RADIUS: 0.13, HEIGHT: 0.22, COLOR: 0x4f7cac },
  // Kilat: hanya menaikkan intensitas lampu yang ada (tanpa lampu baru)
  FLASH: { SUN_BOOST: 2.6, HEMI_BOOST: 2.4, FLICKER: 0.25, FLICKER_FREQ: 55, BACKDROP_COLOR: 0xeef3ff },
  THUNDER_SHAKE: { AMPLITUDE: 0.035, DURATION: 0.9 },
  AUDIO: { RAIN_VOLUME: 0.05, RAIN_FREQ: 1500, RAIN_Q: 0.5, THUNDER_VOLUME: 0.4, THUNDER_DURATION: 2.6, THUNDER_FREQ: 120 }
};

// --- Jejak kaki basah (entities/footprints.js) ---
export const FOOTPRINTS = {
  MAX: 240, // jejak sekaligus (InstancedMesh)
  STEP: 0.17, // meter antar-jejak
  SIDE: 0.035, // jejak kiri/kanan bergantian
  SIZE: 0.045,
  COLOR: 0x1a120c,
  OPACITY: 0.6,
  ROUGHNESS: 0.2,
  LIFT: 0.004,
  SHRINK_FROM: 0.7, // mulai mengecil (memudar) setelah 70% umur
  ON_FURNITURE_TOL: 0.06, // jejak dianggap di atas perabot jika setinggi permukaannya
  CHECK_INTERVAL: 0.2, // detik antar-pemeriksaan "pemilik melihat jejak"
  SIGHT_LIFT: 0.03, // titik pandang sedikit di atas jejak
  TELEPORT_DIST: 0.5 // perpindahan per frame sejauh ini bukan langkah
};

// --- Malam (Level 4 "Malam Hari"). Aturan main ada di file level (NIGHT). ---
export const NIGHT_FX = {
  // Senter: SpotLight + kerucut cahaya semi-transparan
  FLASHLIGHT: {
    COLOR: 0xfff1d6,
    INTENSITY: 2.6,
    PENUMBRA: 0.35,
    DECAY: 1.5,
    HAND_HEIGHT: 1.15, // tinggi senter dari lantai saat berdiri
    FORWARD: 0.32, // di depan badan
    PITCH: -0.32, // sorotan sedikit menunduk (rad)
    BEAM_LENGTH: 6, // panjang kerucut cahaya yang terlihat
    BEAM_OPACITY: 0.07,
    SHADOW_MAP: 1024,
    BODY_COLOR: 0x2f3542,
    LENS_COLOR: 0xfff6dd
  },
  // Kilau mata kucing saat terkena senter
  EYE_GLINT: { COLOR: 0xd9ff8a, INTENSITY: 2.2 },
  // Jam digital di nakas (berpendar hijau, tanpa lampu)
  CLOCK_GLOW: 0x4ade80,
  // Lampu kulkas saat camilan tengah malam (tanpa bayangan)
  FRIDGE_LIGHT: { COLOR: 0xe8f4ff, INTENSITY: 1.6, DISTANCE: 3, DECAY: 2, POSITION: [6.4, 1.0, -4.0] },
  // Matahari terbit di akhir level
  DAWN: { SUN_COLOR: 0xffb36b, SUN_INTENSITY: 1.25, HEMI_INTENSITY: 0.55, OWNER_WAKE_AT: 0.35 },
  // Suara malam: detak jam & jangkrik samar
  CLOCK_TICK_INTERVAL: 1,
  CRICKET_INTERVAL: [1.2, 3.5],
  // Ikon HUD Zzz → mata terbuka
  WAKE_ICON_STEPS: 20,
  // Berkas cahaya bulan di lantai (tambalan bercahaya lembut, tanpa lampu)
  MOON_PATCH: { COLOR: 0x9cb8f0, OPACITY: 0.32, SOFT_EDGE: 0.22, TEXTURE_SIZE: 64, LIFT: 0.014, MULLION_SHADOW: 0.08 }
};

// --- Kenakalan malam ---
export const KNEAD = { ACTION_DURATION: 2.2, KNEAD_FREQ: 6, MARKER_HEIGHT: 0.12, NEAR_OWNER: 0.9 };
export const ALARM_CLOCK = {
  SIZE: { W: 0.13, H: 0.08, D: 0.07 },
  FACE_COLOR: 0x0f1d14,
  BODY_COLOR: 0xd94b4b,
  BELL_COLOR: 0xd9d9d9,
  MARKER_OFFSET: 0.1,
  SWIPE_HIT: 0.25,
  ACTION_DURATION: 0.6,
  RELEASE_SPEED: 1.1,
  TUMBLE_SPIN: 8,
  RESTITUTION: 0.3,
  FRICTION: 6,
  MAX_SLIDE_TIME: 3,
  RING_TIME: 3, // detik berdering di lantai
  RING_WOBBLE: 0.12,
  RING_FREQ: 40
};

// --- Tamu (Level 5 "Kedatangan Tamu"). Jadwal & aturan di file level (GUEST). ---
export const GUEST_FX = {
  // Tampilan tamu: model pemilik dengan parameter lain (owner/model.js)
  LOOK: {
    skin: { color: 0xc68a5c, roughness: 0.7 },
    hair: { color: 0x1c1410, roughness: 0.85 },
    shirt: { color: 0xd9577a, roughness: 0.85 },
    pants: { color: 0x3f4a63, roughness: 0.9 },
    shoes: { color: 0x2b2b2b, roughness: 0.6 },
    hairStyle: 'bun', // 'short' (pemilik) | 'bun' (cepol) | 'long'
    height: 1.62
  },
  OWNER_HEIGHT: 1.7, // tinggi model dasar (skala tamu = height / OWNER_HEIGHT)
  PERCEPTION_HZ: 15, // persepsi tamu dihitung 15×/detik (hemat raycast)
  CROUCH_HEIGHT: 0.55, // pinggul saat berjongkok
  PET_HEARTS_INTERVAL: 0.6,
  PURR_INTERVAL: 0.9,
  // Pintu depan (adegan pembuka/penutup)
  DOOR_OPEN_ANGLE: 1.4,
  DOOR_SPEED: 2.5,
  OUTSIDE: { BACKDROP_COLOR: 0xbfe3ff, PORCH_COLOR: 0x8c8c8c }
};

// --- Kenakalan tamu (Level 5) ---
export const CAKE = { RADIUS: 0.05, HEIGHT: 0.045, PLATE_RADIUS: 0.09, COLOR: 0xf2c38f, CREAM: 0xfff4e6, PLATE: 0xf8fafc, ACTION_DURATION: 0.9, MARKER_OFFSET: 0.12 };
export const TEACUP = { RADIUS: 0.04, HEIGHT: 0.06, COLOR: 0xf1f5f9, TEA: 0x9a5b2a, SAUCER_RADIUS: 0.07 };
export const GUEST_BAG = { SIZE: { W: 0.38, H: 0.12, D: 0.3 }, COLOR: 0x8a5a3b, STRAP: 0x5c3a24, HOLD: 0.6, NAP_DURATION: 4, MARKER_HEIGHT: 0.2 };
export const GUEST_CHAIR = { SIT_DURATION: 1.2, MARKER_HEIGHT: 0.15 };

// --- Level Bonus: Minggu Bersih-bersih (jadwal & angka gameplay di levels/bonus.js) ---
export const CLEAN_FX = {
  // Alat di tangan pemilik (owner/model.js); hanya terlihat saat dipakai
  BROOM: { HANDLE: 1.05, HANDLE_R: 0.012, HEAD_W: 0.3, HEAD_H: 0.09, HEAD_D: 0.06, HANDLE_COLOR: 0xb58552, HEAD_COLOR: 0xd9b25c },
  DUSTER: { HANDLE: 0.42, HANDLE_R: 0.01, TUFT_R: 0.07, TUFT_L: 0.2, HANDLE_COLOR: 0x8b5a2b, TUFT_COLORS: [0xe85d75, 0xf6c445, 0x5aa9e6] },
  SWEEP_FREQ: 5, // ayunan sapu (rad/detik)
  SWEEP_AMP: 0.35,
  DUST_FREQ: 6, // ayunan kemoceng
  DUST_AMP: 0.4,
  SWEEP_SOUND_EVERY: 0.9, // bunyi sapu samar (detik)
  SWEEP_SOUND_RANGE: 6, // hanya dimainkan jika kucing dekat
  PENALTY_COLOR: 0xef4444
};
export const LAUNDRY = {
  // Tumpukan pakaian bersih terlipat (4 lipatan berwarna) di ujung kasur
  PIECE: { W: 0.3, H: 0.045, D: 0.24 },
  COLORS: [0x60a5fa, 0xf9a8d4, 0xfde68a, 0x86efac],
  ACTION_DURATION: 1.4, // kucing berguling di tumpukan
  SCATTER_AT: 0.7,
  SCATTER_SPEED: 1.3,
  SCATTER_UP: 1.6,
  SPIN: 6,
  RESTITUTION: 0.1,
  FRICTION: 8,
  MARKER_HEIGHT: 0.3
};
export const DUSTER_PROP = {
  BITE_DIST: 0.55, // jarak prompt "Gigit kemoceng" (kucing di lantai)
  DROP_MIN_DIST: 2, // Chaos jika dilepas ≥ 2 m dari tempat pemilik meletakkannya
  CARRY_SPEED_MULT: 0.7, // kucing membawa kemoceng: lebih pelan, tak bisa melompat
  DRAG_NOISE_RADIUS: 0.6, // suara seret saat bergerak
  DRAG_NOISE_EVERY: 0.5,
  MOUTH_OFFSET: { y: -0.03, z: 0.1 },
  MOUTH_SCALE: 0.8,
  FLOOR_Y: 0.02,
  MARKER_HEIGHT: 0.3
};
// Keranjang cucian: tempat sembunyi tetap (tidak bisa digeser), seperti kardus diam
export const LAUNDRY_BASKET = {
  RADIUS: 0.24,
  HEIGHT: 0.5,
  COLOR: 0xd8c6a3,
  RIM: 0xb79f74,
  CLOTH: 0x93c5fd,
  EYE_HEIGHT: 0.47, // mata mengintip di atas tepi keranjang
  ENTER_DIST: 0.55,
  MARKER_HEIGHT: 0.6
};
// Musik santai prosedural dari speaker (Web Audio): piano elektrik + bas + ketukan pelan
export const MUSIC = {
  BPM: 78,
  // Akor 4 ketuk masing-masing (frekuensi Hz): Fmaj7 → Em7 → Dm7 → Cmaj7
  CHORDS: [
    [174.6, 220.0, 261.6, 329.6],
    [164.8, 196.0, 246.9, 293.7],
    [146.8, 174.6, 220.0, 261.6],
    [130.8, 164.8, 196.0, 246.9]
  ],
  BASS_DIV: 2, // bas = akar akor satu oktaf di bawah
  NOTE_DECAY: 1.4,
  CHORD_VOLUME: 0.035,
  BASS_VOLUME: 0.05,
  HAT_VOLUME: 0.008,
  LOOKAHEAD: 0.4, // detik dijadwalkan di depan
  BASE_LEVEL: 0.55, // volume di seluruh rumah
  NEAR_LEVEL: 1, // volume di samping speaker
  NEAR_DIST: 1.5,
  FAR_DIST: 8,
  SPEAKER: { W: 0.12, H: 0.18, D: 0.1, COLOR: 0x1f2937, GRILL: 0x4b5563, LED: 0x34d399 }
};
// Suasana Minggu pagi: tirai tipis berkibar di jendela terbuka
export const SUNDAY_FX = {
  SHEER_COLOR: 0xfff3d6,
  SHEER_OPACITY: 0.8,
  SWAY_FREQ: 1.3,
  SWAY_AMP: 0.12,
  OPEN_CURTAIN_SCALE: 0.28 // tirai kamar tidur ditarik ke samping
};

// --- Latihan / tutorial (systems/tutorial.js, levels/level0.js) ---
export const TUTORIAL = {
  MOVE_DIST: 1.5, // meter berjalan untuk langkah "Gerak"
  BOX_INDEX: 0, // kardus K1 (dekat pintu lorong)
  GLASS_INDEX: 0, // gelas di meja kopi
  // Pemilik lewat saat kucing di kardus: muncul di lorong, lewat di samping
  // kardus, menoleh ke sekeliling, lalu kembali ke lorong
  PATROL_START: { x: -5.2, z: -0.95 },
  PATROL_POINTS: [
    { x: -5.2, z: 0.45 },
    { x: -3.6, z: 1.0, look: 2.5 },
    { x: -5.2, z: -0.95 }
  ],
  BOX_WAIT_BEFORE_PATROL: 1.0, // detik setelah masuk kardus sebelum pemilik muncul
  FAIL_TIME: 2.5, // lama pesan "ketahuan" sebelum langkah diulang
  CHASE_START: { x: -5.2, z: -0.95 }, // pemilik muncul & mengejar dari sini
  CHASE_RETRY: 1.0, // detik sebelum pemilik mengejar lagi jika kehilangan jejak
  STEP_PAUSE: 0.8, // jeda singkat antar-langkah
  MARKER: { COLOR: 0xfacc15, RADIUS: 0.07, LENGTH: 0.16, LIFT: 0.32, BOB_AMP: 0.05, BOB_FREQ: 3, GLASS_OFFSET: 0.12 }
};

// --- Lobi 3D: sudut rumah yang nyaman (world/lobby.js) ---
export const LOBBY = {
  BACKGROUND: 0x1c140e,
  FLOOR_SIZE: 6,
  WALL_HEIGHT: 2.6,
  BACK_WALL_Z: -1.5,
  SIDE_WALL_X: -1.9,
  WINDOW: { x: 0.2, y: 1.45, width: 1.3, height: 1.1, SKY: 0xffd9a0 },
  CUSHION: { x: 0.55, z: 0, RADIUS: 0.3, HEIGHT: 0.09, COLOR: 0x2f7d7a, TOP_COLOR: 0x3a9591 },
  RUG: { x: 0.45, z: 0.1, RADIUS: 1.05, COLOR: 0x9a3f3f, RING_COLOR: 0xd9b26f },
  // Lampu (hanya matahari jendela yang berbayangan)
  HEMI: { sky: 0xfff1dc, ground: 0x6b4a2e, intensity: 0.55 },
  SUN: { color: 0xffc98a, intensity: 1.2, position: [0.6, 3.2, -3.2], target: [0.5, 0, 0.4], shadowMapSize: 1024 },
  LAMP: { color: 0xffb870, intensity: 1.1, distance: 4, decay: 2, position: [1.75, 1.35, -0.9] },
  COLORS: { SHADE: 0xf5deb3, SHADE_GLOW: 0xffb870, POT: 0xb4532a, LEAF: 0x4d8a3c, BOOKS: [0x3b5b92, 0xa63d40, 0xe9b44c] },
  // Kamera: kucing tampil di kanan layar (menu di kiri)
  CAMERA: { FOV: 40, position: [-0.05, 0.85, 1.85], target: [0.22, 0.26, 0], WIDE_SHIFT: 0.22 },
  SPIN_SPEED: 0.35, // rad/detik, kucing berputar pelan di bantal
  // Siklus animasi idle: loaf → duduk → berdiri sambil menjilat kaki
  CYCLE: [
    { pose: 'loaf', duration: 6 },
    { pose: 'sit', duration: 4 },
    { pose: 'lick', duration: 2.4 }
  ],
  BREATH_FREQ: 2.2,
  BREATH_AMP: 0.004
};

// --- Rapat video (Level 2). Jadwal & aturan ada di file level (MEETINGS). ---
export const MEETING = {
  SPEAKER_INTERVAL: 1.6, // detik pergantian pembicara (bingkai menyala)
  SCREEN_SIZE: [256, 160], // resolusi kanvas layar laptop
  SCREEN_BG: '#0f172a',
  TILE_COLORS: ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d'],
  SPEAKER_COLOR: '#22c55e',
  // Suara bicara samar: noise → bandpass, volume per "suku kata" acak
  AUDIO: { VOLUME: 0.06, MAX_DIST: 8, MIN_LEVEL: 0.12, FREQ: 520, Q: 1.6, SYLLABLE_MIN: 0.08, SYLLABLE_MAX: 0.22, PAUSE_CHANCE: 0.2 }
};

// =====================================================================
// FASE 3 — pemilik rumah, navigasi, persepsi, curiga, KETAHUAN
// =====================================================================

// --- Rutinitas pemilik (GDD §8) ---
// Yaw: arah hadap = atan2(dx, dz); π = menghadap -Z (utara).
export const OWNER_ROUTINE = {
  WORK_MIN: 35,
  WORK_MAX: 55,
  GLANCE_INTERVAL_MIN: 12, // saat kerja, sesekali menoleh ke belakang
  GLANCE_INTERVAL_MAX: 20,
  GLANCE_DURATION: 2.5,
  STRETCH_CHANCE: 0.3, // peluang meregang di tengah sesi kerja
  STRETCH_DURATION: 4,
  // Setelah sesi kerja, pilih satu kegiatan (acak berbobot)
  ACTIVITIES: [
    { id: 'drink', weight: 30, duration: 8 }, // dapur
    { id: 'window', weight: 25, duration: 10 }, // jendela ruang tamu
    { id: 'bedroom', weight: 25, duration: 8 }, // merapikan lemari
    { id: 'toilet', weight: 20, maxPerLevel: 1 } // kamar mandi, pintu tertutup
  ],
  SPOTS: {
    desk: { x: 1.6, z: -3.95, yaw: Math.PI }, // duduk di kursi ruang kerja
    kitchen: { x: 4.75, z: -4.0, yaw: Math.PI }, // depan konter dapur
    window: { x: -6.4, z: 2.3, yaw: -Math.PI / 2 }, // jendela ruang tamu
    bedroom: { x: -3.3, z: -3.9, yaw: Math.PI }, // depan lemari
    toilet: { x: -1.5, z: -3.0, yaw: 0 } // di dalam kamar mandi, menghadap pintu
  },
  SIT_HEIGHT: 0.48 // tinggi pinggul saat duduk
};

// --- Pintu (keluar ke toilet) di dinding timur ---
export const DOOR = {
  // Pintu kamar mandi (berengsel di sisi barat bukaan, membuka ke dalam)
  HINGE_X: -1.95,
  Z: -1.5,
  WIDTH: RS.doorway.WIDTH,
  HEIGHT: RS.door.HEIGHT,
  THICKNESS: 0.04,
  OPEN_ANGLE: 1.5,
  OPEN_SPEED: 3, // rad/detik
  CLOSED_ANGLE: 0.25 // di bawah sudut ini pintu dianggap tertutup (menghalangi)
};

// --- Keranjang kucing (tempat muncul kembali setelah tertangkap) ---
export const BASKET = {
  x: -6.4,
  z: 0.4,
  RADIUS: 0.25,
  HEIGHT: 0.15
};

// --- Area gelap: jangkauan pandang pemilik ×DARK_RANGE_MULT ---
export const DARK_ZONES = [
  { name: 'hallway', x: -1.75, z: -0.9, width: 10.5, depth: 1.2 }, // lorong
  { name: 'bedroom', x: -4.8, z: -3.25, width: 4.4, depth: 3.5 } // kamar tidur (tirai tertutup)
];
// Tampilan area gelap: lapisan redup kehangatan rendah di lantai, dinding, dan
// plafon zona; kucing & pemilik di dalam zona ikut meredup; lampu malam lemah.
export const DARK_ZONE_VISUAL = {
  COLOR: 0x1f1208, // gelap kecokelatan (hangat)
  FLOOR_OPACITY: 0.5,
  WALL_OPACITY: 0.42,
  CEILING_OPACITY: 0.5,
  SURFACE_OFFSET: 0.006, // jarak lapisan dari permukaan (hindari z-fighting)
  FACE_TOLERANCE: 0.08, // muka dinding yang dianggap di tepi zona
  MIN_PIECE: 0.02,
  ENTITY_TINT: 0x9c8670, // pengali warna kucing & pemilik di area gelap
  TINT_LERP: 5 // kecepatan transisi redup (1/detik)
};
// Lampu malam hangat & lemah (tanpa bayangan) di area gelap
export const NIGHT_LIGHTS = [
  { color: 0xffa25a, intensity: 0.5, distance: 2.6, decay: 2, position: [-2.4, 0.3, -0.37], glow: 0.035 }, // lorong, dinding selatan
  { color: 0xff9448, intensity: 0.45, distance: 2.4, decay: 2, position: [-6.97, 0.3, -2.2], glow: 0.035 } // kamar tidur, dekat kaki kasur
];

// --- Grid navigasi + A* ---
export const NAV = {
  CELL_SIZE: 0.1,
  CLEARANCE: 0.36, // radius pemilik + jarak aman dari perabot/dinding (muat lewat bukaan 0,9 m)
  REPLAN_INTERVAL: 0.3, // detik, saat mengejar
  ARRIVE_DIST: 0.05,
  MAX_ITERATIONS: 20000
};

// --- Persepsi (GDD §8) ---
export const PERCEPTION = {
  CLOSE_RANGE: 0.6, // selalu terlihat (kecuali line-of-sight terhalang)
  SNEAK_RANGE_MULT: 0.5,
  DARK_RANGE_MULT: 0.7,
  LOS_EPSILON: 0.03,
  SUPPORT_TOLERANCE: 0.15, // kucing dianggap berdiri di atas perabot jika selisih tingginya sekecil ini
  // Titik tubuh kucing yang dicek line-of-sight (lokal: y tinggi, z depan)
  SAMPLE_POINTS: [
    { y: 0.28, z: 0.2 }, // kepala
    { y: 0.23, z: 0 }, // punggung
    { y: 0.2, z: -0.13 } // pantat
  ]
};

// --- Meter curiga & state machine ---
export const SUSPICION = {
  MAX: 100,
  INVESTIGATE_AT: 40,
  GAIN_NEAR: 60, // per detik saat kucing terlihat di <= GAIN_NEAR_DIST
  GAIN_FAR: 15, // per detik di jangkauan maksimum
  GAIN_NEAR_DIST: 0.8,
  DECAY: 8, // per detik saat tidak melihat apa-apa
  NOISE_PER_METER: 10, // curiga += radius suara × ini (gelas 4 m → +40)
  NOISE_CAP: 80, // suara saja tidak bisa memicu "!"
  MEOW_GAIN: 15,
  FOOTSTEP_MULT: 0.15, // langkah/mendarat: curiga += radius × NOISE_PER_METER × ini
  ANNOYED_MULT: 1.5, // saat jengkel (meong 3x dalam 30 detik)
  CURIOUS_LOOK_TIME: 1.5, // berhenti & menatap sebelum menyelidiki
  INVESTIGATE_LOOK_TIME: 3, // menoleh ke sekeliling di titik penyelidikan
  LOSE_TRACK_TIME: 5, // mengejar → rutinitas jika tidak melihat kucing selama ini
  AFTER_CHASE_LEVEL: 30 // meter setelah kehilangan jejak
};

// --- Mengejar & meraih ---
export const CHASE = {
  CATCH_RADIUS: 0.9, // jarak horizontal untuk meraih (radius tubuh 0,32 + lengan ±0,6)
  REACH_HEIGHT: 1.2, // kucing di atas ketinggian ini tidak bisa diraih
  WAIT_UNDER_HIGH: 4, // menunggu di bawah tempat tinggi lalu menyerah
  UNDER_HIGH_DIST: 1.0, // dianggap 'di bawah' kucing jika sedekat ini (horizontal)
  HIDDEN_WAIT_DIST: 1.6 // kucing di kolong perabot: pemilik menunggu di sekitar sini
};

// --- Alur KETAHUAN (GDD §9) ---
export const CAPTURE = {
  TIME_SCALE: 0.3, // slow motion
  SLOWMO_DURATION: 1.6, // detik nyata
  DESATURATE_TIME: 1.0,
  FADE_OUT: 0.6,
  BLACK_HOLD: 0.5,
  FADE_IN: 0.6,
  INVULNERABLE: 3, // detik kebal setelah muncul di keranjang
  LIFT_HEIGHT: 1.1, // tinggi kucing saat diangkat
  LIFT_DISTANCE: 0.35, // di depan badan pemilik
  SHAKE_AMPLITUDE: 0.08,
  SHAKE_DURATION: 0.45,
  VIGNETTE_MAX: 0.85
};

// --- Animasi pemilik ---
export const OWNER_ANIM = {
  WALK_STRIDE: 2.6, // radian siklus per meter
  WALK_LEG_SWING: 0.55,
  WALK_ARM_SWING: 0.45,
  RUN_ARM_SWING: 0.9,
  TYPE_FREQ: 16,
  TYPE_AMP: 0.08,
  TALK_FREQ: 2.2, // Level 5: tangan bergerak saat mengobrol
  TALK_AMP: 0.25,
  LAUGH_FREQ: 22, // berguncang saat tertawa
  LAUGH_AMP: 0.06,
  CROUCH_HIP: 0.55, // pinggul relatif saat berjongkok
  PET_FREQ: 7, // tangan mengusap saat mengelus
  PET_AMP: 0.3,
  WAVE_FREQ: 9,
  WAVE_AMP: 0.35,
  TIDY_FREQ: 6, // Bonus: tangan memungut saat membereskan
  TIDY_AMP: 0.3,
  LOOK_AROUND_SPEED: 1.6, // menoleh kiri-kanan saat menyelidiki
  LOOK_AROUND_YAW: 1.1,
  POSE_LERP: 10
};

// --- Indikator ?/! di atas kepala ---
export const OWNER_INDICATOR = {
  HEIGHT: 2.15 // di atas lantai, relatif posisi pemilik
};

// =====================================================================
// FASE 5–6 — alat stealth & hal lucu
// =====================================================================

// --- Kardus (GDD §12) ---
export const HIDE_BOX = {
  POSITIONS: [
    { x: -4.3, z: 0.05, yaw: 0 }, // K1 ruang tamu, samping bukaan barat lorong (loop L1)
    { x: 0.2, z: 4.55, yaw: Math.PI }, // K2 ruang tamu, dinding selatan di samping rak buku
    { x: 6.6, z: -1.0, yaw: -Math.PI / 2 }, // K3 dapur dekat pulau (loop L4)
    { x: 3.15, z: -1.85, yaw: Math.PI } // K4 sudut ruang kerja (berisiko, dekat pemilik)
  ],
  SIZE: RS.box.SIZE,
  HEIGHT: RS.box.HEIGHT,
  RADIUS: 0.24, // radius tabrakan saat kucing di dalam kardus
  ENTER_DIST: 0.55, // jarak dari pusat kardus untuk prompt "Masuk kardus"
  EXIT_OFFSET: 0.45, // kucing keluar di depan kardus
  MOVE_THRESHOLD: 0.08, // m/detik: di atas ini kardus dianggap bergerak
  MOVE_GAIN_MULT: 1.6, // kardus bergerak dalam pandangan: curiga naik lebih cepat
  ENTER_GRACE: 1.0, // masuk kardus ≤ detik ini setelah terlihat = tidak menyelamatkan
  MARKER_HEIGHT: 0.5,
  EYE_SIZE: 0.016,
  EYE_SPACING: 0.03,
  EYE_HEIGHT: 0.27,
  HOLE_WIDTH: 0.12,
  HOLE_HEIGHT: 0.05,
  // Kardus diangkat & dilempar saat kucing di dalamnya tertangkap
  TOSS_SPEED: 1.2,
  TOSS_UP: 2.2,
  TOSS_SPIN: 5,
  TOSS_RESTITUTION: 0.2,
  TOSS_FRICTION: 6
};

// --- Kolong tempat sembunyi (sofa, kasur, meja kerja, meja makan) ---
export const HIDE_SPOT = {
  CROUCH_MIN: 0.5, // kucing tersembunyi di kolong hanya jika merendah (crouch ≥ ini)
  CHECK_DIST: 0.8, // pemilik menyelidiki ≤ jarak ini dari kolong → mungkin membungkuk
  CHECK_CHANCE: 0.25,
  KNEEL_DURATION: 1.5
};

// --- Menumpang robot vacuum ---
export const RIDE = {
  MOUNT_RADIUS: 0.2, // jarak horizontal dari pusat robot untuk mendarat di atasnya
  MOUNT_TOLERANCE: 0.06,
  SEATED_HEIGHT: 0.27, // tinggi kucing duduk (untuk kolong)
  DISMOUNT_SPEED: 1.2,
  DISMOUNT_UP: 2.6,
  SUSPICION_MULT: 0.5, // pemilik melihat kucing menumpang: curiga naik setengah
  SIT_LEAN: -0.35, // badan tegak saat duduk
  TURN_LERP: 6, // kucing ikut menghadap arah robot
  REMOUNT_BLOCK: 0.5 // jeda setelah turun sebelum bisa menumpang lagi
};

// --- Bola benang (pengalih) ---
export const YARN = {
  POSITIONS: [{ x: -3.0, z: 1.8 }, { x: -4.0, z: -2.3 }], // ruang tamu, kamar tidur
  RADIUS: 0.05,
  KICK_SPEED: 2.6,
  KICK_UP: 0.6,
  RESTITUTION: 0.35,
  FRICTION: 1.5, // gesekan rendah: menggelinding ±1,7 m
  SPIN_MIN_SPEED: 0.05,
  COOLDOWN: 1.0,
  NOISE_RADIUS: 1.5, // saat berhenti setelah menggelinding
  MIN_ROLL_DIST: 0.3, // berhenti setelah bergeser sejauh ini = noise
  ACTION_DURATION: 0.4,
  HIT_AT: 0.18,
  MARKER_HEIGHT: 0.15
};

// --- Tidur di sinar matahari (GDD §6, §12) ---
export const SUN_ZONES = [
  { x: -5.7, z: 2.3, width: 2.6, depth: 2.6 }, // berkas matahari jendela ruang tamu
  { x: 6.5, z: -2.7, width: 1.0, depth: 1.8 } // dekat jendela dapur
];
export const SUN_NAP = {
  HOLD_TIME: 0.6, // tahan E selama ini untuk tidur
  ZZZ_INTERVAL: 1.5,
  RECENT_CHAOS_RADIUS: 3, // pemilik curiga pada kucing tidur jika ada kekacauan sedekat ini ...
  RECENT_CHAOS_WINDOW: 10, // ... dalam detik terakhir ini
  HEAD_DIP: 0.5,
  MARKER_HEIGHT: 0.4,
  PROMPT_BIAS: 0.5 // prompt tidur kalah dari objek lain di dekatnya
};
