// Tidur di tas/jaket tamu (Level 5): tahan E, kucing meringkuk di tas.
// Chaos sedang dan senyap, tapi tamu yang melihatnya tertawa & memanggil
// pemilik (entities/guest: kucing sedang beraksi = kenakalan).
import * as THREE from 'three';
import { GUEST_BAG as B, IDLE } from '../../config.js';
import { startCatAction } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief } from './common.js';
import { removeAndDispose } from '../../core/dispose.js';

// Pose meringkuk (seperti loaf)
function napPose(p) {
  p.legFL.rotation.x = IDLE.LOAF_LEG_FOLD;
  p.legFR.rotation.x = IDLE.LOAF_LEG_FOLD;
  p.legBL.rotation.x = -IDLE.LOAF_LEG_FOLD;
  p.legBR.rotation.x = -IDLE.LOAF_LEG_FOLD;
  p.bodyPivot.scale.y *= 1 - IDLE.LOAF_SQUASH;
  p.bodyPivot.position.y = -IDLE.LOAF_DROP;
  p.headGroup.rotation.x = 0.35;
  p.tailPivot.rotation.z = 1.2;
}

export function createGuestBag(ctx, spec) {
  const S = B.SIZE;
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y, spec.z);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(S.W, S.H, S.D), new THREE.MeshStandardMaterial({ color: B.COLOR, roughness: 0.85 }));
  bag.position.y = S.H / 2;
  bag.castShadow = true;
  group.add(bag);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(S.W * 0.3, 0.012, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: B.STRAP, roughness: 0.7 }));
  strap.position.y = S.H;
  group.add(strap);
  ctx.mischief.group.add(group);

  const inst = { type: 'guestBag' };
  const position = new THREE.Vector3(spec.x, spec.y, spec.z);
  registerMischief(ctx, inst, {
    label: 'Tahan E: Tidur di tas',
    position,
    surfaceY: spec.y, // dari dudukan kursi
    hold: B.HOLD,
    markerHeight: B.MARKER_HEIGHT,
    onInteract: (c) => {
      inst.done = true;
      const cat = c.cat;
      cat.mesh.position.set(spec.x, spec.y + S.H * 0.5, spec.z);
      startCatAction(cat, {
        type: 'bagNap',
        duration: B.NAP_DURATION,
        pose: napPose,
        events: [{
          at: B.NAP_DURATION - 0.05,
          fn: () => {
            bag.scale.y = 0.6; // tas penyok
            scoreMischief(c, 'guestBag', position.clone());
          }
        }]
      });
    }
  });
  inst.dispose = () => removeAndDispose(group);
  return inst;
}
