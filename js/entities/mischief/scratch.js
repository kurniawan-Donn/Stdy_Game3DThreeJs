// Cakar sofa/kursi: kucing berdiri dan mencakar sisi perabot dengan kedua
// kaki depan; serpihan kain beterbangan; bekas cakaran tertinggal.
import * as THREE from 'three';
import { SCRATCH, CAT_ANIM, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief, spawnDebris } from './common.js';
import { removeAndDispose } from '../../core/dispose.js';

const LABELS = { sofaSeat: 'Cakar sofa', chair: 'Cakar kursi' };

function scratchPose(p, t) {
  const A = CAT_ANIM;
  const w = Math.max(0, Math.min(1, t / A.SCRATCH_BLEND, (SCRATCH.ACTION_DURATION - t) / A.SCRATCH_BLEND));
  const s = Math.sin(t * SCRATCH.FREQ) * A.SCRATCH_SWING;
  p.legFL.rotation.x = (-A.SCRATCH_REACH - s) * w;
  p.legFR.rotation.x = (-A.SCRATCH_REACH + s) * w;
  p.bodyPivot.rotation.x = -A.SCRATCH_REAR * w;
}

// Titik terdekat di kotak collider terhadap (x, z)
function closestOnBox(box, x, z, out) {
  out.x = Math.max(box.minX, Math.min(x, box.maxX));
  out.z = Math.max(box.minZ, Math.min(z, box.maxZ));
  return out;
}

export function createScratch(ctx, spec) {
  const box = ctx.furnitureRefs[spec.target];
  const position = new THREE.Vector3();
  const marks = new THREE.Group();
  ctx.mischief.group.add(marks);
  const markMat = new THREE.MeshStandardMaterial({ ...MATERIALS.scratchMark });
  const fluffMat = new THREE.MeshStandardMaterial({ ...MATERIALS.fluff, transparent: true, opacity: 1 });

  const inst = { type: 'scratchSofa' };

  // Bekas cakaran di sisi perabot yang menghadap kucing
  function addMarks(point, normal) {
    const tangent = new THREE.Vector3(-normal.z, 0, normal.x);
    const midY = (spec.markYMin + spec.markYMax) / 2;
    const h = spec.markYMax - spec.markYMin;
    for (let i = 0; i < SCRATCH.MARK_COUNT; i++) {
      const offset = (i / (SCRATCH.MARK_COUNT - 1) - 0.5) * SCRATCH.MARK_SPREAD;
      const mark = new THREE.Mesh(new THREE.BoxGeometry(SCRATCH.MARK_WIDTH, h * (0.8 + Math.random() * 0.2), SCRATCH.MARK_WIDTH * 0.5), markMat);
      mark.position.set(
        point.x + tangent.x * offset + normal.x * SCRATCH.MARK_WIDTH * 0.5,
        midY,
        point.z + tangent.z * offset + normal.z * SCRATCH.MARK_WIDTH * 0.5
      );
      mark.rotation.y = Math.atan2(normal.x, normal.z);
      mark.rotation.z = 0.25;
      marks.add(mark);
    }

    // Serpihan kain robek di atas tepi dudukan: tetap terlihat dari kamera
    // meski sisi yang dicakar menghadap menjauhi kamera.
    const tuftMat = new THREE.MeshStandardMaterial({ ...MATERIALS.fluff });
    for (let i = 0; i < SCRATCH.TUFT_COUNT; i++) {
      const offset = (Math.random() - 0.5) * SCRATCH.MARK_SPREAD * 1.4;
      const inward = SCRATCH.TUFT_INSET * (0.5 + Math.random());
      const s = SCRATCH.TUFT_SIZE * (0.7 + Math.random() * 0.6);
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, s), tuftMat);
      tuft.position.set(
        point.x + tangent.x * offset - normal.x * inward,
        box.topHeight + s * 0.3,
        point.z + tangent.z * offset - normal.z * inward
      );
      tuft.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      marks.add(tuft);
    }
  }

  registerMischief(ctx, inst, {
    label: LABELS[spec.target] || 'Cakar',
    position,
    surfaceY: 0, // dilakukan dari lantai
    markerHeight: spec.markYMax + SCRATCH.MARKER_OFFSET,
    track: (c) => {
      const p = c.cat.mesh.position;
      closestOnBox(box, p.x, p.z, position);
      position.y = 0;
    },
    onInteract: (c) => {
      inst.done = true;
      const p = c.cat.mesh.position;
      const point = closestOnBox(box, p.x, p.z, new THREE.Vector3());
      // Normal sisi: sumbu dominan dari titik sisi ke kucing
      const dx = p.x - point.x;
      const dz = p.z - point.z;
      const normal = Math.abs(dx) > Math.abs(dz)
        ? new THREE.Vector3(Math.sign(dx) || 1, 0, 0)
        : new THREE.Vector3(0, 0, Math.sign(dz) || 1);
      const fluffAt = point.clone().addScaledVector(normal, SCRATCH.FLUFF_OFFSET);
      fluffAt.y = (spec.markYMin + spec.markYMax) / 2;

      const puff = () => spawnDebris(c, {
        position: fluffAt,
        count: Math.ceil(SCRATCH.FLUFF_COUNT / 3),
        size: SCRATCH.FLUFF_SIZE,
        material: fluffMat,
        life: SCRATCH.FLUFF_LIFE,
        fade: SCRATCH.FLUFF_LIFE / 2,
        speedMin: SCRATCH.FLUFF_SPEED_MIN,
        speedRange: SCRATCH.FLUFF_SPEED_RANGE,
        upMin: SCRATCH.FLUFF_UP_MIN,
        upRange: SCRATCH.FLUFF_UP_RANGE,
        spin: SCRATCH.FLUFF_SPIN
      });

      c.audio.play('scratch');
      startCatAction(c.cat, {
        type: 'scratch',
        duration: SCRATCH.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, point.x, point.z),
        pose: scratchPose,
        events: [
          { at: SCRATCH.ACTION_DURATION * 0.2, fn: puff },
          { at: SCRATCH.ACTION_DURATION * 0.5, fn: puff },
          { at: SCRATCH.ACTION_DURATION * 0.8, fn: puff },
          {
            at: SCRATCH.ACTION_DURATION - 0.05,
            fn: () => {
              addMarks(point, normal);
              scoreMischief(c, 'scratchSofa', fluffAt);
            }
          }
        ]
      });
    }
  });

  inst.dispose = () => {
    removeAndDispose(marks);
  };

  return inst;
}
