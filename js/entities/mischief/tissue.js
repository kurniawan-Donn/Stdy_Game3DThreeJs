// Tisu: kucing menepuk kotak tisu → kotak terlempar, lembar tisu berhamburan
// dan tetap berserakan sampai level diulang.
import * as THREE from 'three';
import { TISSUE, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { addBody } from '../../systems/physics.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief, dirFromCat, swipePose } from './common.js';

const BOX = TISSUE.BOX_SIZE;

export function createTissue(ctx, spec) {
  const box = new THREE.Group();
  const boxMesh = new THREE.Mesh(
    new THREE.BoxGeometry(BOX.W, BOX.H, BOX.D),
    new THREE.MeshStandardMaterial({ ...MATERIALS.tissueBox })
  );
  boxMesh.castShadow = true;
  box.add(boxMesh);

  const tissueMat = new THREE.MeshStandardMaterial({ ...MATERIALS.tissue });
  const puff = new THREE.Mesh(new THREE.BoxGeometry(BOX.W * 0.4, BOX.H * 0.5, BOX.D * 0.45), tissueMat);
  puff.position.y = BOX.H / 2 + BOX.H * 0.2;
  box.add(puff);

  box.position.set(spec.x, spec.y + BOX.H / 2, spec.z);
  box.rotation.y = 0.3;
  ctx.mischief.group.add(box);

  const inst = { type: 'tissue' };

  function hit() {
    const dir = dirFromCat(ctx, box.position);
    const origin = box.position.clone();
    puff.visible = false;

    // Kotak ikut terlempar sedikit
    const boxBody = addBody(ctx, {
      mesh: box,
      radius: BOX.D / 2,
      bottomOffset: BOX.H / 2,
      restitution: TISSUE.SHEET_RESTITUTION,
      friction: TISSUE.SHEET_FRICTION
    });
    boxBody.vel.set(dir.x * TISSUE.BOX_SPEED, TISSUE.BOX_UP, dir.z * TISSUE.BOX_SPEED);
    boxBody.angVel.set(dir.z * TISSUE.BOX_SPIN, 0, -dir.x * TISSUE.BOX_SPIN);

    // Lembar-lembar tisu
    const sheetGeo = new THREE.BoxGeometry(TISSUE.SHEET_SIZE, 0.003, TISSUE.SHEET_SIZE);
    for (let i = 0; i < TISSUE.SHEET_COUNT; i++) {
      const sheet = new THREE.Mesh(sheetGeo, tissueMat);
      sheet.position.copy(origin).y += BOX.H / 2;
      sheet.receiveShadow = true;
      // Arah menyebar di sekitar arah tepukan
      const spread = (Math.random() - 0.5) * TISSUE.SPREAD_ANGLE;
      const ca = Math.cos(spread);
      const sa = Math.sin(spread);
      const dx = dir.x * ca - dir.z * sa;
      const dz = dir.x * sa + dir.z * ca;
      const speed = TISSUE.SHEET_SPEED_MIN + Math.random() * TISSUE.SHEET_SPEED_RANGE;
      const body = addBody(ctx, {
        mesh: sheet,
        radius: TISSUE.SHEET_SIZE * 0.4,
        bottomOffset: 0.0015,
        restitution: TISSUE.SHEET_RESTITUTION,
        friction: TISSUE.SHEET_FRICTION
      });
      body.vel.set(dx * speed, TISSUE.SHEET_UP_MIN + Math.random() * TISSUE.SHEET_UP_RANGE, dz * speed);
      const s = TISSUE.SHEET_SPIN;
      body.angVel.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    ctx.audio.play('tissue');
    scoreMischief(ctx, 'tissue', origin);
  }

  registerMischief(ctx, inst, {
    label: 'Tumpahkan tisu',
    position: box.position,
    surfaceY: spec.y,
    markerHeight: TISSUE.MARKER_HEIGHT,
    onInteract: (c) => {
      inst.done = true;
      startCatAction(c.cat, {
        type: 'tissue',
        duration: TISSUE.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, box.position.x, box.position.z),
        pose: swipePose(TISSUE.HIT_AT),
        events: [{ at: TISSUE.HIT_AT, fn: hit }]
      });
    }
  });

  // Kotak & lembar tisu jadi benda fisika; dibersihkan oleh clearBodies saat reset.
  inst.dispose = () => {
    if (box.parent) box.parent.remove(box);
  };

  return inst;
}
