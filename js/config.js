// =====================================================================
// config.js — SEMUA angka penyetelan game ada di sini.
// Aturan proyek: angka penyetelan (kecepatan, gravitasi, ukuran, warna,
// timer, peluang spawn, dll.) selalu ditambahkan ke file ini, bukan
// ditulis langsung di modul lain. Modul lain hanya menyimpan detail
// geometri model (ukuran telinga kucing, kaki meja, dsb.).
// =====================================================================

// --- Ruangan ---
export const ROOM = {
  WIDTH: 22,
  DEPTH: 20,
  HEIGHT: 8,
  WALL_THICKNESS: 0.4,
  BASEBOARD_HEIGHT: 0.22,
  BASEBOARD_DEPTH: 0.08,
  // Jendela besar di dinding barat (-X)
  WINDOW: {
    Z_MIN: -4.2,
    Z_MAX: 2.2,
    Y_MIN: 1.8,
    Y_MAX: 6.2,
    FRAME_THICKNESS: 0.18,
    FRAME_DEPTH: 0.48,
    MULLION_THICKNESS: 0.14,
    MULLION_DEPTH: 0.1,
    GLASS_INSET: 0.15,
    BACKDROP_DISTANCE: 1.2,
    BACKDROP_PADDING: 4
  }
};
export const ROOM_HALF_W = ROOM.WIDTH / 2;
export const ROOM_HALF_D = ROOM.DEPTH / 2;

// --- Fisika umum ---
export const PHYSICS = {
  GRAVITY: -28,
  CLIMB_TOLERANCE: 0.1, // kaki boleh sedikit di bawah topHeight dan tetap dianggap di atas perabot
  MAX_DT: 0.05 // batas delta time per frame (detik)
};

// --- Kucing (pemain) ---
export const PLAYER = {
  RADIUS: 0.52,
  CENTER_HEIGHT: 0.45, // tinggi titik tengah badan untuk cek pickup
  START_POSITION: { x: -2.2, y: 0, z: -1.5 },
  START_YAW: Math.PI, // menghadap -Z saat awal
  MAX_MOVE_SPEED: 9.5,
  ACCELERATION: 42,
  GROUND_FRICTION: 10,
  AIR_FRICTION: 2.5,
  STOP_SPEED: 0.05,
  TURN_SPEED: 12,
  JUMP_FORCE: 8.8,
  HIT_BOUNCE_VELOCITY: 5.5
};

// --- Animasi kucing ---
export const CAT_ANIM = {
  WALK_SPEED_THRESHOLD: 0.35,
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
  WALK_BOB: 0.04,
  WALK_LEAN: 0.11,
  WALK_TAIL_FREQ: 1.1,
  WALK_TAIL_AMP: 0.38,
  // Diam
  IDLE_LERP: 12,
  IDLE_BREATH_FREQ: 2.6,
  IDLE_BREATH_AMP: 0.018,
  IDLE_TAIL_FREQ: 2.4,
  IDLE_TAIL_AMP: 0.16,
  // Pendaratan (squash & stretch)
  SQUASH_DURATION: 0.16,
  SQUASH_WIDEN: 0.12,
  SQUASH_FLATTEN: 0.16,
  // Kedip saat kebal
  BLINK_RATE: 12
};

// --- Aturan game ---
export const GAME = {
  MAX_LIVES: 3,
  INVULNERABLE_DURATION: 1.5
};

// --- Koin / kristal ---
export const COIN = {
  RADIUS: 0.5,
  THICKNESS: 0.14,
  SEGMENTS: 18,
  HOVER_HEIGHT: 0.25,
  SPIN_SPEED: 3.5,
  SCORE: 10,
  COINS_PER_LEVEL: 5,
  FURNITURE_SPAWN_CHANCE: 0.35, // peluang muncul di atas perabot yang bisa dinaiki
  FURNITURE_SPAWN_ATTEMPTS: 20,
  FURNITURE_EDGE_PAD: 0.12,
  MIN_PLAYER_DIST_FURNITURE: 2.0,
  MIN_PLAYER_DIST_FLOOR: 2.5
};

