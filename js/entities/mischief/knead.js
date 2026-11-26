// Menginjak-injak selimut di atas pemilik yang tidur (Level 4): Chaos besar
// dan meter terbangun langsung terisi banyak. Hanya saat pemilik tidur.
import * as THREE from 'three';
import { KNEAD as K } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { addWake, nightConfig } from '../../systems/night.js';
import { registerMischief } from './common.js';

function kneadPose(p, t) {
  const w = Math.max(0, Math.min(1, t / 0.15, (K.ACTION_DURATION - t) / 0.15));
  const s = Math.sin(t * K.KNEAD_FREQ * 2);
  p.legFL.rotation.x = (-0.5 + Math.max(0, s) * -0.5) * w;
  p.legFR.rotation.x = (-0.5 + Math.max(0, -s) * -0.5) * w;
  p.bodyPivot.rotation.x = 0.12 * w;
  p.headGroup.rotation.x = 0.25 * w;
}

export function createKnead(ctx, spec) {
  const inst = { type: 'knead' };
  const position = new THREE.Vector3(spec.x, spec.y, spec.z);
  registerMischief(ctx, inst, {
    label: 'Injak-injak selimut',
    position,
    surfaceY: spec.y, // dari atas kasur
    markerHeight: K.MARKER_HEIGHT,
    // Hanya saat pemilik tidur dan kucing di dekat badannya (bukan di seluruh kasur)
    isEnabled: (c) => !!c.owner.asleep && Math.hypot(c.cat.mesh.position.x - spec.x, c.cat.mesh.position.z - spec.z) <= K.NEAR_OWNER,
    track: (c) => {
      // Penanda mengikuti kucing di atas kasur, dekat pemilik
      const p = c.cat.mesh.position;
      const d = Math.hypot(p.x - spec.x, p.z - spec.z);
      const k = d > K.NEAR_OWNER ? K.NEAR_OWNER / d : 1;
      position.x = spec.x + (p.x - spec.x) * k;
      position.z = spec.z + (p.z - spec.z) * k;
    },
    onInteract: (c) => {
      inst.done = true;
      c.audio.play('knead');
      startCatAction(c.cat, {
        type: 'knead',
        duration: K.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, position.x, position.z),
        pose: kneadPose,
        events: [{
          at: K.ACTION_DURATION - 0.05,
          fn: () => {
            scoreMischief(c, 'knead', position.clone());
            const N = nightConfig(c);
            if (N) addWake(c, N.KNEAD_WAKE, position);
          }
        }]
      });
    }
  });
  inst.dispose = () => {};
  return inst;
}
