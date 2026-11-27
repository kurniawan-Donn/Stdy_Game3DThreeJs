// Jejak kaki basah (Level 3): kucing yang menginjak genangan meninggalkan
// jejak selama WET_TIME detik. Jejak di lantai tanpa Chaos; di sofa, kasur,
// atau meja: Chaos +5 per perabot (sekali). Jejak memudar dalam FADE_TIME
// detik. Pemilik yang melihat jejak segar menyelidiki ke jejak terbaru.
// Semua jejak dalam satu InstancedMesh (satu draw call).
import * as THREE from 'three';
import { FOOTPRINTS as FP, FURNITURE_LAYOUT } from '../config.js';
import { removeAndDispose } from '../core/dispose.js';
import { scoreMischief } from '../systems/chaos.js';
import { ownerSeesPoint } from '../systems/perception.js';
import { ownerNoticeTrail } from './owner/index.js';

const tmpObj = new THREE.Object3D();

export function resetFootprints(ctx) {
  if (ctx.footprints) removeAndDispose(ctx.footprints.mesh);
  ctx.footprints = null;
  const W = ctx.weather && ctx.weather.W;
  if (!W) return;
  // Telapak: elips pipih
  const geo = new THREE.CircleGeometry(FP.SIZE / 2, 10);
  geo.scale(0.8, 1.15, 1);
  geo.rotateX(-Math.PI / 2);
  // Ikut pencahayaan (jejak basah gelap & sedikit mengilap di ruangan redup)
  const mat = new THREE.MeshStandardMaterial({ color: FP.COLOR, transparent: true, opacity: FP.OPACITY, roughness: FP.ROUGHNESS, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, FP.MAX);
  mesh.count = 0;
  mesh.frustumCulled = false;
  ctx.scene.add(mesh);
  ctx.footprints = {
    W: W.FOOTPRINT,
    mesh,
    prints: [], // { x, y, z, yaw, age, noticed }
    wetT: 0,
    dist: 0,
    side: 1,
    last: null,
    scored: new Set(), // perabot yang sudah memberi Chaos
    checkT: 0
  };
}

// Perabot (kunci FURNITURE_LAYOUT) di bawah titik jejak, atau null
function furnitureUnder(keys, x, y, z) {
  for (const key of keys) {
    const L = FURNITURE_LAYOUT[key];
    if (!L) continue;
    for (const c of L.colliders) {
      if (Math.abs(x - c.x) <= c.width / 2 && Math.abs(z - c.z) <= c.depth / 2 && Math.abs(y - c.topHeight) <= FP.ON_FURNITURE_TOL) return key;
    }
  }
  return null;
}

function placePrint(ctx, fp) {
  const cat = ctx.cat;
  const p = cat.mesh.position;
  const side = (fp.side = -fp.side) * FP.SIDE;
  const x = p.x + Math.cos(cat.yaw) * side;
  const z = p.z - Math.sin(cat.yaw) * side;
  const y = p.y + FP.LIFT;
  if (fp.prints.length >= FP.MAX) fp.prints.shift();
  fp.prints.push({ x, y, z, yaw: cat.yaw, age: 0, noticed: false });
  // Jejak di sofa/kasur/meja: Chaos +5 (sekali per perabot)
  if (p.y > FP.ON_FURNITURE_TOL) {
    const key = furnitureUnder(fp.W.FURNITURE, p.x, p.y, p.z);
    if (key && !fp.scored.has(key)) {
      fp.scored.add(key);
      scoreMischief(ctx, 'wetPaws', { x: p.x, y: p.y, z: p.z });
    }
  }
}

// Apakah pemilik melihat titik ini? (kerucut, jangkauan, area gelap, LOS)
export function updateFootprints(ctx, dt) {
  const fp = ctx.footprints;
  if (!fp) return;
  const cat = ctx.cat;
  const p = cat.mesh.position;
  const w = ctx.weather;

  // Menginjak genangan → basah
  const onFloor = cat.isGrounded && !cat.inBox && !cat.riding && p.y < FP.ON_FURNITURE_TOL;
  if (onFloor && Math.hypot(p.x - w.W.PUDDLE.x, p.z - w.W.PUDDLE.z) <= w.puddleRadius) fp.wetT = fp.W.WET_TIME;

  // Meninggalkan jejak tiap STEP meter selama basah
  if (fp.wetT > 0) {
    fp.wetT = Math.max(0, fp.wetT - dt);
    const moved = fp.last ? Math.hypot(p.x - fp.last.x, p.z - fp.last.z) : 0;
    // (lompatan posisi besar = dipindahkan, mis. muncul di keranjang: bukan langkah)
    if (fp.last && cat.isGrounded && !cat.inBox && !cat.riding && moved < FP.TELEPORT_DIST) {
      fp.dist += moved;
      if (fp.dist >= FP.STEP) {
        fp.dist = 0;
        placePrint(ctx, fp);
      }
    }
  }
  fp.last = { x: p.x, z: p.z };

  // Umur & memudar (mengecil di akhir umur)
  while (fp.prints.length && fp.prints[0].age >= fp.W.FADE_TIME) fp.prints.shift();
  const fade = fp.W.FADE_TIME;
  for (let i = 0; i < fp.prints.length; i++) {
    const pr = fp.prints[i];
    pr.age += dt;
    const life = pr.age / fade;
    const s = life < FP.SHRINK_FROM ? 1 : Math.max(0.001, 1 - (life - FP.SHRINK_FROM) / (1 - FP.SHRINK_FROM));
    tmpObj.position.set(pr.x, pr.y, pr.z);
    tmpObj.rotation.set(0, pr.yaw, 0);
    tmpObj.scale.setScalar(s);
    tmpObj.updateMatrix();
    fp.mesh.setMatrixAt(i, tmpObj.matrix);
  }
  fp.mesh.count = fp.prints.length;
  fp.mesh.instanceMatrix.needsUpdate = true;

  // Pemilik melihat jejak segar → menyelidiki ke jejak terbaru
  fp.checkT -= dt;
  const o = ctx.owner;
  if (fp.checkT > 0 || !fp.prints.length || o.away || (o.state !== 'routine' && o.state !== 'curious')) return;
  fp.checkT = FP.CHECK_INTERVAL;
  for (let i = fp.prints.length - 1; i >= 0; i--) {
    const pr = fp.prints[i];
    if (pr.age > fp.W.FRESH_TIME) break; // lebih tua lagi = tidak segar
    if (pr.noticed || !ownerSeesPoint(ctx, pr, { lift: FP.SIGHT_LIFT })) continue;
    // Seluruh jejak segar dianggap sudah diketahui; ikuti ke jejak terbaru
    for (const q of fp.prints) if (q.age <= fp.W.FRESH_TIME) q.noticed = true;
    const newest = fp.prints[fp.prints.length - 1];
    ownerNoticeTrail(ctx, { x: newest.x, z: newest.z }, fp.W.SUSPICION);
    return;
  }
}
