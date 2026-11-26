// =====================================================================
// config.js — SEMUA angka penyetelan game ada di sini.
// Aturan proyek: angka penyetelan (kecepatan, gravitasi, ukuran, warna,
// timer, peluang spawn, dll.) selalu ditambahkan ke file ini, bukan
// ditulis langsung di modul lain. Modul lain hanya menyimpan detail
// geometri model (ukuran telinga kucing, kaki meja, dsb.).
// =====================================================================

// --- Skala dunia nyata (meter). Acuan semua model & collider. ---
// Tata letak ruangan memakai faktor WORLD_SCALE terhadap prototipe lama
// (22 × 20 m) sehingga ruang tamu menjadi 8,8 × 8 m dan waktu tempuh kucing
// antar-objek terasa sama seperti sebelum skala diperbaiki.
export const WORLD_SCALE = 0.4;
export const REAL_SCALE = {
  cat: { SHOULDER: 0.25, EAR_TIP: 0.35, BODY_LENGTH: 0.45, TAIL: 0.3 },
  owner: { HEIGHT: 1.7 },
  sofa: { SEAT: 0.45, BACK: 0.85, DEPTH: 0.9, WIDTH: 2.0 },
  coffeeTable: { HEIGHT: 0.45, WIDTH: 1.1, DEPTH: 0.6 },
  workDesk: { HEIGHT: 0.75, WIDTH: 1.2, DEPTH: 0.6 },
  chair: { SEAT: 0.45, WIDTH: 0.55 },
  counter: { HEIGHT: 0.9, WIDTH: 1.8, DEPTH: 0.6 },
  fridge: { HEIGHT: 1.8, WIDTH: 0.7, DEPTH: 0.65 },
  tvRack: { HEIGHT: 0.5, WIDTH: 1.6, DEPTH: 0.4 },
  bookshelf: { HEIGHT: 1.8, WIDTH: 0.8, DEPTH: 0.3 },
  lowShelf: { HEIGHT: 0.9, WIDTH: 0.9, DEPTH: 0.4 }, // batu loncatan ke rak buku
  vacuum: { DIAMETER: 0.34, HEIGHT: 0.09 },
  glass: { HEIGHT: 0.12 },
  pot: { HEIGHT: 0.4 }, // rentang nyata 0,30–0,50
  plant: { HEIGHT: 1.0 },
  box: { HEIGHT_MIN: 0.4, HEIGHT_MAX: 0.5 }, // kardus (Fase 5)
  door: { HEIGHT: 2.0, WIDTH: 0.85 },
  ceiling: 2.7
};
const RS = REAL_SCALE;

// --- Ruangan ---
export const ROOM = {
  WIDTH: 8.8,
  DEPTH: 8,
  HEIGHT: RS.ceiling,
  WALL_THICKNESS: 0.15,
  BASEBOARD_HEIGHT: 0.09,
  BASEBOARD_DEPTH: 0.02,
  // Jendela besar di dinding barat (-X)
  WINDOW: {
    Z_MIN: -1.68,
    Z_MAX: 0.88,
    Y_MIN: 0.8,
    Y_MAX: 2.2,
    FRAME_THICKNESS: 0.07,
    FRAME_DEPTH: 0.19,
    MULLION_THICKNESS: 0.05,
    MULLION_DEPTH: 0.04,
    GLASS_INSET: 0.06,
    BACKDROP_DISTANCE: 0.5,
    BACKDROP_PADDING: 1.6
  }
};
export const ROOM_HALF_W = ROOM.WIDTH / 2;
export const ROOM_HALF_D = ROOM.DEPTH / 2;

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
  START_POSITION: { x: -0.9, y: 0, z: -0.6 },
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
  PATH_COLOR: 0xe879f9
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
  BASE_SPEED: 1.7,
  SPIN_SPEED: 2.5,
  INITIAL_COUNT: 2,
  MIN_PLAYER_DIST: 1.5,
  SUBSTEP_THRESHOLD: 0.12, // jika langkah per frame > ini, pecah jadi 2 sub-step
  WALL_CHECK_SHRINK: 0.04,
  BLOCK_HEIGHT: 0.12 // kucing di bawah ketinggian ini tertahan tubuh robot
};

// --- Pencarian posisi spawn bebas ---
export const SPAWN = {
  WALL_MARGIN_EXTRA: 0.15,
  FURNITURE_MARGIN_EXTRA: 0.1,
  RANGE_MARGIN: 0.25,
  MAX_ATTEMPTS: 60,
  FALLBACK_POSITION: { x: -1.0, z: -1.0 }
};

