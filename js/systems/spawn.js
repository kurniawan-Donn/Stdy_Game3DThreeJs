// Mencari posisi lantai acak yang aman untuk spawn item/rintangan.
import { ROOM_HALF_W, ROOM_HALF_D, SPAWN } from '../config.js';
import { isPositionFree } from './collision.js';

export function findFreeFloorPosition(colliders, playerPos, radius, minPlayerDist) {
  const rangeX = ROOM_HALF_W - radius - SPAWN.RANGE_MARGIN;
  const rangeZ = ROOM_HALF_D - radius - SPAWN.RANGE_MARGIN;
  for (let attempts = 0; attempts < SPAWN.MAX_ATTEMPTS; attempts++) {
    const x = (Math.random() * 2 - 1) * rangeX;
    const z = (Math.random() * 2 - 1) * rangeZ;
    if (
      isPositionFree(colliders, x, z, radius) &&
      Math.hypot(x - playerPos.x, z - playerPos.z) >= minPlayerDist
    ) {
      return { x, z };
    }
  }
  return { x: SPAWN.FALLBACK_POSITION.x, z: SPAWN.FALLBACK_POSITION.z };
}
