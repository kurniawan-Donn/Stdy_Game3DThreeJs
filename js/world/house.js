// Elemen rumah untuk Fase 3: pintu ke toilet (dinding timur), keranjang
// kucing (tempat muncul kembali), dan area gelap.
import * as THREE from 'three';
import { DOOR, BASKET, DARK_ZONES, DARK_ZONE_VISUAL, MATERIALS, ROOM_HALF_W } from '../config.js';

// --- Pintu ---
export function createDoor(scene) {
  const wallX = ROOM_HALF_W;
  const hingeZ = DOOR.Z - DOOR.WIDTH / 2;

  // Lorong gelap yang terlihat saat pintu terbuka
  const corridor = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR.WIDTH, DOOR.HEIGHT),
    new THREE.MeshBasicMaterial({ ...MATERIALS.corridor })
  );
  corridor.rotation.y = -Math.PI / 2;
  corridor.position.set(wallX - 0.005, DOOR.HEIGHT / 2, DOOR.Z);
  scene.add(corridor);

  // Kusen
  const frameMat = new THREE.MeshStandardMaterial({ ...MATERIALS.doorFrame });
  const sideGeo = new THREE.BoxGeometry(0.08, DOOR.HEIGHT + 0.08, 0.1);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(sideGeo, frameMat);
    post.position.set(wallX - 0.04, (DOOR.HEIGHT + 0.08) / 2, DOOR.Z + side * (DOOR.WIDTH / 2 + 0.05));
    scene.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, DOOR.WIDTH + 0.2), frameMat);
  lintel.position.set(wallX - 0.04, DOOR.HEIGHT + 0.05, DOOR.Z);
  scene.add(lintel);

  // Daun pintu berengsel, membuka ke dalam ruangan
  const pivot = new THREE.Group();
  pivot.position.set(wallX - 0.06, 0, hingeZ);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, DOOR.HEIGHT, DOOR.WIDTH),
    new THREE.MeshStandardMaterial({ ...MATERIALS.door })
  );
  panel.position.set(0, DOOR.HEIGHT / 2, DOOR.WIDTH / 2);
  panel.castShadow = true;
  pivot.add(panel);
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 6),
    new THREE.MeshStandardMaterial({ ...MATERIALS.doorHandle })
  );
  handle.position.set(-0.05, 1.0, DOOR.WIDTH - 0.12);
  pivot.add(handle);
  scene.add(pivot);

  return { pivot, angle: 0, target: 0 };
}

export function setDoorOpen(door, open) {
  door.target = open ? DOOR.OPEN_ANGLE : 0;
}

export function resetDoor(door) {
  door.angle = 0;
  door.target = 0;
  door.pivot.rotation.y = 0;
}

export function updateDoor(door, dt) {
  const step = DOOR.OPEN_SPEED * dt;
  if (Math.abs(door.target - door.angle) <= step) door.angle = door.target;
  else door.angle += Math.sign(door.target - door.angle) * step;
  door.pivot.rotation.y = -door.angle; // negatif = mengayun ke dalam ruangan
}

export function isDoorOpen(door) {
  return door.angle >= DOOR.OPEN_ANGLE * 0.9;
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
