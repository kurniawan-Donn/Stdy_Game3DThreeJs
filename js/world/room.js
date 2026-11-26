// Rumah satu lantai (denah: docs/denah.md): lantai kayu + keramik, dinding
// luar dengan jendela, dinding dalam dengan bukaan pintu, plafon.
// Semua geometri statis digabung per material (core/mergeStatic.js).
// Mengembalikan:
//   colliders       collider dinding dalam (kucing, pandangan pemilik, navigasi)
//   cameraBlockers  kotak 3D yang menahan lengan kamera (dinding dalam & ambang pintu)
//   mergeStats      jumlah mesh sebelum/sesudah digabung
import * as THREE from 'three';
import { ROOM, ROOM_HALF_W, ROOM_HALF_D, HOUSE, MATERIALS, TEXTURES } from '../config.js';
import { createWoodFloorTexture, createTileTexture } from './textures.js';
import { mergeStaticGroup } from '../core/mergeStatic.js';

const H = ROOM.HEIGHT;

function box(group, mat, w, h, d, x, y, z, { cast = false, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  group.add(m);
  return m;
}

// Membagi rentang [from, to] menjadi potongan padat di sekitar bukaan.
// openings: [{ a, b, yMin, yMax }] → segmen penuh + potongan bawah/atas bukaan
function wallPieces(from, to, openings) {
  const pieces = [];
  const sorted = [...openings].sort((p, q) => p.a - q.a);
  let cursor = from;
  for (const o of sorted) {
    if (o.a > cursor) pieces.push({ a: cursor, b: o.a, yMin: 0, yMax: H, full: true });
    if (o.yMin > 0) pieces.push({ a: o.a, b: o.b, yMin: 0, yMax: o.yMin, full: false });
    if (o.yMax < H) pieces.push({ a: o.a, b: o.b, yMin: o.yMax, yMax: H, full: false, lintel: true });
    cursor = o.b;
  }
  if (cursor < to) pieces.push({ a: cursor, b: to, yMin: 0, yMax: H, full: true });
  return pieces;
}

// Kotak dinding untuk sebuah potongan. axis 'x': membentang sepanjang X di z = at.
function pieceBox(axis, at, thick, p) {
  const len = p.b - p.a;
  const mid = (p.a + p.b) / 2;
  return axis === 'x'
    ? { w: len, d: thick, x: mid, z: at, minX: p.a, maxX: p.b, minZ: at - thick / 2, maxZ: at + thick / 2 }
    : { w: thick, d: len, x: at, z: mid, minX: at - thick / 2, maxX: at + thick / 2, minZ: p.a, maxZ: p.b };
}

export function createLivingRoom(scene) {
  const group = new THREE.Group();
  const colliders = [];
  const cameraBlockers = [];

  const wallMat = new THREE.MeshStandardMaterial({ ...MATERIALS.wall });
  const trimMat = new THREE.MeshStandardMaterial({ ...MATERIALS.trim });
  const W = ROOM.WIDTH;
  const D = ROOM.DEPTH;

  // --- Lantai kayu seluruh rumah ---
  const wood = createWoodFloorTexture();
  wood.repeat.set(W / TEXTURES.woodFloor.TILE_METERS, D / TEXTURES.woodFloor.TILE_METERS);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: wood, ...MATERIALS.floor }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // --- Lantai keramik (dapur, kamar mandi) ---
  const tileTex = createTileTexture();
  const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, ...MATERIALS.tileFloor });
  for (const t of HOUSE.tileFloors) {
    const w = t.maxX - t.minX;
    const d = t.maxZ - t.minZ;
    const geo = new THREE.PlaneGeometry(w, d);
    // UV dalam meter agar ubin seukuran sama di semua ruangan
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (uv.getX(i) * w) / TEXTURES.tile.TILE_METERS, (uv.getY(i) * d) / TEXTURES.tile.TILE_METERS);
    }
    const m = new THREE.Mesh(geo, tileMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((t.minX + t.maxX) / 2, 0.002, (t.minZ + t.maxZ) / 2);
    m.receiveShadow = true;
    group.add(m);
  }

  // --- Plafon ---
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ ...MATERIALS.ceiling }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  group.add(ceiling);

  // --- Dinding luar (di luar batas ruangan) dengan jendela ---
  const t = ROOM.WALL_THICKNESS;
  const F = ROOM.WINDOW_FRAME;
  const outer = {
    north: { axis: 'x', at: -ROOM_HALF_D - t / 2, from: -ROOM_HALF_W - t, to: ROOM_HALF_W + t, inward: 1 },
    south: { axis: 'x', at: ROOM_HALF_D + t / 2, from: -ROOM_HALF_W - t, to: ROOM_HALF_W + t, inward: -1 },
    west: { axis: 'z', at: -ROOM_HALF_W - t / 2, from: -ROOM_HALF_D, to: ROOM_HALF_D, inward: 1 },
    east: { axis: 'z', at: ROOM_HALF_W + t / 2, from: -ROOM_HALF_D, to: ROOM_HALF_D, inward: -1 }
  };
  const glassMat = new THREE.MeshStandardMaterial({ ...MATERIALS.glass });
  const backdropMat = new THREE.MeshBasicMaterial({ ...MATERIALS.windowBackdrop });
  const curtainMat = new THREE.MeshStandardMaterial({ ...MATERIALS.curtain, side: THREE.DoubleSide });

  for (const [name, wall] of Object.entries(outer)) {
    const wins = HOUSE.windows.filter((w) => w.wall === name);
    const openings = wins.map((w) => ({ a: w.from, b: w.to, yMin: w.yMin, yMax: w.yMax }));
    for (const p of wallPieces(wall.from, wall.to, openings)) {
      const b = pieceBox(wall.axis, wall.at, t, p);
      const m = box(group, wallMat, b.w, p.yMax - p.yMin, b.d, b.x, (p.yMin + p.yMax) / 2, b.z, { cast: !p.full });
      m.castShadow = true; // dinding luar ikut menahan sinar matahari (hanya lewat jendela)
    }
    // Lis bawah
    const bb = pieceBox(wall.axis, wall.at + wall.inward * (t / 2 + ROOM.BASEBOARD_DEPTH / 2), ROOM.BASEBOARD_DEPTH, { a: wall.from + t, b: wall.to - t });
    box(group, trimMat, bb.w, ROOM.BASEBOARD_HEIGHT, bb.d, bb.x, ROOM.BASEBOARD_HEIGHT / 2, bb.z);

    // Jendela: kusen, palang, kaca, latar langit / tirai
    for (const w of wins) {
      const len = w.to - w.from;
      const h = w.yMax - w.yMin;
      const mid = (w.from + w.to) / 2;
      const cy = (w.yMin + w.yMax) / 2;
      const along = (x, y, z) => (wall.axis === 'z' ? [wall.at + x, y, mid + z] : [mid + z, y, wall.at + x]);
      const sizeAlong = (a, h2, b) => (wall.axis === 'z' ? [a, h2, b] : [b, h2, a]);
      // Bidang (kaca, langit, tirai) menghadap ke dalam rumah
      const faceIn = wall.axis === 'z' ? (wall.inward > 0 ? Math.PI / 2 : -Math.PI / 2) : (wall.inward > 0 ? 0 : Math.PI);
      // kusen atas/bawah/samping
      for (const yy of [w.yMax + F.THICKNESS / 2, w.yMin - F.THICKNESS / 2]) {
        const [sx, sy, sz] = sizeAlong(F.DEPTH, F.THICKNESS, len + F.THICKNESS * 2);
        box(group, trimMat, sx, sy, sz, ...along(0, yy, 0));
      }
      for (const side of [-1, 1]) {
        const [sx, sy, sz] = sizeAlong(F.DEPTH, h, F.THICKNESS);
        box(group, trimMat, sx, sy, sz, ...along(0, cy, side * (len / 2 + F.THICKNESS / 2)));
      }
      // palang tengah
      {
        const [sx, sy, sz] = sizeAlong(F.MULLION, h, F.MULLION * 0.8);
        box(group, trimMat, sx, sy, sz, ...along(0, cy, 0), { cast: true });
        const [hx, hy, hz] = sizeAlong(F.MULLION, F.MULLION * 0.8, len);
        box(group, trimMat, hx, hy, hz, ...along(0, cy, 0), { cast: true });
      }
      // kaca
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(len, h), glassMat);
      glass.position.set(...along(wall.inward * (t / 2 - F.GLASS_INSET), cy, 0));
      glass.rotation.y = faceIn;
      group.add(glass);
      if (w.type === 'curtain') {
        // Tirai tertutup: kamar tidur gelap
        const curtain = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.3, h + 0.3), curtainMat);
        curtain.position.set(...along(wall.inward * (t / 2 + 0.05), cy, 0));
        curtain.rotation.y = faceIn;
        curtain.castShadow = true;
        group.add(curtain);
      } else {
        const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(len + F.BACKDROP_PADDING, h + F.BACKDROP_PADDING), backdropMat);
        backdrop.position.set(...along(-wall.inward * F.BACKDROP_DISTANCE, cy, 0));
        backdrop.rotation.y = faceIn;
        group.add(backdrop);
      }
    }
  }

  // --- Dinding dalam dengan bukaan pintu ---
  const it = ROOM.INNER_WALL_THICKNESS;
  for (const wall of HOUSE.innerWalls) {
    const openings = wall.openings.map((o) => ({ a: o.center - o.width / 2, b: o.center + o.width / 2, yMin: 0, yMax: o.height }));
    for (const p of wallPieces(wall.from, wall.to, openings)) {
      const b = pieceBox(wall.axis, wall.at, it, p);
      box(group, wallMat, b.w, p.yMax - p.yMin, b.d, b.x, (p.yMin + p.yMax) / 2, b.z, { cast: true });
      const blocker = { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, minY: p.yMin, topHeight: p.yMax };
      cameraBlockers.push(blocker);
      if (p.full) {
        colliders.push({ ...blocker, climbable: false, occludes: true, navBlocks: true, wall: true });
        // Lis bawah kedua sisi
        for (const side of [-1, 1]) {
          const bb = pieceBox(wall.axis, wall.at + side * (it / 2 + ROOM.BASEBOARD_DEPTH / 2), ROOM.BASEBOARD_DEPTH, p);
          box(group, trimMat, bb.w, ROOM.BASEBOARD_HEIGHT, bb.d, bb.x, ROOM.BASEBOARD_HEIGHT / 2, bb.z);
        }
      }
    }
    // Kusen pintu
    for (const o of wall.openings) {
      for (const side of [-1, 1]) {
        const p = { a: o.center + side * (o.width / 2) - 0.025, b: o.center + side * (o.width / 2) + 0.025 };
        const b = pieceBox(wall.axis, wall.at, it + 0.03, p);
        box(group, trimMat, b.w, o.height, b.d, b.x, o.height / 2, b.z);
      }
    }
  }

  const mergeStats = mergeStaticGroup(group);
  scene.add(group);
  return { colliders, cameraBlockers, mergeStats };
}
