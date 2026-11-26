// Acak-acak selimut: kucing di atas kasur "menguleni" selimut dengan kaki
// depan; selimut yang rapi berubah jadi gumpalan kusut. Sangat senyap.
import * as THREE from 'three';
import { BLANKET as B, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief } from './common.js';

function kneadPose(p, t) {
  const w = Math.max(0, Math.min(1, t / 0.15, (B.ACTION_DURATION - t) / 0.15));
  const s = Math.sin(t * B.KNEAD_FREQ * 2);
  p.legFL.rotation.x = (-0.5 + Math.max(0, s) * -0.5) * w;
  p.legFR.rotation.x = (-0.5 + Math.max(0, -s) * -0.5) * w;
  p.bodyPivot.rotation.x = 0.12 * w;
  p.headGroup.rotation.x = 0.25 * w;
}

export function createBlanket(ctx, spec) {
  const group = new THREE.Group();
  ctx.mischief.group.add(group);
  const mat = new THREE.MeshStandardMaterial({ ...MATERIALS.blanket });

  // Selimut rapi
  const neat = new THREE.Mesh(new THREE.BoxGeometry(B.SIZE.W, B.SIZE.H, B.SIZE.D), mat);
  neat.position.set(spec.x, spec.y + B.SIZE.H / 2, spec.z);
  neat.receiveShadow = true;
  neat.castShadow = true;
  group.add(neat);

  // Gumpalan kusut (disembunyikan sampai diacak-acak)
  const messy = new THREE.Group();
  for (let i = 0; i < B.CRUMPLE_PIECES; i++) {
    const w = B.SIZE.W * (0.35 + Math.random() * 0.3);
    const d = B.SIZE.D * (0.25 + Math.random() * 0.3);
    const h = B.SIZE.H * (1.5 + Math.random() * 2.5);
    const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    piece.position.set(
      spec.x + (Math.random() - 0.5) * B.SIZE.W * 0.7,
      spec.y + h / 2,
      spec.z + (Math.random() - 0.5) * B.SIZE.D * 0.7
    );
    piece.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
    piece.castShadow = true;
    messy.add(piece);
  }
  messy.visible = false;
  group.add(messy);

  const inst = { type: 'blanket' };
  const position = new THREE.Vector3(spec.x, spec.y, spec.z);

  registerMischief(ctx, inst, {
    label: 'Acak-acak selimut',
    position,
    surfaceY: spec.y, // dari atas kasur
    markerHeight: B.MARKER_HEIGHT,
    track: (c) => {
      // Penanda mengikuti kucing di atas kasur (selimut lebar)
      const p = c.cat.mesh.position;
      position.x = Math.max(spec.x - B.SIZE.W / 2, Math.min(spec.x + B.SIZE.W / 2, p.x));
      position.z = Math.max(spec.z - B.SIZE.D / 2, Math.min(spec.z + B.SIZE.D / 2, p.z));
    },
    onInteract: (c) => {
      inst.done = true;
      c.audio.play('blanket');
      startCatAction(c.cat, {
        type: 'blanket',
        duration: B.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, position.x, position.z),
        pose: kneadPose,
        events: [{
          at: B.ACTION_DURATION - 0.05,
          fn: () => {
            neat.visible = false;
            messy.visible = true;
            scoreMischief(c, 'blanket', position.clone());
          }
        }]
      });
    }
  });

  inst.dispose = () => {
    if (group.parent) group.parent.remove(group);
  };

  return inst;
}
