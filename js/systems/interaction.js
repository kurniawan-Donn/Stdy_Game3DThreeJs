// Interaksi (tombol E): mencari objek interaktif terdekat, menampilkan
// penanda di atasnya + prompt di HUD, dan menjalankan aksinya saat E ditekan.
//
// Objek didaftarkan dengan registerInteractable(sys, item):
//   item = {
//     label: 'Jatuhkan gelas',          // teks prompt
//     position: THREE.Vector3,          // referensi posisi (boleh posisi mesh)
//     markerHeight?: number,            // tinggi penanda di atas posisi
//     surfaceY?: number,                // kucing harus berdiri di ketinggian ini
//     track?: (ctx) => void,            // perbarui position tiap frame (opsional)
//     isEnabled?: (ctx) => boolean,     // opsional
//     maxDist?: number,                 // jarak maksimum (default INTERACT.RADIUS)
//     bias?: number,                    // ditambahkan ke jarak (prioritas lebih rendah)
//     inBoxOnly?: boolean,              // hanya saat kucing di dalam kardus
//     hold?: number,                    // tahan E selama ini (detik) untuk menjalankan
//     onInteract: (ctx) => void
//   }
import * as THREE from 'three';
import { INTERACT, SURFACE_TOLERANCE } from '../config.js';

export function createInteractionSystem(scene) {
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(INTERACT.MARKER_SIZE, INTERACT.MARKER_SIZE * 1.8, 4),
    new THREE.MeshBasicMaterial({ color: INTERACT.MARKER_COLOR })
  );
  marker.rotation.x = Math.PI; // ujung kerucut menunjuk ke bawah
  marker.visible = false;
  scene.add(marker);

  return { items: [], current: null, marker, clock: 0, holdT: 0, holdDone: false };
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
  let bestDistSq = Infinity;

  const cat = ctx.cat;
  if (cat.action || cat.riding || cat.sleeping) return null; // sedang melakukan hal lain

  for (const item of sys.items) {
    // Di dalam kardus hanya "Keluar kardus"; di luar kardus sebaliknya
    if (!!item.inBoxOnly !== !!cat.inBox) continue;
    // Dari kolong perabot tidak bisa berinteraksi dengan objek lantai di luar
    if (cat.underCrawl && item.surfaceY === 0) continue;
    if (item.isEnabled && !item.isEnabled(ctx)) continue;
    if (item.track) item.track(ctx); // posisi dinamis (mis. titik terdekat di sisi sofa)
    const ip = item.position;
    if (item.surfaceY !== undefined) {
      // Kucing harus berdiri di permukaan yang sama dengan objek
      if (Math.abs(p.y - item.surfaceY) > SURFACE_TOLERANCE) continue;
    } else if (Math.abs(ip.y - p.y) > INTERACT.MAX_HEIGHT_DIFF) {
      continue;
    }
    const dx = ip.x - p.x;
    const dz = ip.z - p.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (item.maxDist !== undefined && dist > item.maxDist) continue;
    if (!item.inBoxOnly && dist > INTERACT.RADIUS) continue;
    const score = (dist + (item.bias || 0)) ** 2;
    if (score <= bestDistSq) {
      best = item;
      bestDistSq = score;
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

    if (best.hold) {
      // Tahan E: jalankan setelah ditahan best.hold detik (sekali per tekanan)
      if (ctx.input.keys['KeyE'] && !sys.holdDone) {
        sys.holdT += dt;
        if (sys.holdT >= best.hold) {
          sys.holdDone = true;
          sys.holdT = 0;
          best.onInteract(ctx);
        }
      } else if (!ctx.input.keys['KeyE']) {
        sys.holdT = 0;
        sys.holdDone = false;
      }
    } else if (ctx.input.pressed['KeyE']) {
      best.onInteract(ctx);
    }
  } else {
    marker.visible = false;
    sys.holdT = 0;
    if (!ctx.input.keys['KeyE']) sys.holdDone = false;
  }
}

export function hideInteraction(ctx) {
  ctx.interaction.current = null;
  ctx.interaction.marker.visible = false;
  ctx.hud.setInteractPrompt(null);
}
