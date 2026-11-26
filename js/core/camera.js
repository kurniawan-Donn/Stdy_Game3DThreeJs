// Kamera third-person yang mengikuti kucing tanpa menembus dinding & plafon,
// plus getaran kamera kecil (mis. saat gelas pecah).
import * as THREE from 'three';
import { CAMERA, CAMERA_SHAKE, ROOM, ROOM_HALF_W, ROOM_HALF_D } from '../config.js';

// Vektor kerja privat (dipakai ulang tiap frame agar tidak alokasi)
const camTargetPos = new THREE.Vector3();
const camLookTarget = new THREE.Vector3();

export function createCameraShake() {
  return { time: 0, duration: 0, amplitude: 0, clock: 0, offset: new THREE.Vector3() };
}

export function triggerShake(shake, amplitude, duration) {
  shake.amplitude = Math.max(amplitude, shake.time > 0 ? shake.amplitude : 0);
  shake.duration = duration;
  shake.time = duration;
}

export function resetCamera(camera, playerPos, shake) {
  if (shake) {
    shake.time = 0;
    shake.offset.set(0, 0, 0);
  }
  const p = CAMERA.START_POSITION;
  camera.position.set(p.x, p.y, p.z);
  camera.lookAt(playerPos.x, CAMERA.START_LOOK_HEIGHT, playerPos.z);
}

export function updateCamera(camera, playerPos, dt, shake) {
  // Lepas offset getaran frame sebelumnya agar tidak terakumulasi di lerp
  if (shake) camera.position.sub(shake.offset);

  const desiredX = playerPos.x;
  const desiredY = Math.max(playerPos.y, 0) + CAMERA.OFFSET_Y;
  const desiredZ = playerPos.z + CAMERA.OFFSET_Z;

  const wallMargin = CAMERA.WALL_MARGIN;
  camTargetPos.set(
    THREE.MathUtils.clamp(desiredX, -ROOM_HALF_W + wallMargin, ROOM_HALF_W - wallMargin),
    THREE.MathUtils.clamp(desiredY, CAMERA.MIN_Y, ROOM.HEIGHT - CAMERA.CEILING_MARGIN),
    THREE.MathUtils.clamp(desiredZ, -ROOM_HALF_D + wallMargin, ROOM_HALF_D - wallMargin)
  );

  const smoothFactor = 1 - Math.exp(-CAMERA.SMOOTHING * dt);
  camera.position.lerp(camTargetPos, smoothFactor);

  camLookTarget.set(
    playerPos.x,
    Math.max(playerPos.y, 0) + CAMERA.LOOK_HEIGHT,
    playerPos.z
  );
  camera.lookAt(camLookTarget);

  // Getaran: offset posisi yang meluruh
  if (shake) {
    if (shake.time > 0) {
      shake.time = Math.max(0, shake.time - dt);
      shake.clock += dt;
      const a = shake.amplitude * (shake.time / shake.duration);
      const w = shake.clock * CAMERA_SHAKE.FREQUENCY;
      shake.offset.set(Math.sin(w) * a, Math.cos(w * 1.3) * a, 0);
    } else {
      shake.offset.set(0, 0, 0);
    }
    camera.position.add(shake.offset);
  }
}
