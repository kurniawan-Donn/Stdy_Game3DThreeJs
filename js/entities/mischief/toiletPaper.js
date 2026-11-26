// Tarik gulungan tisu toilet: kucing berdiri dan menepuk gulungan berkali-kali;
// gulungan berputar, kertas menjuntai ke lantai lalu terurai memanjang.
// Setelahnya gulungan tinggal sedikit dan kertas tetap berserakan.
import * as THREE from 'three';
import { TOILET_PAPER as T, CAT_ANIM, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief, smoothstep } from './common.js';

// Berdiri dengan kaki belakang, kaki depan menepuk bergantian
function batPose(p, t) {
  const A = CAT_ANIM;
  const w = Math.max(0, Math.min(1, t / A.SCRATCH_BLEND, (T.ACTION_DURATION - t) / A.SCRATCH_BLEND));
  const s = Math.sin(t * 14) * 0.5;
  p.legFL.rotation.x = (-A.SCRATCH_REACH - s) * w;
  p.legFR.rotation.x = (-A.SCRATCH_REACH + s) * w;
  p.bodyPivot.rotation.x = -A.SCRATCH_REAR * 1.3 * w;
  p.headGroup.rotation.x = -0.3 * w;
}

export function createToiletPaper(ctx, spec) {
  const group = new THREE.Group();
  ctx.mischief.group.add(group);
  const paperMat = new THREE.MeshStandardMaterial({ ...MATERIALS.toiletPaper, side: THREE.DoubleSide });

  // Gagang di dinding + gulungan (sumbu gulungan sepanjang Z)
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, T.ROLL_LENGTH + 0.05, 8),
    new THREE.MeshStandardMaterial({ ...MATERIALS.chrome })
  );
  bar.rotation.x = Math.PI / 2;
  bar.position.set(spec.x, spec.y, spec.z);
  group.add(bar);

  const roll = new THREE.Mesh(new THREE.CylinderGeometry(T.ROLL_RADIUS, T.ROLL_RADIUS, T.ROLL_LENGTH, 18), paperMat);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(spec.x, spec.y, spec.z);
  roll.castShadow = true;
  group.add(roll);

  // Kertas menjuntai (vertikal) dan terurai di lantai (+X, ke dalam ruangan)
  const hangX = spec.x + T.ROLL_RADIUS;
  const hang = new THREE.Mesh(new THREE.PlaneGeometry(T.STRIP_WIDTH, 1), paperMat);
  hang.rotation.y = Math.PI / 2;
  hang.position.set(hangX, spec.y, spec.z);
  hang.scale.y = 0.0001;
  hang.visible = false;
  group.add(hang);

  const trail = new THREE.Mesh(new THREE.PlaneGeometry(1, T.STRIP_WIDTH), paperMat);
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(hangX, 0.004, spec.z);
  trail.scale.x = 0.0001;
  trail.visible = false;
  trail.receiveShadow = true;
  group.add(trail);

  const inst = { type: 'toiletPaper', t: -1 };
  const position = new THREE.Vector3(spec.x, spec.y, spec.z);

  function setUnroll(k) {
    // 0..0,5: kertas menjuntai ke lantai; 0,5..1: terurai di lantai
    const hk = smoothstep(Math.min(1, k * 2));
    const fk = smoothstep(Math.max(0, k * 2 - 1));
    hang.visible = hk > 0;
    hang.scale.y = Math.max(0.0001, spec.y * hk);
    hang.position.y = spec.y - (spec.y * hk) / 2;
    trail.visible = fk > 0;
    trail.scale.x = Math.max(0.0001, T.STRIP_FLOOR_LENGTH * fk);
    trail.position.x = hangX + (T.STRIP_FLOOR_LENGTH * fk) / 2;
    const r = T.ROLL_RADIUS + (T.ROLL_RADIUS_AFTER - T.ROLL_RADIUS) * k;
    roll.scale.set(r / T.ROLL_RADIUS, 1, r / T.ROLL_RADIUS);
  }

  registerMischief(ctx, inst, {
    label: 'Tarik tisu toilet',
    position,
    surfaceY: 0, // dari lantai
    markerHeight: T.MARKER_HEIGHT,
    onInteract: (c) => {
      inst.done = true;
      inst.t = 0;
      c.audio.play('toiletPaper');
      startCatAction(c.cat, {
        type: 'toiletPaper',
        duration: T.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, position.x, position.z),
        pose: batPose,
        events: [{ at: T.ACTION_DURATION - 0.05, fn: () => scoreMischief(c, 'toiletPaper', new THREE.Vector3(hangX, 0.3, spec.z)) }]
      });
    }
  });

  inst.update = (c, dt) => {
    if (inst.t < 0 || inst.t >= T.ACTION_DURATION) return;
    inst.t = Math.min(T.ACTION_DURATION, inst.t + dt);
    roll.rotation.y += T.ROLL_SPIN * dt; // sumbu lokal Y = sumbu gulungan
    setUnroll(inst.t / T.ACTION_DURATION);
  };

  inst.dispose = () => {
    if (group.parent) group.parent.remove(group);
  };

  return inst;
}
