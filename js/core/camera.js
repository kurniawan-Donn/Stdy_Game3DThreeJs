// Kamera third-person yang mengikuti kucing tanpa menembus dinding & plafon.
import * as THREE from 'three';
import { CAMERA, ROOM, ROOM_HALF_W, ROOM_HALF_D } from '../config.js';

// Vektor kerja privat (dipakai ulang tiap frame agar tidak alokasi)
const camTargetPos = new THREE.Vector3();
const camLookTarget = new THREE.Vector3();

export function resetCamera(camera, playerPos) {
  const p = CAMERA.START_POSITION;
  camera.position.set(p.x, p.y, p.z);
  camera.lookAt(playerPos.x, CAMERA.START_LOOK_HEIGHT, playerPos.z);
}

export function updateCamera(camera, playerPos, dt) {
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
}
