// Interaksi (tombol E): mencari objek interaktif terdekat, menampilkan
// penanda di atasnya + prompt di HUD, dan menjalankan aksinya saat E ditekan.
//
// Objek didaftarkan dengan registerInteractable(sys, item):
//   item = {
//     label: 'Jatuhkan gelas',          // teks prompt
//     position: THREE.Vector3,          // referensi posisi (boleh posisi mesh)
//     markerHeight?: number,            // tinggi penanda di atas posisi
//     isEnabled?: (ctx) => boolean,     // opsional
//     onInteract: (ctx) => void
//   }
import * as THREE from 'three';
import { INTERACT } from '../config.js';

export function createInteractionSystem(scene) {
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(INTERACT.MARKER_SIZE, INTERACT.MARKER_SIZE * 1.8, 4),
    new THREE.MeshBasicMaterial({ color: INTERACT.MARKER_COLOR })
  );
  marker.rotation.x = Math.PI; // ujung kerucut menunjuk ke bawah
  marker.visible = false;
  scene.add(marker);

  return { items: [], current: null, marker, clock: 0 };
}

// Mengembalikan fungsi untuk membatalkan pendaftaran.
export function registerInteractable(sys, item) {
  sys.items.push(item);
  return () => {
    const i = sys.items.indexOf(item);
    if (i >= 0) sys.items.splice(i, 1);
    if (sys.current === item) sys.current = null;
  };
}

function findNearest(ctx) {
  const sys = ctx.interaction;
  const p = ctx.cat.mesh.position;
  let best = null;
  let bestDistSq = INTERACT.RADIUS * INTERACT.RADIUS;

  for (const item of sys.items) {
    if (item.isEnabled && !item.isEnabled(ctx)) continue;
    const ip = item.position;
    if (Math.abs(ip.y - p.y) > INTERACT.MAX_HEIGHT_DIFF) continue;
    const dx = ip.x - p.x;
    const dz = ip.z - p.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= bestDistSq) {
      best = item;
      bestDistSq = distSq;
    }
  }
  return best;
}

export function updateInteraction(ctx, dt) {
  const sys = ctx.interaction;
  const best = findNearest(ctx);
  sys.current = best;
  ctx.hud.setInteractPrompt(best ? best.label : null);

  const marker = sys.marker;
  if (best) {
    sys.clock += dt;
    const h = best.markerHeight !== undefined ? best.markerHeight : INTERACT.MARKER_HEIGHT;
    marker.visible = true;
    marker.position.set(
      best.position.x,
      best.position.y + h + Math.sin(sys.clock * INTERACT.MARKER_BOB_SPEED) * INTERACT.MARKER_BOB_AMP,
      best.position.z
    );
    marker.rotation.y += INTERACT.MARKER_SPIN_SPEED * dt;

    if (ctx.input.pressed['KeyE']) best.onInteract(ctx);
  } else {
    marker.visible = false;
  }
}

export function hideInteraction(ctx) {
  ctx.interaction.current = null;
  ctx.interaction.marker.visible = false;
  ctx.hud.setInteractPrompt(null);
}