// --- Kamera third-person ---
export const CAMERA = {
  FOV: 58,
  NEAR: 0.05,
  FAR: 40,
  OFFSET_Y: 1.5,
  OFFSET_Z: 2.6,
  LOOK_HEIGHT: 0.2,
  WALL_MARGIN: 0.25,
  MIN_Y: 0.5,
  CEILING_MARGIN: 0.25,
  SMOOTHING: 6.5,
  START_POSITION: { x: -0.9, y: 1.5, z: 2.0 },
  START_LOOK_HEIGHT: 0.2
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
  hemi: { skyColor: 0xfff4e0, groundColor: 0x7d5836, intensity: 0.65 },
  sun: {
    color: 0xffe8c2,
    intensity: 1.35,
    position: [-6.4, 3.0, -0.6], // di luar jendela barat, masuk lewat bukaan jendela
    target: [0.8, 0, 0.2],
    shadowMapSize: 2048,
    shadowCamera: { near: 0.8, far: 14.4, left: -5.2, right: 5.2, top: 4.8, bottom: -4.8 },
    shadowBias: -0.0006
  },
  lamp: {
    color: 0xffcb85,
    intensity: 1.15,
    distance: 7.2,
    decay: 2,
    position: [-1.72, 1.45, 2.08],
    shadowMapSize: 1024,
    shadowBias: -0.001
  },
  fill: {
    color: 0xffe6cc,
    intensity: 0.45,
    distance: 6.4,
    decay: 2,
    position: [1.8, 2.3, -2.2]
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
  vacuumBody: { color: 0x27272a, roughness: 0.35, metalness: 0.55 },
  vacuumRing: { color: 0xdc2626, roughness: 0.3, metalness: 0.3 },
  vacuumSensor: { color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.7, roughness: 0.2 }
};

// --- Tata letak perabotan (posisi grup & collider AABB) ---
// Collider: koordinat dunia. topHeight = tinggi permukaan atas,
// climbable = kucing bisa mendarat/berdiri di atasnya.
// Urutan collider penting: menentukan urutan resolusi tabrakan.
export const FURNITURE_LAYOUT = {
  rug: { x: 0, z: 1.1, width: 2.7, depth: 2.1 },
  // Sofa: dudukan menghadap utara (-Z), sandaran di sisi selatan (+Z)
  sofa: {
    x: 0, z: 1.92,
    colliders: [
      { x: 0, z: 1.81, width: RS.sofa.WIDTH, depth: 0.68, topHeight: RS.sofa.SEAT, climbable: true }, // dudukan (lompat biasa)
      { x: 0, z: 2.26, width: RS.sofa.WIDTH, depth: 0.22, topHeight: RS.sofa.BACK, climbable: true } // sandaran (lompat tinggi)
    ]
  },
  coffeeTable: {
    x: 0, z: 0.52,
    colliders: [{ x: 0, z: 0.52, width: RS.coffeeTable.WIDTH, depth: RS.coffeeTable.DEPTH, topHeight: RS.coffeeTable.HEIGHT, climbable: true }]
  },
  tvUnit: {
    x: 0, z: -3.8,
    colliders: [{ x: 0, z: -3.8, width: RS.tvRack.WIDTH, depth: RS.tvRack.DEPTH, topHeight: RS.tvRack.HEIGHT, climbable: true }]
  },
  // Rak buku tinggi menempel dinding timur: tempat tinggi, dicapai dari rak rendah
  tallShelf: {
    x: 4.25, z: -1.35,
    colliders: [{ x: 4.25, z: -1.35, width: RS.bookshelf.DEPTH, depth: RS.bookshelf.WIDTH, topHeight: RS.bookshelf.HEIGHT, climbable: true }]
  },
  lowShelf: {
    x: 4.2, z: -0.5,
    colliders: [{ x: 4.2, z: -0.5, width: RS.lowShelf.DEPTH, depth: RS.lowShelf.WIDTH, topHeight: RS.lowShelf.HEIGHT, climbable: true }]
  },
  chair: {
    x: 1.9, z: 1.0,
    colliders: [{ x: 1.9, z: 1.0, width: RS.chair.WIDTH, depth: RS.chair.WIDTH, topHeight: RS.chair.SEAT, climbable: true }]
  },
  floorLamp: {
    x: -1.72, z: 2.08,
    colliders: [{ x: -1.72, z: 2.08, width: 0.4, depth: 0.4, topHeight: 1.6, climbable: false, occludes: false }] // tiang tipis: tidak menghalangi pandangan
  },
  plants: {
    positions: [{ x: -4.05, z: 1.5 }, { x: 3.6, z: 2.72 }], // barat (selatan jendela) & tenggara
    collider: { width: 0.45, depth: 0.45, topHeight: RS.plant.HEIGHT, climbable: false, occludes: false } // daun: tidak menghalangi pandangan
  },
  // Pojok dapur di sudut barat laut, menghadap kamera
  kitchenCounter: {
    x: -3.5, z: -3.7,
    colliders: [{ x: -3.5, z: -3.7, width: RS.counter.WIDTH, depth: RS.counter.DEPTH, topHeight: RS.counter.HEIGHT, climbable: true }] // lompat tinggi
  },
  fridge: {
    x: -2.2, z: -3.675,
    colliders: [{ x: -2.2, z: -3.675, width: RS.fridge.WIDTH, depth: RS.fridge.DEPTH, topHeight: RS.fridge.HEIGHT, climbable: true }] // tempat tinggi: dari konter
  },
  // Pos kerja pemilik: meja (lompat tinggi), kursi, laptop. Pemilik duduk
  // menghadap dinding utara (membelakangi ruangan).
  workDesk: {
    x: 2.4, z: -3.7,
    colliders: [{ x: 2.4, z: -3.7, width: RS.workDesk.WIDTH, depth: RS.workDesk.DEPTH, topHeight: RS.workDesk.HEIGHT, climbable: true }]
  },
  workChair: {
    x: 2.4, z: -2.95,
    colliders: [{ x: 2.4, z: -2.95, width: 0.5, depth: 0.5, topHeight: RS.chair.SEAT, climbable: false, occludes: false, navBlocks: false }]
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
  SPAWN: { X_MIN: -4.08, X_RANGE: 2.6, Y_MIN: 0.35, Y_RANGE: 1.9, Z_MIN: -1.68, Z_RANGE: 2.56 },
  VELOCITY: { X_SCALE: 0.06, X_BIAS: 0.3, Y_SCALE: 0.05, Z_SCALE: 0.06 },
  // Batas wrap-around: jika lewat batas, pindah ke posisi reset
  WRAP: {
    X_MAX: -1.4, X_MAX_RESET: -4.08,
    X_MIN: -4.2, X_MIN_RESET: -1.52,
    Y_MAX: 2.3, Y_MAX_RESET: 0.35,
    Y_MIN: 0.3, Y_MIN_RESET: 2.2,
    Z_MAX: 0.96, Z_MAX_RESET: -1.68,
    Z_MIN: -1.72, Z_MIN_RESET: 0.88
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
    door: [{ DURATION: 0.4, VOLUME: 0.05, FILTER: 'bandpass', FREQ: 900, Q: 4, DELAY: 0 }],
    flush: [{ DURATION: 1.2, VOLUME: 0.08, FILTER: 'lowpass', FREQ: 1200, Q: 0.7, DELAY: 0 }]
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
export const LEVELS = [
  { id: 1, DURATION: 240, TARGET_CHAOS: 300 }
];
// Rating bintang: kelipatan target Chaos untuk 1, 2, 3 bintang
export const STAR_THRESHOLDS = [1.0, 1.5, 2.0];

// --- Kenakalan & Chaos (GDD §5) ---
export const MISCHIEF = {
  tissue: { CHAOS: 15, NOISE_RADIUS: 0.8 }, // tumpahkan tisu
  scratchSofa: { CHAOS: 20, NOISE_RADIUS: 1.6 }, // cakar sofa
  remote: { CHAOS: 30, NOISE_RADIUS: 2.4 }, // injak remote, TV menyala
  glass: { CHAOS: 40, NOISE_RADIUS: 4 }, // jatuhkan gelas sampai pecah
  pot: { CHAOS: 50, NOISE_RADIUS: 3.2 }, // gulingkan pot
  kitchenFish: { CHAOS: 80, NOISE_RADIUS: 1.2 } // curi ikan di dapur
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
  ZOOMIES_DURATION: 6
};
export const IDLE = {
  LOAF_DELAY: 5 // detik diam sebelum loaf pose
};

// =====================================================================
// FASE 2 — kenakalan, fisika benda, umpan balik, HUD, simpanan
// =====================================================================

// --- Objek kenakalan per level (GDD §5). Tiap objek hanya bisa dipakai
// sekali per level. y = tinggi permukaan tempat objek berada; untuk objek
// di atas perabot kucing harus berdiri di permukaan yang sama. ---
export const MISCHIEF_LAYOUT = {
  glass: [
    { x: 0.4, y: RS.coffeeTable.HEIGHT, z: 0.72 }, // meja kopi
    { x: 0.6, y: RS.tvRack.HEIGHT, z: -3.66 }, // rak TV
    { x: 4.2, y: RS.lowShelf.HEIGHT, z: -0.12 }, // rak rendah
    { x: -2.8, y: RS.counter.HEIGHT, z: -3.52 } // konter dapur
  ],
  tissue: [
    { x: -0.35, y: RS.coffeeTable.HEIGHT, z: 0.38 }, // meja kopi
    { x: 4.2, y: RS.lowShelf.HEIGHT, z: -0.82 } // rak rendah
  ],
  // Cakar: target = nama referensi collider perabot di furniture.js
  scratchSofa: [
    { target: 'sofaSeat', markYMin: 0.1, markYMax: 0.38 },
    { target: 'chair', markYMin: 0.3, markYMax: 0.43 }
  ],
  remote: [{ x: 0.5, y: RS.sofa.SEAT, z: 1.7 }], // di dudukan sofa; suara dari TV
  pot: [{ plant: 0 }, { plant: 1 }], // indeks tanaman di FURNITURE_LAYOUT.plants
  kitchenFish: [{ x: -4.0, y: RS.counter.HEIGHT, z: -3.75 }] // piring di konter dapur
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
  TV_NOISE_POSITION: { x: 0, z: -3.9 }, // noise dipancarkan dari TV
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
  KEY: 'meongMayhem.save.v1'
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
    { id: 'drink', weight: 40, duration: 8 },
    { id: 'window', weight: 35, duration: 10 },
    { id: 'toilet', weight: 25, maxPerLevel: 1 }
  ],
  SPOTS: {
    desk: { x: 2.4, z: -2.95, yaw: Math.PI }, // duduk di kursi kerja
    kitchen: { x: -3.5, z: -2.9, yaw: Math.PI },
    window: { x: -3.9, z: -0.4, yaw: -Math.PI / 2 },
    door: { x: 3.9, z: 1.4, yaw: Math.PI / 2 }
  },
  SIT_HEIGHT: 0.48 // tinggi pinggul saat duduk
};

// --- Pintu (keluar ke toilet) di dinding timur ---
export const DOOR = {
  Z: 1.4,
  WIDTH: RS.door.WIDTH,
  HEIGHT: RS.door.HEIGHT,
  OPEN_ANGLE: 1.6,
  OPEN_SPEED: 3, // rad/detik
  OUTSIDE_X: 5.2 // titik di balik pintu tempat pemilik "menghilang"
};

// --- Keranjang kucing (tempat muncul kembali setelah tertangkap) ---
export const BASKET = {
  x: -3.3,
  z: 3.0,
  RADIUS: 0.25,
  HEIGHT: 0.15
};

// --- Area gelap: jangkauan pandang pemilik ×DARK_RANGE_MULT ---
export const DARK_ZONES = [
  { x: 0, z: 3.15, width: 2.4, depth: 1.5 }, // di belakang sofa
  { x: 3.7, z: -3.0, width: 1.4, depth: 1.8 } // sudut timur laut dekat meja kerja & rak tinggi
];
export const DARK_ZONE_VISUAL = { COLOR: 0x000000, OPACITY: 0.32 };

// --- Grid navigasi + A* ---
export const NAV = {
  CELL_SIZE: 0.1,
  CLEARANCE: 0.42, // radius pemilik + jarak aman dari perabot/dinding
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
  UNDER_HIGH_DIST: 1.0 // dianggap 'di bawah' kucing jika sedekat ini (horizontal)
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
  LOOK_AROUND_SPEED: 1.6, // menoleh kiri-kanan saat menyelidiki
  LOOK_AROUND_YAW: 1.1,
  POSE_LERP: 10
};

// --- Indikator ?/! di atas kepala ---
export const OWNER_INDICATOR = {
  HEIGHT: 2.15 // di atas lantai, relatif posisi pemilik
};
