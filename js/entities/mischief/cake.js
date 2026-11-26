// Mencuri kue dari piring tamu (Level 5): Chaos besar, nyaris senyap. Harus
// saat pemilik & tamu tidak menatap meja (kepergok = "!" / tamu mengadu).
import * as THREE from 'three';
import { CAKE as K } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief, swipePose } from './common.js';
import { removeAndDispose } from '../../core/dispose.js';

export function createCake(ctx, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y, spec.z);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(K.PLATE_RADIUS, K.PLATE_RADIUS * 0.85, 0.012, 18), new THREE.MeshStandardMaterial({ color: K.PLATE, roughness: 0.35 }));
  plate.position.y = 0.006;
  group.add(plate);
  const cake = new THREE.Group();
  const sponge = new THREE.Mesh(new THREE.CylinderGeometry(K.RADIUS, K.RADIUS, K.HEIGHT, 3, 1, false, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: K.COLOR, roughness: 0.8 }));
  sponge.castShadow = true;
  cake.add(sponge);
  const cream = new THREE.Mesh(new THREE.CylinderGeometry(K.RADIUS, K.RADIUS, 0.008, 3, 1, false, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: K.CREAM, roughness: 0.6 }));
  cream.position.y = K.HEIGHT / 2;
  cake.add(cream);
  cake.position.y = 0.012 + K.HEIGHT / 2;
  group.add(cake);
  ctx.mischief.group.add(group);

  const inst = { type: 'cake' };
  const position = new THREE.Vector3(spec.x, spec.y, spec.z);
  registerMischief(ctx, inst, {
    label: 'Curi kue',
    position,
    surfaceY: spec.y, // dari atas meja makan
    markerHeight: K.HEIGHT + K.MARKER_OFFSET,
    onInteract: (c) => {
      inst.done = true;
      startCatAction(c.cat, {
        type: 'stealCake',
        duration: K.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, spec.x, spec.z),
        pose: swipePose(K.ACTION_DURATION * 0.5),
        events: [{
          at: K.ACTION_DURATION * 0.5,
          fn: () => {
            cake.visible = false; // kue lenyap (dibawa kabur)
            c.audio.play('fishEat');
            scoreMischief(c, 'cake', position.clone());
          }
        }]
      });
    }
  });
  inst.dispose = () => removeAndDispose(group);
  return inst;
}
