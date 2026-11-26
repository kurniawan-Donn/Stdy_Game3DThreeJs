// Elemen rumah yang dinamis/khusus: pintu kamar mandi (tertutup saat pemilik
// di dalam), keranjang kucing (tempat muncul kembali), dan area gelap.
import * as THREE from 'three';
import { removeAndDispose } from '../core/dispose.js';
import { DOOR, BASKET, DARK_ZONES, DARK_ZONE_VISUAL, NIGHT_LIGHTS, MATERIALS, ROOM, ROOM_HALF_W, ROOM_HALF_D } from '../config.js';

// --- Pintu kamar mandi ---
// Engsel di sisi barat bukaan; daun pintu membentang ke +X saat tertutup dan
// berayun ke dalam kamar mandi (-Z) saat dibuka. Collider-nya setinggi pintu
// hanya ketika tertutup (menghalangi kucing & pandangan), selain itu 0.
export function createDoor(scene) {
  const pivot = new THREE.Group();
  pivot.position.set(DOOR.HINGE_X, 0, DOOR.Z);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR.WIDTH, DOOR.HEIGHT, DOOR.THICKNESS),
    new THREE.MeshStandardMaterial({ ...MATERIALS.door })
  );
  panel.position.set(DOOR.WIDTH / 2, DOOR.HEIGHT / 2, 0);
  panel.castShadow = true;
  pivot.add(panel);
  const handleMat = new THREE.MeshStandardMaterial({ ...MATERIALS.doorHandle });
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), handleMat);
    handle.position.set(DOOR.WIDTH - 0.1, 1.0, side * (DOOR.THICKNESS / 2 + 0.02));
    pivot.add(handle);
  }
  scene.add(pivot);

  const collider = {
    minX: DOOR.HINGE_X,
    maxX: DOOR.HINGE_X + DOOR.WIDTH,
    minZ: DOOR.Z - DOOR.THICKNESS,
    maxZ: DOOR.Z + DOOR.THICKNESS,
    topHeight: 0,
    climbable: false,
    occludes: true,
    navBlocks: false, // pemilik yang membuka/menutup pintu
    door: true
  };
  const door = { pivot, angle: DOOR.OPEN_ANGLE, target: DOOR.OPEN_ANGLE, collider };
  applyDoor(door);
  return door;
}

function applyDoor(door) {
  door.pivot.rotation.y = door.angle; // positif = berayun ke -Z (dalam kamar mandi)
  door.collider.topHeight = door.angle < DOOR.CLOSED_ANGLE ? DOOR.HEIGHT : 0;
}

export function setDoorOpen(door, open) {
  door.target = open ? DOOR.OPEN_ANGLE : 0;
}

export function resetDoor(door) {
  door.angle = DOOR.OPEN_ANGLE;
  door.target = DOOR.OPEN_ANGLE;
  applyDoor(door);
}

export function updateDoor(door, dt) {
  const step = DOOR.OPEN_SPEED * dt;
  if (Math.abs(door.target - door.angle) <= step) door.angle = door.target;
  else door.angle += Math.sign(door.target - door.angle) * step;
  applyDoor(door);
}

export function isDoorOpen(door) {
  return door.angle >= DOOR.OPEN_ANGLE * 0.9;
}

export function isDoorClosed(door) {
  return door.angle <= 0.001;
}

