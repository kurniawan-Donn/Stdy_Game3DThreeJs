// Merebut kursi tamu saat ia ke toilet (Level 5): Chaos kecil. Tamu kembali
// dan tertawa; pemilik tidak curiga (entities/guest).
import * as THREE from 'three';
import { GUEST_CHAIR as K } from '../../config.js';
import { startCatAction } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief } from './common.js';

function sitPose(p) {
  p.legBL.rotation.x = 1.3;
  p.legBR.rotation.x = 1.3;
  p.legFL.rotation.x = 0.25;
  p.legFR.rotation.x = 0.25;
  p.bodyPivot.rotation.x = -0.35;
}

export function createGuestChair(ctx, spec) {
  const inst = { type: 'guestChair' };
  const position = new THREE.Vector3(spec.x, spec.y, spec.z);
  registerMischief(ctx, inst, {
    label: 'Rebut kursi tamu',
    position,
    surfaceY: spec.y,
    markerHeight: K.MARKER_HEIGHT,
    // Hanya saat tamu sedang di toilet
    isEnabled: (c) => !!c.guest && c.guest.state === 'toilet',
    onInteract: (c) => {
      inst.done = true;
      startCatAction(c.cat, {
        type: 'stealChair',
        duration: K.SIT_DURATION,
        pose: sitPose,
        events: [{
          at: K.SIT_DURATION - 0.05,
          fn: () => {
            if (c.visit) c.visit.chairStolen = true;
            scoreMischief(c, 'guestChair', position.clone());
          }
        }]
      });
    }
  });
  inst.dispose = () => {};
  return inst;
}
