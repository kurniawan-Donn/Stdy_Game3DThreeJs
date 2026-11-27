// Mengacak tumpukan pakaian bersih (Level Bonus): tumpukan lipatan berwarna
// di ujung kasur. Kucing berguling di atasnya; lipatan berhamburan ke kasur &
// lantai (benda fisika, tetap sampai dibereskan pemilik). Senyap (kain).
import * as THREE from 'three';
import { LAUNDRY as L } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { addBody } from '../../systems/physics.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief } from './common.js';
import { removeAndDispose } from '../../core/dispose.js';

// Berguling: badan miring ke kiri-kanan, kaki depan mengais
function rollPose(p, t) {
  const w = Math.max(0, Math.min(1, t / 0.2, (L.ACTION_DURATION - t) / 0.2));
  const s = Math.sin(t * 9);
  p.bodyPivot.rotation.z = s * 0.6 * w;
  p.legFL.rotation.x = -0.6 * Math.max(0, s) * w;
  p.legFR.rotation.x = -0.6 * Math.max(0, -s) * w;
  p.headGroup.rotation.x = 0.2 * w;
}

export function createLaundry(ctx, spec) {
  const group = new THREE.Group();
  ctx.mischief.group.add(group);
  const geo = new THREE.BoxGeometry(L.PIECE.W, L.PIECE.H, L.PIECE.D);
  const mats = L.COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  const pieces = mats.map((mat, i) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(spec.x + (i % 2 ? 0.012 : -0.01), spec.y + L.PIECE.H * (i + 0.5), spec.z + (i % 2 ? -0.01 : 0.008));
    m.rotation.y = (i - 1.5) * 0.06;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  });

  const inst = { type: 'laundry' };
  const position = new THREE.Vector3(spec.x, spec.y, spec.z);

  function scatter() {
    const cat = ctx.cat.mesh.position;
    for (const m of pieces) {
      // Pindah dari grup ke scene sebagai benda fisika
      const wp = new THREE.Vector3();
      m.getWorldPosition(wp);
      group.remove(m);
      m.position.copy(wp);
      const body = addBody(ctx, {
        mesh: m,
        radius: L.PIECE.W * 0.4,
        bottomOffset: L.PIECE.H / 2,
        restitution: L.RESTITUTION,
        friction: L.FRICTION
      });
      let dx = wp.x - cat.x + (Math.random() - 0.5) * 0.6;
      let dz = wp.z - cat.z + (Math.random() - 0.5) * 0.6;
      const d = Math.hypot(dx, dz) || 1;
      dx /= d;
      dz /= d;
      const sp = L.SCATTER_SPEED * (0.6 + Math.random() * 0.8);
      body.vel.set(dx * sp, L.SCATTER_UP * (0.6 + Math.random() * 0.6), dz * sp);
      body.angVel.set((Math.random() - 0.5) * L.SPIN, (Math.random() - 0.5) * L.SPIN, (Math.random() - 0.5) * L.SPIN);
    }
    ctx.audio.play('laundry');
    scoreMischief(ctx, 'laundry', position.clone().setY(spec.y + 0.15));
  }

  registerMischief(ctx, inst, {
    label: 'Acak pakaian bersih',
    position,
    surfaceY: spec.y, // dari atas kasur
    markerHeight: L.MARKER_HEIGHT,
    onInteract: (c) => {
      inst.done = true;
      startCatAction(c.cat, {
        type: 'laundry',
        duration: L.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, position.x, position.z),
        pose: rollPose,
        events: [{ at: L.SCATTER_AT, fn: scatter }]
      });
    }
  });

  // Lipatan yang sudah jadi benda fisika dibersihkan clearBodies (reset) atau
  // tidyMess (dibereskan pemilik)
  inst.dispose = () => {
    removeAndDispose(group);
  };

  return inst;
}
