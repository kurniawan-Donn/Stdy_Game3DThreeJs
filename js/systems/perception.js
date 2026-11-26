// Persepsi pemilik rumah (GDD §8):
// - Pandangan: kerucut OWNER.VISION_ANGLE_DEG, jangkauan OWNER.VISION_RANGE
//   dari mata, dikali pengubah (mengendap, area gelap). Kucing hanya terlihat
//   jika ada line-of-sight ke titik-titik tubuhnya (ray vs kotak perabot).
// - Jarak sangat dekat: selalu terlihat kecuali line-of-sight terhalang total.
import * as THREE from 'three';
import { OWNER, PERCEPTION } from '../config.js';
import { isInDarkZone } from '../world/house.js';

const HALF_ANGLE = THREE.MathUtils.degToRad(OWNER.VISION_ANGLE_DEG / 2);

// Ray (segmen) dari a ke b memotong kotak perabot (0..topHeight)?
// Mengabaikan potongan di dekat ujung b (titik tubuh kucing itu sendiri).
function segmentHitsBox(ax, ay, az, bx, by, bz, box) {
  let tmin = 0;
  let tmax = 1 - PERCEPTION.LOS_EPSILON / Math.max(1e-6, Math.hypot(bx - ax, by - ay, bz - az));
  const axes = [
    [ax, bx - ax, box.minX, box.maxX],
    [ay, by - ay, 0, box.topHeight],
    [az, bz - az, box.minZ, box.maxZ]
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function hasLineOfSight(colliders, from, to, ignore = null) {
  for (const box of colliders) {
    if (box.occludes === false || box === ignore) continue;
    if (segmentHitsBox(from.x, from.y, from.z, to.x, to.y, to.z, box)) return false;
  }
  return true;
}

function supportingBox(colliders, p) {
  if (p.y <= 0.01) return null;
  for (const box of colliders) {
    if (
      Math.abs(p.y - box.topHeight) <= PERCEPTION.SUPPORT_TOLERANCE &&
      p.x >= box.minX && p.x <= box.maxX && p.z >= box.minZ && p.z <= box.maxZ
    ) return box;
  }
  return null;
}

// Titik-titik tubuh kucing di dunia (ikut merendah saat mengendap).
export function catSamplePoints(cat) {
  const p = cat.mesh.position;
  const s = Math.sin(cat.yaw);
  const c = Math.cos(cat.yaw);
  const crouchScale = cat.parts.bodyPivot.scale.y;
  return PERCEPTION.SAMPLE_POINTS.map((sp) => ({
    x: p.x + s * sp.z,
    y: p.y + sp.y * crouchScale,
    z: p.z + c * sp.z
  }));
}

// Mengembalikan hasil pandangan pemilik ke kucing:
// { visibility (0..1), distance, range, inCone, rays: [{to, clear}] }
export function senseCat(ctx, eye, lookYaw) {
  const cat = ctx.cat;
  const p = cat.mesh.position;
  const dx = p.x - eye.x;
  const dz = p.z - eye.z;
  const distance = Math.hypot(dx, dz);

  let range = OWNER.VISION_RANGE;
  if (cat.moveMode === 'sneak') range *= PERCEPTION.SNEAK_RANGE_MULT;
  if (isInDarkZone(p.x, p.z)) range *= PERCEPTION.DARK_RANGE_MULT;

  // Sudut terhadap arah pandang
  let angle = Math.atan2(dx, dz) - lookYaw;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  const close = distance <= PERCEPTION.CLOSE_RANGE;
  const inCone = close || (distance <= range && Math.abs(angle) <= HALF_ANGLE);

  const result = { visibility: 0, distance, range, inCone, rays: [] };
  if (!inCone) return result;

  // Perabot yang sedang dipijak kucing tidak menutupi kucing itu sendiri
  // (mis. kucing di atas kulkas tetap terlihat dari bawah).
  const support = supportingBox(ctx.colliders, p);

  let clear = 0;
  for (const to of catSamplePoints(cat)) {
    const ok = hasLineOfSight(ctx.colliders, eye, to, support);
    result.rays.push({ to, clear: ok });
    if (ok) clear++;
  }
  result.visibility = clear / PERCEPTION.SAMPLE_POINTS.length;
  return result;
}
