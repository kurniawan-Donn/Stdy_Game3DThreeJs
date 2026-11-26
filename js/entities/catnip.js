// Catnip (GDD §11): maksimal satu per level, di tempat berisiko (samping meja
// kerja pemilik). Dimakan otomatis saat disentuh → zoomies CATNIP.ZOOMIES_DURATION
// detik: sangat cepat, senyap, stamina tidak terkuras, tepi layar berpelangi.
import * as THREE from 'three';
import { CATNIP, PLAYER, MATERIALS } from '../config.js';

export function createCatnip(scene) {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ ...MATERIALS.catnipLeaf });
  const glowMat = new THREE.MeshStandardMaterial({ ...MATERIALS.catnipGlow });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), i % 2 ? leafMat : glowMat);
    leaf.scale.set(1, 0.35, 1.8);
    leaf.position.set(Math.cos(a) * 0.025, 0.01, Math.sin(a) * 0.025);
    leaf.rotation.y = -a;
    leaf.castShadow = true;
    group.add(leaf);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 5), leafMat);
  stem.position.y = 0.02;
  group.add(stem);
  scene.add(group);
  return { mesh: group, active: false, clock: 0 };
}

export function resetCatnip(ctx) {
  const n = ctx.catnip;
  n.active = true;
  n.mesh.visible = true;
  n.mesh.position.set(CATNIP.POSITION.x, CATNIP.HOVER, CATNIP.POSITION.z);
  ctx.cat.zoomiesT = 0;
  ctx.screenFx.setZoomies(false);
}

export function updateCatnip(ctx, dt) {
  const n = ctx.catnip;
  const cat = ctx.cat;
  if (n.active) {
    n.clock += dt;
    n.mesh.rotation.y += CATNIP.SPIN_SPEED * dt;
    n.mesh.position.y = CATNIP.HOVER + Math.sin(n.clock * CATNIP.BOB_SPEED) * CATNIP.BOB_AMP;
    const p = cat.mesh.position;
    const d = Math.hypot(p.x - n.mesh.position.x, p.z - n.mesh.position.z);
    if (d <= PLAYER.RADIUS + CATNIP.PICKUP_RADIUS && p.y < 0.2 && !cat.inBox && !cat.riding) {
      n.active = false;
      n.mesh.visible = false;
      cat.zoomiesT = CATNIP.ZOOMIES_DURATION;
      ctx.audio.play('catnip');
    }
  }
  ctx.screenFx.setZoomies(cat.zoomiesT > 0);
}
