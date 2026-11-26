// Kamera orbit third-person mengelilingi kucing:
// - mouse memutar yaw (360°) & pitch (dibatasi), roda mouse = zoom
// - auto-recenter ke belakang kucing jika mouse diam saat kucing berjalan
// - spring arm: lengan kamera memendek jika terhalang dinding/plafon/lantai,
//   lalu memanjang lagi pelan; kamera tidak pernah keluar dari ruangan
// - saat KETAHUAN: berputar ke samping agar pemilik & kucing terlihat bersama
// - getaran kamera kecil (triggerShake)
import * as THREE from 'three';
import { CAMERA, CAMERA_SHAKE, ROOM, ROOM_HALF_W, ROOM_HALF_D } from '../config.js';

const DEG = Math.PI / 180;
const PITCH_MIN = CAMERA.PITCH_MIN_DEG * DEG;
const PITCH_MAX = CAMERA.PITCH_MAX_DEG * DEG;

// Vektor kerja privat (dipakai ulang tiap frame agar tidak alokasi)
const focusTarget = new THREE.Vector3();
const dir = new THREE.Vector3();

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// --- Getaran ---
export function createCameraShake() {
  return { time: 0, duration: 0, amplitude: 0, clock: 0, offset: new THREE.Vector3() };
}

export function triggerShake(shake, amplitude, duration) {
  shake.amplitude = Math.max(amplitude, shake.time > 0 ? shake.amplitude : 0);
  shake.duration = duration;
  shake.time = duration;
}

function updateShake(shake, dt) {
  if (shake.time > 0) {
    shake.time = Math.max(0, shake.time - dt);
    shake.clock += dt;
    const a = shake.amplitude * (shake.time / shake.duration);
    const w = shake.clock * CAMERA_SHAKE.FREQUENCY;
    shake.offset.set(Math.sin(w) * a, Math.cos(w * 1.3) * a, 0);
  } else {
    shake.offset.set(0, 0, 0);
  }
}

// --- Rig orbit ---
// yaw: arah dari fokus ke kamera = (sin yaw, ·, cos yaw). yaw 0 = kamera di +Z.
export function createCameraRig() {
  return {
    yaw: 0,
    pitch: CAMERA.PITCH_DEFAULT_DEG * DEG,
    distance: CAMERA.DISTANCE, // target zoom
    zoom: CAMERA.DISTANCE, // zoom yang dihaluskan
    arm: CAMERA.DISTANCE, // panjang lengan aktual (spring arm)
    focus: new THREE.Vector3(),
    mouseIdle: 0,
    capture: 0 // 0..1, bobot mode kamera KETAHUAN
  };
}

// Tempatkan kamera langsung di belakang kucing (awal level / setelah respawn)
export function snapCameraBehind(ctx) {
  const rig = ctx.camRig;
  const cat = ctx.cat;
  rig.yaw = wrapAngle(cat.yaw + Math.PI);
  rig.pitch = CAMERA.PITCH_DEFAULT_DEG * DEG;
  rig.zoom = rig.distance;
  rig.arm = rig.distance;
  rig.capture = 0;
  rig.mouseIdle = 0;
  rig.focus.copy(cat.mesh.position).y += CAMERA.FOCUS_HEIGHT;
  ctx.cameraShake.time = 0;
  ctx.cameraShake.offset.set(0, 0, 0);
  placeCamera(ctx, 0, true);
}

export function resetCamera(ctx) {
  ctx.camRig.distance = CAMERA.DISTANCE;
  snapCameraBehind(ctx);
}

