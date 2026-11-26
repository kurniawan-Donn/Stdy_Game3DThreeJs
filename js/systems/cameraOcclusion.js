// Perabot yang menghalangi pandangan kamera ke kucing dibuat semi-transparan
// sementara (dinding tidak pernah ditembus: itu tugas spring arm di camera.js).
// Perabot terdaftar lewat furnitureRefs.fadeables (lihat world/furniture.js).
import { CAMERA_OCCLUSION as O, SURFACE_TOLERANCE } from '../config.js';
import { segmentHitsBox, catSamplePoints } from './perception.js';

function cameraInside(box, p) {
  const m = O.CAMERA_PADDING;
  return p.x > box.minX - m && p.x < box.maxX + m && p.z > box.minZ - m && p.z < box.maxZ + m && p.y < box.topHeight + m;
}

function isSupporting(box, catPos) {
  return Math.abs(catPos.y - box.topHeight) <= SURFACE_TOLERANCE &&
    catPos.x >= box.minX && catPos.x <= box.maxX && catPos.z >= box.minZ && catPos.z <= box.maxZ;
}

function applyFade(entry) {
  const f = entry.fade;
  const faded = f < 0.999;
  for (const m of entry.materials) {
    const wantTransparent = faded || m.baseTransparent;
    if (m.material.transparent !== wantTransparent) {
      m.material.transparent = wantTransparent;
      m.material.needsUpdate = true;
    }
    m.material.opacity = m.baseOpacity * f;
    m.material.depthWrite = !faded;
  }
}

// Mengembalikan jumlah perabot yang sedang memudar (untuk debug).
export function updateCameraOcclusion(ctx, dt) {
  const fadeables = ctx.furnitureRefs.fadeables;
  if (!fadeables) return 0;
  const cam = ctx.camera.position;
  const catPos = ctx.cat.mesh.position;
  const targets = catSamplePoints(ctx.cat);
  const k = Math.min(1, O.FADE_SPEED * dt);
  let fading = 0;

  for (const entry of fadeables) {
    let blocking = false;
    for (const box of entry.colliders) {
      if (isSupporting(box, catPos)) continue;
      if (cameraInside(box, cam)) {
        blocking = true;
        break;
      }
      for (const t of targets) {
        if (segmentHitsBox(cam.x, cam.y, cam.z, t.x, t.y, t.z, box)) {
          blocking = true;
          break;
        }
      }
      if (blocking) break;
    }
    const target = blocking ? O.FADE_OPACITY : 1;
    const prev = entry.fade;
    entry.fade += (target - entry.fade) * k;
    if (Math.abs(entry.fade - 1) < 0.002) entry.fade = 1;
    if (entry.fade !== prev) applyFade(entry);
    if (entry.fade < 0.999) fading++;
  }
  return fading;
}

export function resetCameraOcclusion(ctx) {
  for (const entry of ctx.furnitureRefs.fadeables || []) {
    entry.fade = 1;
    applyFade(entry);
  }
}
