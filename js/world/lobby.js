// Lobi 3D: sudut rumah yang nyaman (lantai kayu, dua dinding, jendela sore,
// karpet bundar, lampu berdiri, tanaman). Kucing pemain duduk di bantal,
// berputar pelan, dan bergantian loaf / duduk / menjilat kaki.
// Scene terpisah dari rumah; dirender saat flow di lobi.
import * as THREE from 'three';
import { LOBBY, IDLE, MATERIALS } from '../config.js';
import { createWoodFloorTexture } from './textures.js';
import { buildCatModel, disposeCatModel } from '../entities/catModel.js';
import { applyBehaviorPose } from '../entities/catBehavior.js';

export function createLobby(look) {
  const L = LOBBY;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(L.BACKGROUND);

  const mat = (opts) => new THREE.MeshStandardMaterial(opts);
  const add = (geo, m, x, y, z, { cast = false, receive = true } = {}) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  };

  // Lantai kayu
  const wood = createWoodFloorTexture();
  wood.repeat.set(L.FLOOR_SIZE / 1.76, L.FLOOR_SIZE / 1.76);
  const floor = add(new THREE.PlaneGeometry(L.FLOOR_SIZE, L.FLOOR_SIZE), mat({ map: wood, ...MATERIALS.floor }), 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;

  // Dinding belakang (dengan lubang jendela) & samping
  const wallMat = mat({ ...MATERIALS.wall });
  const W = L.WINDOW;
  const H = L.WALL_HEIGHT;
  const backZ = L.BACK_WALL_Z;
  const half = L.FLOOR_SIZE / 2;
  const wx0 = W.x - W.width / 2;
  const wx1 = W.x + W.width / 2;
  const wy0 = W.y - W.height / 2;
  const wy1 = W.y + W.height / 2;
  const wallPiece = (x0, x1, y0, y1) => add(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.1), wallMat, (x0 + x1) / 2, (y0 + y1) / 2, backZ - 0.05, { cast: true });
  wallPiece(-half, wx0, 0, H);
  wallPiece(wx1, half, 0, H);
  wallPiece(wx0, wx1, 0, wy0);
  wallPiece(wx0, wx1, wy1, H);
  const side = add(new THREE.BoxGeometry(0.1, H, L.FLOOR_SIZE), wallMat, L.SIDE_WALL_X - 0.05, H / 2, 0);
  side.castShadow = true;
  // Lis bawah
  const trim = mat({ ...MATERIALS.trim });
  add(new THREE.BoxGeometry(L.FLOOR_SIZE, 0.09, 0.02), trim, 0, 0.045, backZ + 0.01);
  add(new THREE.BoxGeometry(0.02, 0.09, L.FLOOR_SIZE), trim, L.SIDE_WALL_X + 0.01, 0.045, 0);
  // Jendela: langit sore + kusen
  add(new THREE.PlaneGeometry(W.width, W.height), new THREE.MeshBasicMaterial({ color: W.SKY }), W.x, W.y, backZ - 0.12, { receive: false });
  for (const [w, h, x, y] of [[W.width + 0.1, 0.05, W.x, wy0], [W.width + 0.1, 0.05, W.x, wy1], [0.05, W.height, wx0, W.y], [0.05, W.height, wx1, W.y], [0.035, W.height, W.x, W.y], [W.width, 0.035, W.x, W.y]]) {
    add(new THREE.BoxGeometry(w, h, 0.07), trim, x, y, backZ - 0.02);
  }

  // Karpet bundar dua warna
  const rug = add(new THREE.CylinderGeometry(L.RUG.RADIUS, L.RUG.RADIUS, 0.01, 40), mat({ color: L.RUG.COLOR, roughness: 0.95 }), L.RUG.x, 0.005, L.RUG.z);
  rug.receiveShadow = true;
  add(new THREE.CylinderGeometry(L.RUG.RADIUS * 0.8, L.RUG.RADIUS * 0.8, 0.012, 40), mat({ color: L.RUG.RING_COLOR, roughness: 0.95 }), L.RUG.x, 0.006, L.RUG.z);
  add(new THREE.CylinderGeometry(L.RUG.RADIUS * 0.74, L.RUG.RADIUS * 0.74, 0.014, 40), mat({ color: L.RUG.COLOR, roughness: 0.95 }), L.RUG.x, 0.007, L.RUG.z);

  // Bantal (tempat kucing)
  const C = L.CUSHION;
  add(new THREE.CylinderGeometry(C.RADIUS, C.RADIUS * 0.94, C.HEIGHT, 28), mat({ color: C.COLOR, roughness: 0.9 }), C.x, C.HEIGHT / 2 + 0.014, C.z, { cast: true });
  add(new THREE.CylinderGeometry(C.RADIUS * 0.86, C.RADIUS, 0.03, 28), mat({ color: C.TOP_COLOR, roughness: 0.9 }), C.x, C.HEIGHT + 0.02, C.z, { cast: true });
  const seatY = C.HEIGHT + 0.03;

  // Lampu berdiri
  const lampMat = mat({ ...MATERIALS.metalDark });
  const LP = L.LAMP.position;
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), lampMat, LP[0], 0.01, LP[2], { cast: true });
  add(new THREE.CylinderGeometry(0.015, 0.015, LP[1], 8), lampMat, LP[0], LP[1] / 2, LP[2], { cast: true });
  add(new THREE.CylinderGeometry(0.14, 0.2, 0.24, 18, 1, true), new THREE.MeshStandardMaterial({ color: L.COLORS.SHADE, emissive: L.COLORS.SHADE_GLOW, emissiveIntensity: 0.6, side: THREE.DoubleSide }), LP[0], LP[1], LP[2]);

  // Tanaman di pot
  add(new THREE.CylinderGeometry(0.13, 0.1, 0.26, 14), mat({ color: L.COLORS.POT, roughness: 0.8 }), -1.45, 0.13, -1.1, { cast: true });
  const leafMat = mat({ color: L.COLORS.LEAF, roughness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = add(new THREE.ConeGeometry(0.05, 0.45, 5), leafMat, -1.45 + Math.cos(a) * 0.06, 0.45, -1.1 + Math.sin(a) * 0.06, { cast: true });
    leaf.rotation.z = Math.cos(a) * 0.35;
    leaf.rotation.x = Math.sin(a) * 0.35;
  }
  // Tumpukan buku & bola benang
  L.COLORS.BOOKS.forEach((c, i) => {
    const b = add(new THREE.BoxGeometry(0.28, 0.05, 0.2), mat({ color: c, roughness: 0.7 }), -1.2, 0.025 + i * 0.05, 0.6, { cast: true });
    b.rotation.y = i * 0.25;
  });
  add(new THREE.SphereGeometry(0.06, 14, 10), mat({ ...MATERIALS.yarn }), 1.15, 0.06, 0.55, { cast: true });

  // Cahaya: langit + matahari sore lewat jendela (satu-satunya bayangan) + lampu
  const hemi = new THREE.HemisphereLight(L.HEMI.sky, L.HEMI.ground, L.HEMI.intensity);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(L.SUN.color, L.SUN.intensity);
  sun.position.set(...L.SUN.position);
  sun.target.position.set(...L.SUN.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(L.SUN.shadowMapSize, L.SUN.shadowMapSize);
  Object.assign(sun.shadow.camera, { near: 0.5, far: 8, left: -2.5, right: 2.5, top: 2.5, bottom: -2.5 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const lamp = new THREE.PointLight(L.LAMP.color, L.LAMP.intensity, L.LAMP.distance, L.LAMP.decay);
  lamp.position.set(...LP);
  scene.add(lamp);

  const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9;
  const camera = new THREE.PerspectiveCamera(L.CAMERA.FOV, aspect, 0.05, 30);

  // Kucing di bantal (berputar di tempat)
  const turntable = new THREE.Group();
  turntable.position.set(C.x, seatY, C.z);
  scene.add(turntable);

  const lobby = {
    scene,
    camera,
    sun,
    turntable,
    cat: null, // { parts, loaf, riding, sleeping, zoomiesT, idleAnim, chonky }
    look: null,
    cycleIndex: 0,
    cycleT: 0,
    clock: 0
  };
  setLobbyLook(lobby, look);
  fitLobbyCamera(lobby);
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => fitLobbyCamera(lobby));
  return lobby;
}

// Kamera: geser target ke kiri di layar lebar agar kucing ada di kanan menu
export function fitLobbyCamera(lobby) {
  const c = LOBBY.CAMERA;
  const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9;
  lobby.camera.aspect = aspect;
  lobby.camera.updateProjectionMatrix();
  const shift = Math.max(0, aspect - 1) * c.WIDE_SHIFT;
  lobby.camera.position.set(c.position[0] - shift, c.position[1], c.position[2]);
  lobby.camera.lookAt(c.target[0] - shift, c.target[1], c.target[2]);
}

// Ganti tampilan kucing lobi (preview kustomisasi)
export function setLobbyLook(lobby, look) {
  if (lobby.cat && lobby.look && lobby.look.cat === look.cat && lobby.look.accessory === look.accessory) return;
  if (lobby.cat) disposeCatModel(lobby.cat.parts.bodyPivot);
  const model = buildCatModel(look);
  model.bodyPivot.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  lobby.turntable.add(model.bodyPivot);
  lobby.cat = { parts: model.parts, loaf: false, riding: null, sleeping: false, zoomiesT: 0, idleAnim: null, chonky: !!model.variant.chonky };
  lobby.look = { ...model.look };
}

export function updateLobby(lobby, dt) {
  const L = LOBBY;
  lobby.clock += dt;
  lobby.turntable.rotation.y += L.SPIN_SPEED * dt;

  // Siklus pose idle
  lobby.cycleT += dt;
  const step = L.CYCLE[lobby.cycleIndex];
  if (lobby.cycleT >= step.duration) {
    lobby.cycleT = 0;
    lobby.cycleIndex = (lobby.cycleIndex + 1) % L.CYCLE.length;
  }
  const pose = L.CYCLE[lobby.cycleIndex].pose;
  const cat = lobby.cat;
  const p = cat.parts;
  cat.loaf = pose === 'loaf';
  cat.riding = pose === 'sit' ? true : null; // pose duduk tegak (sama seperti menumpang robot)
  if (pose === 'lick') {
    const t = lobby.cycleT % IDLE.ANIM_DURATION;
    cat.idleAnim = { type: 'lick', t };
  } else {
    cat.idleAnim = null;
  }
  // Pose dasar netral + napas, lalu pose tingkah
  p.bodyPivot.scale.set(1, 1, 1);
  p.bodyPivot.rotation.set(0, 0, 0);
  p.bodyPivot.position.set(0, Math.sin(lobby.clock * L.BREATH_FREQ) * L.BREATH_AMP, 0);
  p.headGroup.rotation.set(0, 0, 0);
  if (!cat.loaf && !cat.riding) {
    const k = Math.min(1, IDLE.POSE_LERP * dt);
    for (const leg of [p.legFL, p.legFR, p.legBL, p.legBR]) leg.rotation.x += (0 - leg.rotation.x) * k;
  }
  p.tailPivot.rotation.z = Math.sin(lobby.clock * 1.3) * 0.25;
  applyBehaviorPose(cat, dt);
}
