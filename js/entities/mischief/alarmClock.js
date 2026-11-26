// Jam beker digital di nakas (Level 4): disenggol jatuh, lalu berdering di
// lantai. Chaos sedang, suara keras (5 m). Angka jamnya berpendar hijau
// (cahaya jam digital di kamar).
import * as THREE from 'three';
import { ALARM_CLOCK as A, NIGHT_FX } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { addBody, removeBody } from '../../systems/physics.js';
import { registerMischief, dirFromCat, swipePose } from './common.js';
import { removeAndDispose } from '../../core/dispose.js';

function buildClock() {
  const S = A.SIZE;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(S.W, S.H, S.D), new THREE.MeshStandardMaterial({ color: A.BODY_COLOR, roughness: 0.5 }));
  body.castShadow = true;
  g.add(body);
  const face = new THREE.Mesh(new THREE.BoxGeometry(S.W * 0.8, S.H * 0.6, 0.004), new THREE.MeshBasicMaterial({ color: A.FACE_COLOR }));
  face.position.z = S.D / 2 + 0.002;
  g.add(face);
  // Angka "12:00" sebagai empat balok berpendar
  const digitMat = new THREE.MeshBasicMaterial({ color: NIGHT_FX.CLOCK_GLOW });
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(S.W * 0.13, S.H * 0.38, 0.003), digitMat);
    d.position.set((i - 1.5) * S.W * 0.18 + (i > 1 ? 0.006 : -0.006), 0, S.D / 2 + 0.005);
    g.add(d);
  }
  for (const side of [-1, 1]) {
    const bell = new THREE.Mesh(new THREE.SphereGeometry(S.H * 0.28, 10, 8), new THREE.MeshStandardMaterial({ color: A.BELL_COLOR, metalness: 0.6, roughness: 0.3 }));
    bell.position.set(side * S.W * 0.32, S.H * 0.55, 0);
    g.add(bell);
  }
  return g;
}

export function createAlarmClock(ctx, spec) {
  const mesh = buildClock();
  mesh.position.set(spec.x, spec.y + A.SIZE.H / 2, spec.z);
  mesh.rotation.y = Math.PI / 2; // menghadap ke kasur (timur)
  ctx.mischief.group.add(mesh);
  const inst = { type: 'alarmClock', mesh, phase: 'idle', body: null, fallT: 0, ringT: 0, dir: new THREE.Vector3() };

  function land() {
    if (inst.phase !== 'falling') return;
    inst.phase = 'ringing';
    inst.ringT = A.RING_TIME;
    ctx.audio.play('clockDrop');
    ctx.audio.play('alarmRing');
    scoreMischief(ctx, 'alarmClock', mesh.position.clone());
  }

  function release() {
    inst.phase = 'falling';
    inst.body = addBody(ctx, {
      mesh,
      radius: A.SIZE.W / 2,
      bottomOffset: A.SIZE.H / 2,
      restitution: A.RESTITUTION,
      friction: A.FRICTION,
      frictionless: true,
      grounded: true,
      onImpact: () => land()
    });
    inst.body.vel.set(inst.dir.x * A.RELEASE_SPEED, 0, inst.dir.z * A.RELEASE_SPEED);
    inst.body.angVel.set(inst.dir.z * A.TUMBLE_SPIN, 0, -inst.dir.x * A.TUMBLE_SPIN);
  }

  registerMischief(ctx, inst, {
    label: 'Jatuhkan jam beker',
    position: mesh.position,
    surfaceY: spec.y,
    markerHeight: A.SIZE.H / 2 + A.MARKER_OFFSET,
    onInteract: (c) => {
      inst.done = true;
      inst.dir.copy(dirFromCat(c, mesh.position));
      startCatAction(c.cat, {
        type: 'swipeClock',
        duration: A.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, mesh.position.x, mesh.position.z),
        pose: swipePose(A.SWIPE_HIT),
        events: [{ at: A.SWIPE_HIT, fn: release }]
      });
    }
  });

  inst.update = (c, dt) => {
    if (inst.phase === 'falling') {
      inst.fallT += dt;
      if (inst.fallT > A.MAX_SLIDE_TIME) land(); // pengaman
    } else if (inst.phase === 'ringing') {
      // Bergetar sambil berdering di lantai
      inst.ringT -= dt;
      mesh.rotation.z = Math.sin(inst.ringT * A.RING_FREQ) * A.RING_WOBBLE * Math.max(0, inst.ringT / A.RING_TIME);
      if (inst.ringT <= 0) inst.phase = 'done';
    }
  };

  inst.dispose = (c) => {
    if (inst.body) removeBody(c, inst.body);
    removeAndDispose(mesh);
  };
  return inst;
}