// Titik masuk ray (o + t·d) ke kotak blocker (dinding dalam, ambang pintu,
// pintu tertutup) yang diperbesar sebesar margin; Infinity jika tidak kena.
function rayEnter(o, d, b, m) {
  let tmin = 0;
  let tmax = Infinity;
  const axes = [
    [o.x, d.x, b.minX - m, b.maxX + m],
    [o.y, d.y, (b.minY || 0) - m, b.topHeight + m],
    [o.z, d.z, b.minZ - m, b.maxZ + m]
  ];
  for (const [p, v, lo, hi] of axes) {
    if (Math.abs(v) < 1e-9) {
      if (p < lo || p > hi) return Infinity;
      continue;
    }
    let t1 = (lo - p) / v;
    let t2 = (hi - p) / v;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

// Panjang lengan maksimum dari fokus ke arah `d` agar tetap di dalam ruangan
// dan tidak menembus dinding dalam / pintu tertutup (blockers).
export function maxArmLength(focus, d, length, blockers = []) {
  const m = CAMERA.WALL_MARGIN;
  const bounds = [
    [focus.x, d.x, -ROOM_HALF_W + m, ROOM_HALF_W - m],
    [focus.y, d.y, CAMERA.FLOOR_MIN, ROOM.HEIGHT - m],
    [focus.z, d.z, -ROOM_HALF_D + m, ROOM_HALF_D - m]
  ];
  let t = length;
  for (const [o, v, lo, hi] of bounds) {
    if (v > 1e-6) t = Math.min(t, (hi - o) / v);
    else if (v < -1e-6) t = Math.min(t, (lo - o) / v);
  }
  for (const b of blockers) {
    if (!(b.topHeight > 0)) continue; // pintu terbuka
    const enter = rayEnter(focus, d, b, CAMERA.WALL_MARGIN);
    if (enter > 0 && enter < t) t = enter;
  }
  return Math.max(CAMERA.MIN_ARM, t);
}

function handleInput(ctx, dt) {
  const rig = ctx.camRig;
  const input = ctx.input;
  const moved = input.mouseDX !== 0 || input.mouseDY !== 0;
  if (moved) {
    rig.yaw = wrapAngle(rig.yaw - input.mouseDX * CAMERA.MOUSE_SENSITIVITY);
    const sign = CAMERA.INVERT_Y ? -1 : 1;
    rig.pitch += input.mouseDY * CAMERA.MOUSE_SENSITIVITY * sign;
    rig.mouseIdle = 0;
  } else {
    rig.mouseIdle += dt;
  }
  rig.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, rig.pitch));
  if (input.wheel) {
    rig.distance = Math.max(CAMERA.MIN_DISTANCE, Math.min(CAMERA.MAX_DISTANCE, rig.distance + input.wheel * CAMERA.ZOOM_STEP));
  }

  // Auto-recenter ke belakang kucing
  const cat = ctx.cat;
  const catSpeed = Math.hypot(cat.vel.x, cat.vel.z);
  if (CAMERA.AUTO_RECENTER && rig.mouseIdle >= CAMERA.RECENTER_DELAY && catSpeed >= CAMERA.RECENTER_MIN_CAT_SPEED) {
    const behind = wrapAngle(cat.yaw + Math.PI);
    const diff = wrapAngle(behind - rig.yaw);
    // Tidak memutar balik kamera saat kucing berjalan ke arah kamera (S),
    // agar arah kontrol relatif kamera tidak ikut berbalik terus-menerus.
    if (Math.abs(diff) > CAMERA.RECENTER_MAX_ANGLE_DEG * DEG) return;
    const step = CAMERA.RECENTER_SPEED * dt;
    rig.yaw = wrapAngle(rig.yaw + Math.max(-step, Math.min(step, diff)));
  }
}

// Mode KETAHUAN: fokus di antara pemilik & kucing, kamera di sampingnya
function captureTargets(ctx) {
  const cat = ctx.cat.mesh.position;
  const own = ctx.owner.mesh.position;
  const vx = cat.x - own.x;
  const vz = cat.z - own.z;
  const span = Math.hypot(vx, vz);
  const base = Math.atan2(vx, vz);
  const rig = ctx.camRig;
  const a = wrapAngle(base + Math.PI / 2);
  const b = wrapAngle(base - Math.PI / 2);
  const yaw = Math.abs(wrapAngle(a - rig.yaw)) <= Math.abs(wrapAngle(b - rig.yaw)) ? a : b;
  return {
    yaw,
    pitch: CAMERA.CAPTURE_PITCH_DEG * DEG,
    distance: Math.max(CAMERA.CAPTURE_MIN_DISTANCE, span * CAMERA.CAPTURE_SPAN_FACTOR),
    fx: (cat.x + own.x) / 2,
    fy: CAMERA.CAPTURE_FOCUS_HEIGHT,
    fz: (cat.z + own.z) / 2
  };
}

