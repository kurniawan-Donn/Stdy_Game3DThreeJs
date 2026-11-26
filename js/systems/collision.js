// Tabrakan di bidang XZ: lingkaran (kucing/robot) vs AABB perabot & dinding.
import { ROOM_HALF_W, ROOM_HALF_D, PHYSICS, PLAYER, SPAWN } from '../config.js';

// Apakah titik (x, z) dengan radius tertentu bebas dari dinding & perabot.
export function isPositionFree(colliders, x, z, radius) {
  const margin = radius + SPAWN.WALL_MARGIN_EXTRA;
  if (
    x < -ROOM_HALF_W + margin || x > ROOM_HALF_W - margin ||
    z < -ROOM_HALF_D + margin || z > ROOM_HALF_D - margin
  ) {
    return false;
  }

  const r = radius + SPAWN.FURNITURE_MARGIN_EXTRA;
  for (const box of colliders) {
    const closestX = Math.max(box.minX, Math.min(x, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < r * r) {
      return false;
    }
  }
  return true;
}

// Dorong kucing keluar dari dinding & perabot (mengubah position dan vel).
// bodyHeight: tinggi badan kucing saat ini (untuk lewat kolong perabot)
export function resolveRoomCollisions(position, vel, colliders, bodyHeight = 0, radius = PLAYER.RADIUS) {
  resolveCircleCollisions(position, vel, colliders, radius, position.y, bodyHeight);
}

// Collider berkolong (crawlHeight) tempat titik (x, z) berada di bawahnya, atau null.
export function crawlBoxAt(colliders, x, z, footY) {
  if (footY > PHYSICS.CLIMB_TOLERANCE) return null;
  for (const box of colliders) {
    if (box.crawlHeight > 0 && x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) return box;
  }
  return null;
}

// Versi umum: lingkaran berradius R dengan titik bawah di footY
// (dipakai kucing dan benda fisika).
export function resolveCircleCollisions(position, vel, colliders, R, footY, bodyHeight = 0) {

  // Batas 4 dinding ruangan
  const minX = -ROOM_HALF_W + R;
  const maxX = ROOM_HALF_W - R;
  const minZ = -ROOM_HALF_D + R;
  const maxZ = ROOM_HALF_D - R;

  if (position.x < minX) { position.x = minX; vel.x = 0; }
  if (position.x > maxX) { position.x = maxX; vel.x = 0; }
  if (position.z < minZ) { position.z = minZ; vel.z = 0; }
  if (position.z > maxZ) { position.z = maxZ; vel.z = 0; }

  // AABB perabot: hanya blokir horizontal jika kaki lebih rendah dari topHeight - toleransi
  for (const box of colliders) {
    if (footY >= box.topHeight - PHYSICS.CLIMB_TOLERANCE) continue;
    // Kolong perabot: badan yang cukup pendek & di lantai lewat di bawahnya
    if (box.crawlHeight > 0 && bodyHeight > 0 && footY <= PHYSICS.CLIMB_TOLERANCE && bodyHeight <= box.crawlHeight) continue;

    const closestX = Math.max(box.minX, Math.min(position.x, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));

    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < R * R) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = R - dist;
        const nx = dx / dist;
        const nz = dz / dist;
        position.x += nx * overlap;
        position.z += nz * overlap;

        const vn = vel.x * nx + vel.z * nz;
        if (vn < 0) {
          vel.x -= vn * nx;
          vel.z -= vn * nz;
        }
      } else {
        // Jika pusat berada di dalam AABB, dorong ke sisi terdekat
        const pushL = Math.abs(position.x - box.minX);
        const pushR = Math.abs(box.maxX - position.x);
        const pushT = Math.abs(position.z - box.minZ);
        const pushB = Math.abs(box.maxZ - position.z);
        const minPush = Math.min(pushL, pushR, pushT, pushB);

        if (minPush === pushL) position.x = box.minX - R;
        else if (minPush === pushR) position.x = box.maxX + R;
        else if (minPush === pushT) position.z = box.minZ - R;
        else position.z = box.maxZ + R;
      }
    }
  }
}

// Dorong kucing keluar dari penghalang bundar bergerak (pemilik, robot)
// jika kakinya lebih rendah dari `height`.
export function pushOutOfCircle(position, vel, cx, cz, radius, height) {
  if (position.y >= height) return;
  const minDist = PLAYER.RADIUS + radius;
  const dx = position.x - cx;
  const dz = position.z - cz;
  const distSq = dx * dx + dz * dz;
  if (distSq >= minDist * minDist) return;
  const dist = Math.sqrt(distSq) || 0.0001;
  const nx = dist > 0.0001 ? dx / dist : 1;
  const nz = dist > 0.0001 ? dz / dist : 0;
  position.x = cx + nx * minDist;
  position.z = cz + nz * minDist;
  const vn = vel.x * nx + vel.z * nz;
  if (vn < 0) {
    vel.x -= vn * nx;
    vel.z -= vn * nz;
  }
}

// Ketinggian permukaan (lantai = 0 atau atas perabot) di (x, z).
// margin > 0: titik dianggap di atas perabot meski sedikit melewati tepinya
// (dipakai kucing agar bisa mendarat di permukaan sempit seperti sandaran sofa).
export function getGroundHeight(colliders, x, z, referenceY, margin = 0) {
  let highest = 0;
  for (const box of colliders) {
    if (x >= box.minX - margin && x <= box.maxX + margin && z >= box.minZ - margin && z <= box.maxZ + margin) {
      if (box.topHeight > highest && referenceY >= box.topHeight - PHYSICS.CLIMB_TOLERANCE) {
        highest = box.topHeight;
      }
    }
  }
  return highest;
}
