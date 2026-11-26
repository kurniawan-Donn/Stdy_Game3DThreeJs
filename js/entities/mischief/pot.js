// Pot: kucing menepuk pot tanaman → pot terguling menjauhi kucing,
// tanah tumpah di lantai; pot tetap rebah sampai level diulang.
import * as THREE from 'three';
import { POT, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief, dirFromCat, swipePose } from './common.js';

export function createPot(ctx, spec) {
  const plant = ctx.furnitureRefs.plants[spec.plant];
  const group = plant.group;
  const collider = plant.collider;
  const originalTop = collider.topHeight;
  const basePos = group.position.clone();

  const inst = {
    type: 'pot',
    tipping: false,
    tipT: 0,
    axis: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    spill: null
  };

  function finishTip() {
    inst.tipping = false;
    collider.topHeight = POT.FALLEN_TOP_HEIGHT;

    // Tanah tumpah
    const spill = new THREE.Mesh(
      new THREE.CircleGeometry(POT.SPILL_RADIUS, 16),
      new THREE.MeshStandardMaterial({ ...MATERIALS.soilSpill })
    );
    spill.rotation.x = -Math.PI / 2;
    spill.scale.set(1.3, 0.8, 1);
    spill.position.set(
      basePos.x + inst.dir.x * POT.SPILL_DISTANCE,
      0.012,
      basePos.z + inst.dir.z * POT.SPILL_DISTANCE
    );
    spill.receiveShadow = true;
    ctx.mischief.group.add(spill);
    inst.spill = spill;

    ctx.audio.play('potThud');
    scoreMischief(ctx, 'pot', basePos.clone().setY(0.6));
  }

  registerMischief(ctx, inst, {
    label: 'Gulingkan pot',
    position: group.position,
    surfaceY: 0,
    markerHeight: 2.1,
    onInteract: (c) => {
      inst.done = true;
      inst.dir.copy(dirFromCat(c, group.position));
      // Sumbu putar = atas × arah, sehingga puncak pot jatuh menjauhi kucing
      inst.axis.set(inst.dir.z, 0, -inst.dir.x);
      startCatAction(c.cat, {
        type: 'tipPot',
        duration: POT.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, group.position.x, group.position.z),
        pose: swipePose(POT.HIT_AT),
        events: [{ at: POT.HIT_AT, fn: () => { inst.tipping = true; inst.tipT = 0; } }]
      });
    }
  });

  inst.update = (c, dt) => {
    if (!inst.tipping) return;
    inst.tipT += dt;
    const k = Math.min(1, inst.tipT / POT.TIP_DURATION);
    const angle = POT.TIP_ANGLE * k * k; // makin cepat saat jatuh
    group.quaternion.setFromAxisAngle(inst.axis, angle);
    group.position.y = basePos.y + POT.LIE_LIFT * Math.sin(angle);
    if (k >= 1) finishTip();
  };

  inst.dispose = () => {
    group.quaternion.identity();
    group.position.copy(basePos);
    collider.topHeight = originalTop;
    if (inst.spill && inst.spill.parent) inst.spill.parent.remove(inst.spill);
  };

  return inst;
}