// --- Robot vacuum (rintangan) ---
export const VACUUM = {
  RADIUS: 0.68,
  HEIGHT: 0.28,
  BASE_SPEED: 4.2,
  SPEED_PER_LEVEL: 1.2,
  SPIN_SPEED: 2.5,
  INITIAL_COUNT: 2,
  MIN_PLAYER_DIST: 3.8,
  SUBSTEP_THRESHOLD: 0.3, // jika langkah per frame > ini, pecah jadi 2 sub-step
  WALL_CHECK_SHRINK: 0.1,
  HIT_SHRINK: 0.08,
  HIT_HEIGHT_MARGIN: 0.15
};

// --- Power-up magnet ---
export const POWERUP = {
  SIZE: 0.42,
  SPAWN_RADIUS: 0.55,
  PICKUP_RADIUS: 0.55,
  HOVER_Y: 0.8,
  SPIN_Y: 2.6,
  SPIN_X: 1.4,
  FIRST_SPAWN_DELAY: 6,
  SPAWN_INTERVAL: 10,
  MIN_PLAYER_DIST: 2.5,
  MAGNET_DURATION: 5,
  MAGNET_RADIUS: 8.5,
  MAGNET_PULL_SPEED: 14,
  MAGNET_MIN_DIST: 0.05
};

// --- Pencarian posisi spawn bebas ---
export const SPAWN = {
  WALL_MARGIN_EXTRA: 0.35,
  FURNITURE_MARGIN_EXTRA: 0.25,
  RANGE_MARGIN: 0.6,
  MAX_ATTEMPTS: 60,
  FALLBACK_POSITION: { x: -2.5, z: -2.5 }
};

// --- Kamera third-person ---
export const CAMERA = {
  FOV: 58,
  NEAR: 0.1,
  FAR: 80,
  OFFSET_Y: 5.6,
  OFFSET_Z: 8.4,
  LOOK_HEIGHT: 0.65,
  WALL_MARGIN: 0.65,
  MIN_Y: 1.2,
  CEILING_MARGIN: 0.6,
  SMOOTHING: 6.5,
  START_POSITION: { x: -2.2, y: 5.8, z: 6.2 },
  START_LOOK_HEIGHT: 0.7
};

// --- Renderer & atmosfer ---
export const RENDERER = {
  ANTIALIAS: true,
  MAX_PIXEL_RATIO: 2,
  TONE_MAPPING_EXPOSURE: 1.05,
  BACKGROUND_COLOR: 0x1f1914,
  FOG_COLOR: 0x2b221a,
  FOG_NEAR: 18,
  FOG_FAR: 42
};

// --- Pencahayaan (maksimal 2 shadow caster aktif) ---
export const LIGHTS = {
  hemi: { skyColor: 0xfff4e0, groundColor: 0x7d5836, intensity: 0.65 },
  sun: {
    color: 0xffe8c2,
    intensity: 1.35,
    position: [-16, 8.5, -1.5],
    target: [2, 0, 0.5],
    shadowMapSize: 2048,
    shadowCamera: { near: 2, far: 36, left: -13, right: 13, top: 12, bottom: -12 },
    shadowBias: -0.0006
  },
  lamp: {
    color: 0xffcb85,
    intensity: 1.15,
    distance: 18,
    decay: 2,
    position: [-4.3, 3.6, 5.2],
    shadowMapSize: 1024,
    shadowBias: -0.001
  },
  fill: {
    color: 0xffe6cc,
    intensity: 0.45,
    distance: 16,
    decay: 2,
    position: [4.5, 5.5, -5.5]
  }
};