// --- Keranjang kucing ---
export function createBasket(scene) {
  const group = new THREE.Group();
  group.position.set(BASKET.x, 0, BASKET.z);

  const wickerMat = new THREE.MeshStandardMaterial({ ...MATERIALS.basket, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(BASKET.RADIUS, BASKET.RADIUS * 0.88, BASKET.HEIGHT, 20, 1, true),
    wickerMat
  );
  wall.position.y = BASKET.HEIGHT / 2;
  wall.castShadow = true;
  group.add(wall);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(BASKET.RADIUS, 0.018, 8, 24), wickerMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = BASKET.HEIGHT;
  group.add(rim);

  const cushion = new THREE.Mesh(
    new THREE.CylinderGeometry(BASKET.RADIUS * 0.85, BASKET.RADIUS * 0.85, 0.04, 20),
    new THREE.MeshStandardMaterial({ ...MATERIALS.basketCushion })
  );
  cushion.position.y = 0.025;
  cushion.receiveShadow = true;
  group.add(cushion);

  scene.add(group);
  return group;
}

// --- Area gelap ---
// Lapisan redup hangat di lantai, dinding (dalam & luar), dan plafon setiap
// zona, ditambah lampu malam lemah. wallBoxes = kotak dinding dalam (termasuk
// ambang pintu) dari room.js.
function buildDarkOverlays(wallBoxes) {
  const V = DARK_ZONE_VISUAL;
  const make = (opacity) => new THREE.MeshBasicMaterial({ color: V.COLOR, transparent: true, opacity, depthWrite: false });
  const floorMat = make(V.FLOOR_OPACITY);
  const wallMat = make(V.WALL_OPACITY);
  const ceilMat = make(V.CEILING_OPACITY);
  ceilMat.side = THREE.BackSide;
  const group = new THREE.Group();
  const off = V.SURFACE_OFFSET;
  const tol = V.FACE_TOLERANCE;

  // Bidang dinding: axis 'x' = bidang tegak lurus X (di x = at), sebaliknya Z.
  // normal = arah hadap (+1/-1) ke dalam zona.
  function wallPlane(axis, at, normal, a, b, y0, y1) {
    if (b - a < V.MIN_PIECE || y1 - y0 < V.MIN_PIECE) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, y1 - y0), wallMat);
    const mid = (a + b) / 2;
    if (axis === 'x') {
      m.position.set(at + normal * off, (y0 + y1) / 2, mid);
      m.rotation.y = normal > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      m.position.set(mid, (y0 + y1) / 2, at + normal * off);
      m.rotation.y = normal > 0 ? 0 : Math.PI;
    }
    group.add(m);
  }

  for (const z of DARK_ZONES) {
    const minX = z.x - z.width / 2, maxX = z.x + z.width / 2;
    const minZ = z.z - z.depth / 2, maxZ = z.z + z.depth / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(z.width, z.depth), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(z.x, 0.012, z.z);
    group.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(z.width, z.depth), ceilMat);
    ceil.rotation.x = -Math.PI / 2;
    ceil.position.set(z.x, ROOM.HEIGHT - off, z.z);
    group.add(ceil);

    // Dinding dalam: muka yang menghadap ke dalam zona
    for (const b of wallBoxes) {
      const y0 = b.minY || 0, y1 = b.topHeight;
      const za = Math.max(b.minZ, minZ), zb = Math.min(b.maxZ, maxZ);
      const xa = Math.max(b.minX, minX), xb = Math.min(b.maxX, maxX);
      if (zb > za) {
        if (b.maxX >= minX - tol && maxX - b.maxX > 0.05) wallPlane('x', b.maxX, 1, za, zb, y0, y1);
        if (b.minX <= maxX + tol && b.minX - minX > 0.05) wallPlane('x', b.minX, -1, za, zb, y0, y1);
      }
      if (xb > xa) {
        if (b.maxZ >= minZ - tol && maxZ - b.maxZ > 0.05) wallPlane('z', b.maxZ, 1, xa, xb, y0, y1);
        if (b.minZ <= maxZ + tol && b.minZ - minZ > 0.05) wallPlane('z', b.minZ, -1, xa, xb, y0, y1);
      }
    }
    // Dinding luar yang berimpit dengan tepi zona
    const H = ROOM.HEIGHT;
    if (Math.abs(minX + ROOM_HALF_W) < tol) wallPlane('x', -ROOM_HALF_W, 1, minZ, maxZ, 0, H);
    if (Math.abs(maxX - ROOM_HALF_W) < tol) wallPlane('x', ROOM_HALF_W, -1, minZ, maxZ, 0, H);
    if (Math.abs(minZ + ROOM_HALF_D) < tol) wallPlane('z', -ROOM_HALF_D, 1, minX, maxX, 0, H);
    if (Math.abs(maxZ - ROOM_HALF_D) < tol) wallPlane('z', ROOM_HALF_D, -1, minX, maxX, 0, H);
  }
  return { group, materials: [floorMat, wallMat, ceilMat] };
}

// Lapisan area gelap + lampu malam. Lapisan dibangun ulang saat level
// menambah zona gelap (rebuildDarkOverlays).
export function createDarkZones(scene, wallBoxes = []) {
  const overlays = buildDarkOverlays(wallBoxes);
  const group = overlays.group;
  scene.add(group);

  // Lampu malam: point light lemah tanpa bayangan + titik kecil yang berpendar
  const lights = [];
  for (const l of NIGHT_LIGHTS) {
    const light = new THREE.PointLight(l.color, l.intensity, l.distance, l.decay);
    light.position.set(...l.position);
    light.castShadow = false;
    scene.add(light);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(l.glow, 10, 8), new THREE.MeshBasicMaterial({ color: l.color }));
    bulb.position.set(...l.position);
    scene.add(bulb);
    lights.push(light);
  }
  return { group, lights, wallBoxes, materials: overlays.materials, scene };
}

// Bangun ulang lapisan sesuai DARK_ZONES saat ini (zona tambahan dari level)
export function rebuildDarkOverlays(fx) {
  removeAndDispose(fx.group);
  const overlays = buildDarkOverlays(fx.wallBoxes);
  fx.group = overlays.group;
  fx.materials = overlays.materials;
  fx.scene.add(fx.group);
}

// Kilat: lapisan gelap memudar (f = 0 normal, 1 = hilang)
export function setDarkOverlayFade(fx, f) {
  const V = DARK_ZONE_VISUAL;
  const [floor, wall, ceil] = fx.materials;
  floor.opacity = V.FLOOR_OPACITY * (1 - f);
  wall.opacity = V.WALL_OPACITY * (1 - f);
  ceil.opacity = V.CEILING_OPACITY * (1 - f);
}

// Peredup warna entitas (kucing, pemilik) saat berada di area gelap.
// Material entitas ini unik per entitas, jadi warnanya boleh diubah.
export function createDarkTint(root) {
  const entries = [];
  const seen = new Set();
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (!m.color || seen.has(m)) continue;
      seen.add(m);
      entries.push({ m, base: m.color.clone() });
    }
  });
  return { entries, f: 0, tint: new THREE.Color(DARK_ZONE_VISUAL.ENTITY_TINT) };
}

export function updateDarkTint(t, inDark, dt) {
  const target = inDark ? 1 : 0;
  if (t.f === target) return;
  const step = DARK_ZONE_VISUAL.TINT_LERP * dt;
  t.f = Math.abs(target - t.f) <= step ? target : t.f + Math.sign(target - t.f) * step;
  for (const e of t.entries) {
    e.m.color.copy(e.base);
    e.m.color.r *= 1 + (t.tint.r - 1) * t.f;
    e.m.color.g *= 1 + (t.tint.g - 1) * t.f;
    e.m.color.b *= 1 + (t.tint.b - 1) * t.f;
  }
}

export function isInDarkZone(x, z) {
  for (const d of DARK_ZONES) {
    if (Math.abs(x - d.x) <= d.width / 2 && Math.abs(z - d.z) <= d.depth / 2) return true;
  }
  return false;
}
