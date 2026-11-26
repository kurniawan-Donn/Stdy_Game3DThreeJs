// Elemen rumah yang dinamis/khusus: pintu kamar mandi (tertutup saat pemilik
// di dalam), keranjang kucing (tempat muncul kembali), dan area gelap.
import * as THREE from 'three';
import { DOOR, BASKET, DARK_ZONES, DARK_ZONE_VISUAL, MATERIALS } from '../config.js';

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
export function createDarkZones(scene) {
  const mat = new THREE.MeshBasicMaterial({
    color: DARK_ZONE_VISUAL.COLOR,
    transparent: true,
    opacity: DARK_ZONE_VISUAL.OPACITY,
    depthWrite: false
  });
  for (const z of DARK_ZONES) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(z.width, z.depth), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(z.x, 0.012, z.z);
    scene.add(plane);
  }
}

export function isInDarkZone(x, z) {
  for (const d of DARK_ZONES) {
    if (Math.abs(x - d.x) <= d.width / 2 && Math.abs(z - d.z) <= d.depth / 2) return true;
  }
  return false;
}