// --- Tekstur prosedural ---
export const TEXTURES = {
  woodFloor: {
    SIZE: 512,
    ROWS: 8,
    COLS: 2,
    ROW_OFFSET: 128,
    REPEAT: 5,
    BASE_COLOR: '#9c6b43',
    TONES: ['#a47148', '#8f5f39', '#b07b4f', '#97663e', '#845633'],
    GRAIN_COLOR: 'rgba(58, 34, 16, 0.16)',
    GRAIN_WIDTH: 1.2,
    GRAIN_LINES: 9,
    SEAM_COLOR: 'rgba(42, 24, 12, 0.45)',
    SEAM_WIDTH: 2
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
  // Item & rintangan
  coin: { color: 0xfacc15, roughness: 0.22, metalness: 0.7 },
  powerUp: { color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.45 },
  vacuumBody: { color: 0x27272a, roughness: 0.35, metalness: 0.55 },
  vacuumRing: { color: 0xdc2626, roughness: 0.3, metalness: 0.3 },
  vacuumSensor: { color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.7, roughness: 0.2 }
};

// --- Tata letak perabotan (posisi grup & collider AABB) ---
// Collider: koordinat dunia. topHeight = tinggi permukaan atas,
// climbable = kucing bisa mendarat/berdiri di atasnya.
// Urutan collider penting: menentukan urutan resolusi tabrakan.
export const FURNITURE_LAYOUT = {
  rug: { x: 0, z: 2.7, width: 6.8, depth: 5.2 },
  sofa: {
    x: 0, z: 4.8,
    colliders: [
      { x: 0, z: 4.58, width: 5.2, depth: 1.48, topHeight: 0.70, climbable: true }, // dudukan
      { x: 0, z: 5.54, width: 5.2, depth: 0.44, topHeight: 1.68, climbable: false } // sandaran
    ]
  },
  coffeeTable: {
    x: 0, z: 1.3,
    colliders: [{ x: 0, z: 1.3, width: 2.9, depth: 1.55, topHeight: 0.68, climbable: true }]
  },
  tvUnit: {
    x: 0, z: -9.25,
    colliders: [{ x: 0, z: -9.25, width: 4.5, depth: 1.2, topHeight: 0.72, climbable: true }]
  },
  tallShelf: {
    x: 9.8, z: -3.5,
    colliders: [{ x: 9.8, z: -3.5, width: 1.4, depth: 3.5, topHeight: 4.2, climbable: false }]
  },
  lowShelf: {
    x: 9.75, z: -0.5,
    colliders: [{ x: 9.75, z: -0.5, width: 1.4, depth: 2.3, topHeight: 0.86, climbable: true }]
  },
  chair: {
    x: 4.8, z: 2.6,
    colliders: [{ x: 4.8, z: 2.6, width: 1.4, depth: 1.4, topHeight: 0.58, climbable: true }]
  },
  floorLamp: {
    x: -4.3, z: 5.2,
    colliders: [{ x: -4.3, z: 5.2, width: 1.0, depth: 1.0, topHeight: 3.8, climbable: false }]
  },
  plants: {
    positions: [{ x: -9.1, z: -7.2 }, { x: 9.0, z: 6.8 }],
    collider: { width: 1.1, depth: 1.1, topHeight: 1.9, climbable: false }
  }
};

// --- Partikel saat mengambil koin ---
export const COIN_PARTICLES = {
  COUNT: 12,
  SIZE: 0.12,
  COLOR: 0xfde047,
  SPEED_MIN: 2.5,
  SPEED_RANGE: 4,
  UP_MIN: 3,
  UP_RANGE: 4,
  LIFE: 0.45,
  GRAVITY_SCALE: 0.5,
  SPIN_SPEED: 6,
  MIN_SCALE: 0.01
};

// --- Partikel debu cahaya di dekat jendela ---
export const DUST = {
  COUNT: 80,
  COLOR: 0xfff3c4,
  SIZE: 0.08,
  OPACITY: 0.55,
  SPAWN: { X_MIN: -10.2, X_RANGE: 6.5, Y_MIN: 0.8, Y_RANGE: 5.2, Z_MIN: -4.2, Z_RANGE: 6.4 },
  VELOCITY: { X_SCALE: 0.15, X_BIAS: 0.3, Y_SCALE: 0.12, Z_SCALE: 0.15 },
  // Batas wrap-around: jika lewat batas, pindah ke posisi reset
  WRAP: {
    X_MAX: -3.5, X_MAX_RESET: -10.2,
    X_MIN: -10.5, X_MIN_RESET: -3.8,
    Y_MAX: 6.2, Y_MAX_RESET: 0.8,
    Y_MIN: 0.7, Y_MIN_RESET: 6.0,
    Z_MAX: 2.4, Z_MAX_RESET: -4.2,
    Z_MIN: -4.3, Z_MIN_RESET: 2.2
  }
};

// --- Efek suara (Web Audio) ---
// Tiap nada: [freqStart, freqEnd, duration, type, volume, delay]
export const AUDIO = {
  MIN_FREQ: 20,
  FADE_TO: 0.001,
  SFX: {
    coin: [
      [660, 880, 0.09, 'sine', 0.14, 0],
      [990, 1320, 0.14, 'triangle', 0.12, 0.06]
    ],
    jump: [[260, 520, 0.12, 'sine', 0.12, 0]],
    hit: [[190, 75, 0.22, 'sawtooth', 0.16, 0]],
    gameOver: [
      [300, 220, 0.15, 'triangle', 0.16, 0],
      [220, 150, 0.18, 'triangle', 0.16, 0.14],
      [150, 90, 0.28, 'sawtooth', 0.14, 0.3]
    ],
    powerUp: [
      [440, 660, 0.1, 'sine', 0.14, 0],
      [660, 1046, 0.16, 'triangle', 0.14, 0.08]
    ]
  }
};

// =====================================================================
// MEONG MAYHEM — nilai awal dari docs/GDD.md (disetel ulang lewat playtest).
// Satuan jarak: 1 unit dunia = 1 meter. Waktu dalam detik.
// Sebagian besar nilai di bawah belum dipakai; akan dipakai sesuai fase
// di peta pengembangan GDD.
// =====================================================================

// --- Level & penilaian (GDD §4) ---
export const LEVELS = [
  { id: 1, DURATION: 240, TARGET_CHAOS: 300 }
];
// Rating bintang: kelipatan target Chaos untuk 1, 2, 3 bintang
export const STAR_THRESHOLDS = [1.0, 1.5, 2.0];

// --- Kenakalan & Chaos (GDD §5) ---
export const MISCHIEF = {
  tissue: { CHAOS: 15, NOISE_RADIUS: 2 }, // tumpahkan tisu
  scratchSofa: { CHAOS: 20, NOISE_RADIUS: 4 }, // cakar sofa
  remote: { CHAOS: 30, NOISE_RADIUS: 6 }, // injak remote, TV menyala
  glass: { CHAOS: 40, NOISE_RADIUS: 10 }, // jatuhkan gelas sampai pecah
  pot: { CHAOS: 50, NOISE_RADIUS: 8 }, // gulingkan pot
  kitchenFish: { CHAOS: 80, NOISE_RADIUS: 3 } // curi ikan di dapur
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
  NOISE_RADIUS: 12,
  ANNOY_COUNT: 3, // jumlah meongan ...
  ANNOY_WINDOW: 30 // ... dalam jendela waktu ini membuat pemilik jengkel
};

// --- Pemilik rumah (GDD §8) ---
export const OWNER = {
  VISION_ANGLE_DEG: 70,
  VISION_RANGE: 8,
  TOILET_DURATION: 20 // keluar ruangan
};

// --- Akhir level & tabungan Chaos (GDD §10) ---
export const RESULTS = {
  BANK_FRACTION_TIME_UP: 1.0, // waktu habis: semua Chaos masuk tabungan
  BANK_FRACTION_OUT_OF_LIVES: 0.5, // nyawa habis: hanya 50%
  LOSE_MESSAGE: 'Rumah masih terlalu rapi...'
};

// --- Camilan & fitur lucu (GDD §11–12) ---
export const CATNIP = {
  ZOOMIES_DURATION: 6
};
export const IDLE = {
  LOAF_DELAY: 5 // detik diam sebelum loaf pose
};
