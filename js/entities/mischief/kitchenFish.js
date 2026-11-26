// Curi ikan di dapur: kucing menggigit ikan dari piring di meja dapur dan
// membawanya di mulut sebentar; piring tertinggal kosong.
import * as THREE from 'three';
import { KITCHEN_FISH, CAT_ANIM, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { createFishMesh } from '../fishModel.js';
import { registerMischief, smoothstep } from './common.js';

function bitePose(p, t) {
  const A = CAT_ANIM;
  const hit = KITCHEN_FISH.BITE_AT;
  const k = t < hit ? smoothstep(t / hit) : Math.max(0, 1 - (t - hit) / (KITCHEN_FISH.ACTION_DURATION - hit));
  p.headGroup.rotation.x = A.BITE_HEAD_DIP * k;
  p.bodyPivot.rotation.x = A.BITE_LEAN * k;
}

export function createKitchenFish(ctx, spec) {
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(KITCHEN_FISH.PLATE_RADIUS, KITCHEN_FISH.PLATE_RADIUS * 0.8, 0.015, 20),
    new THREE.MeshStandardMaterial({ ...MATERIALS.plate })
  );
  plate.position.set(spec.x, spec.y + 0.0075, spec.z);
  plate.receiveShadow = true;
  ctx.mischief.group.add(plate);

  const fish = createFishMesh(KITCHEN_FISH.MODEL_SCALE);
  fish.position.set(spec.x, spec.y + 0.035, spec.z);
  fish.rotation.y = 0.6;
  ctx.mischief.group.add(fish);

  const inst = { type: 'kitchenFish', carryT: 0 };

  function bite() {
    const head = ctx.cat.parts.headGroup;
    head.add(fish);
    fish.position.set(0, KITCHEN_FISH.MOUTH_OFFSET.y, KITCHEN_FISH.MOUTH_OFFSET.z);
    fish.rotation.set(0, Math.PI / 2, 0);
    fish.scale.setScalar(KITCHEN_FISH.MOUTH_SCALE);
    inst.carryT = KITCHEN_FISH.CARRY_DURATION;
    ctx.audio.play('bite');
    scoreMischief(ctx, 'kitchenFish', plate.position);
  }

  registerMischief(ctx, inst, {
    label: 'Curi ikan',
    position: plate.position,
    surfaceY: spec.y,
    markerHeight: KITCHEN_FISH.MARKER_HEIGHT,
    onInteract: (c) => {
      inst.done = true;
      startCatAction(c.cat, {
        type: 'bite',
        duration: KITCHEN_FISH.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, plate.position.x, plate.position.z),
        pose: bitePose,
        events: [{ at: KITCHEN_FISH.BITE_AT, fn: bite }]
      });
    }
  });

  inst.update = (c, dt) => {
    if (inst.carryT <= 0) return;
    inst.carryT -= dt;
    if (inst.carryT <= 0 && fish.parent) fish.parent.remove(fish);
  };

  inst.dispose = () => {
    if (fish.parent) fish.parent.remove(fish);
    if (plate.parent) plate.parent.remove(plate);
  };

  return inst;
}
