// Persepsi pemilik rumah (GDD §8):
// - Pandangan: kerucut OWNER.VISION_ANGLE_DEG, jangkauan OWNER.VISION_RANGE
//   dari mata, dikali pengubah (mengendap, area gelap). Kucing hanya terlihat
//   jika ada line-of-sight ke titik-titik tubuhnya (ray vs kotak perabot).
// - Jarak sangat dekat: selalu terlihat kecuali line-of-sight terhalang total.
import * as THREE from 'three';
import { OWNER, PERCEPTION, HIDE_BOX, CUSTOMIZATION } from '../config.js';
import { isInDarkZone, isInLightZone } from '../world/house.js';
import { hideSpotOf, isBoxMoving } from './hiding.js';

const HALF_ANGLE = THREE.MathUtils.degToRad(OWNER.VISION_ANGLE_DEG / 2);

// Ray (segmen) dari a ke b memotong kotak perabot?
// Rentang tinggi kotak: lantai..topHeight; perabot berkolong hanya bagian atas
// (crawlHeight..topHeight), jadi kolong meja yang terbuka bisa dilihat tembus.
// Mengabaikan potongan di dekat ujung b (titik tubuh kucing itu sendiri).
export function segmentHitsBox(ax, ay, az, bx, by, bz, box) {
  let tmin = 0;
  let tmax = 1 - PERCEPTION.LOS_EPSILON / Math.max(1e-6, Math.hypot(bx - ax, by - ay, bz - az));
  const axes = [
    [ax, bx - ax, box.minX, box.maxX],
    [ay, by - ay, box.crawlHeight || 0, box.topHeight],
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
  // Mengendap memperpendek jarak pandang (kecuali di dalam kardus: yang dilihat kardusnya)
  if (cat.moveMode === 'sneak' && !cat.inBox) range *= PERCEPTION.SNEAK_RANGE_MULT;
  // Area gelap; kucing hitam lebih sulit terlihat di sana (GDD §14)
  // (kilat petir di Level 3: area gelap tidak berlaku)
  const flashing = ctx.weather && ctx.weather.flashT > 0;
  if (!flashing && isInDarkZone(p.x, p.z)) range *= cat.darkStealth ? CUSTOMIZATION.BLACK_CAT_DARK_RANGE_MULT : PERCEPTION.DARK_RANGE_MULT;

  // Sudut terhadap arah pandang
  let angle = Math.atan2(dx, dz) - lookYaw;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  const close = distance <= PERCEPTION.CLOSE_RANGE;
  let inCone = close || (distance <= range && Math.abs(angle) <= HALF_ANGLE);

  // Malam (Level 4), pemilik terjaga membawa senter: terlihat di sorotan
  // (35°, 12 m; area gelap tidak berlaku), di sekitar (2 m), atau di berkas
  // cahaya bulan (pandangan biasa). Mengendap & kucing hitam memperpendek.
  const torch = ctx.night && ctx.owner && ctx.owner.flashlightOn && !ctx.owner.asleep ? ctx.night.N.FLASHLIGHT : null;
  if (torch) {
    const black = cat.darkStealth ? CUSTOMIZATION.BLACK_CAT_DARK_RANGE_MULT : 1;
    const sneak = cat.moveMode === 'sneak' && !cat.inBox ? PERCEPTION.SNEAK_RANGE_MULT : 1;
    const beamRange = torch.RANGE * sneak * black;
    const nearRange = torch.NEAR_RANGE * black;
    const moonRange = OWNER.VISION_RANGE * sneak;
    const a = Math.abs(angle);
    const inBeam = distance <= beamRange && a <= THREE.MathUtils.degToRad(torch.ANGLE_DEG / 2);
    const inMoon = isInLightZone(p.x, p.z) && distance <= moonRange && a <= HALF_ANGLE;
    const inNear = distance <= nearRange && a <= HALF_ANGLE;
    inCone = close || inBeam || inMoon || inNear;
    range = inBeam ? beamRange : inMoon ? moonRange : nearRange;
  }

  const result = { visibility: 0, distance, range, inCone, rays: [], box: !!cat.inBox, boxMoving: false, hiddenSpot: false };
  if (!inCone) return result;

  // Di dalam kardus: yang terlihat hanya kardusnya
  if (cat.inBox) {
    result.boxMoving = isBoxMoving(cat);
    let clearBox = 0;
    const pts = boxSamplePoints(cat.inBox);
    for (const to of pts) {
      const ok = hasLineOfSight(ctx.colliders, eye, to, cat.inBox.collider);
      result.rays.push({ to, clear: ok });
      if (ok) clearBox++;
    }
    const v = clearBox / pts.length;
    // Kardus diam = tidak dicurigai, kecuali pemilik melihat kucing masuk
    result.visibility = result.boxMoving || cat.inBox.compromised ? v : 0;
    return result;
  }

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

  // Kolong tempat sembunyi: kucing yang merendah tak terlihat, kecuali pemilik
  // sedang membungkuk memeriksa kolong itu
  const spot = hideSpotOf(cat);
  if (spot && !(ctx.owner && ctx.owner.checkingSpot === spot)) {
    result.visibility = 0;
    result.hiddenSpot = true;
  }
  return result;
}

function boxSamplePoints(box) {
  const p = box.mesh.position;
  const h = HIDE_BOX.HEIGHT;
  return [
    { x: p.x, y: h * 0.5, z: p.z },
    { x: p.x, y: h * 0.95, z: p.z }
  ];
}