// dt = waktu nyata
export function updateCamera(ctx, dt) {
  const rig = ctx.camRig;
  // Mode dramatis hanya saat slow motion & fade keluar; setelah respawn normal lagi
  const capturing = ctx.capture && ctx.capture.active && (ctx.capture.phase === 'slowmo' || ctx.capture.phase === 'fadeOut');

  if (!capturing) handleInput(ctx, dt);

  // Titik fokus
  const cat = ctx.cat.mesh.position;
  focusTarget.set(cat.x, Math.max(cat.y, 0) + CAMERA.FOCUS_HEIGHT, cat.z);
  let zoomTarget = rig.distance;

  if (capturing) {
    const T = captureTargets(ctx);
    const k = Math.min(1, CAMERA.CAPTURE_BLEND_RATE * dt);
    rig.yaw = wrapAngle(rig.yaw + wrapAngle(T.yaw - rig.yaw) * k);
    rig.pitch += (T.pitch - rig.pitch) * k;
    rig.capture = Math.min(1, rig.capture + k);
    focusTarget.set(
      focusTarget.x + (T.fx - focusTarget.x) * rig.capture,
      focusTarget.y + (T.fy - focusTarget.y) * rig.capture,
      focusTarget.z + (T.fz - focusTarget.z) * rig.capture
    );
    zoomTarget = T.distance;
  } else {
    rig.capture = 0;
  }

  rig.focus.lerp(focusTarget, 1 - Math.exp(-CAMERA.FOCUS_SMOOTHING * dt));
  rig.zoom += (zoomTarget - rig.zoom) * (1 - Math.exp(-CAMERA.ZOOM_SMOOTHING * dt));
  placeCamera(ctx, dt, false);
}

// Pengaman keras: kamera yang (karena lengan masih menyusul) berada di dalam
// dinding dalam didorong ke sisi dinding yang sama dengan kucing.
function pushOutOfBlockers(p, focus, blockers) {
  const m = CAMERA.WALL_MARGIN;
  for (const b of blockers) {
    if (!(b.topHeight > 0)) continue;
    if (p.y < (b.minY || 0) - m || p.y > b.topHeight + m) continue;
    if (p.x <= b.minX - m || p.x >= b.maxX + m || p.z <= b.minZ - m || p.z >= b.maxZ + m) continue;
    const thinX = b.maxX - b.minX < b.maxZ - b.minZ;
    if (thinX) p.x = focus.x < (b.minX + b.maxX) / 2 ? b.minX - m : b.maxX + m;
    else p.z = focus.z < (b.minZ + b.maxZ) / 2 ? b.minZ - m : b.maxZ + m;
  }
}

// Posisi kamera dari fokus + yaw/pitch + spring arm
function placeCamera(ctx, dt, snap) {
  const rig = ctx.camRig;
  const camera = ctx.camera;
  const cp = Math.cos(rig.pitch);
  dir.set(Math.sin(rig.yaw) * cp, Math.sin(rig.pitch), Math.cos(rig.yaw) * cp);

  const blockers = ctx.cameraBlockers || [];
  const allowed = maxArmLength(rig.focus, dir, rig.zoom, blockers);
  if (snap) {
    rig.arm = allowed;
  } else if (allowed < rig.arm) {
    rig.arm += (allowed - rig.arm) * (1 - Math.exp(-CAMERA.ARM_IN_RATE * dt));
  } else {
    rig.arm = Math.min(allowed, rig.arm + CAMERA.ARM_OUT_SPEED * dt);
  }

  camera.position.copy(rig.focus).addScaledVector(dir, rig.arm);
  // Pengaman keras: tidak pernah keluar ruangan meski lengan masih menyusul
  const m = CAMERA.WALL_MARGIN;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM_HALF_W + m, ROOM_HALF_W - m);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -ROOM_HALF_D + m, ROOM_HALF_D - m);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, CAMERA.FLOOR_MIN, ROOM.HEIGHT - m);
  pushOutOfBlockers(camera.position, rig.focus, blockers);
  camera.lookAt(rig.focus);

  updateShake(ctx.cameraShake, dt);
  camera.position.add(ctx.cameraShake.offset);
  camera.updateMatrixWorld();
}
