// Gelas: kucing mendorong pelan dengan kaki depan → menoleh ke kamera →
// gelas meluncur jatuh dari tepi → pecah, pecahan berhamburan & memudar.
import * as THREE from 'three';
import { GLASS, CAT_ANIM, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { addBody, removeBody } from '../../systems/physics.js';
import { scoreMischief } from '../../systems/chaos.js';
import { triggerShake } from '../../core/camera.js';
import { registerMischief, dirFromCat, smoothstep } from './common.js';
import { removeAndDispose } from '../../core/dispose.js';

const ACTION_DURATION = GLASS.PAW_DURATION + GLASS.STARE_DURATION + GLASS.RECOVER_DURATION;

// Pose dorong pelan + tatap kamera
function pushPose(p, t, cat) {
  const A = CAT_ANIM;
  const pawEnd = GLASS.PAW_DURATION;
  const stareEnd = pawEnd + GLASS.STARE_DURATION;

  // Kaki depan kanan maju, menepuk pelan selama fase dorong
  let reach;
  if (t < pawEnd) reach = smoothstep(t / (pawEnd * 0.4));
  else if (t < stareEnd) reach = 1;
  else reach = Math.max(0, 1 - (t - stareEnd) / GLASS.RECOVER_DURATION);
  const tap = t < pawEnd ? Math.sin(t * A.PUSH_TAP_FREQ) * A.PUSH_TAP_AMP : 0;
  p.legFR.rotation.x = -A.PUSH_REACH * reach - tap;

  // Menoleh ke kamera
  let stare = 0;
  if (t >= pawEnd && t < stareEnd) stare = Math.min(1, (t - pawEnd) / A.STARE_BLEND_IN);
  else if (t >= stareEnd) stare = Math.max(0, 1 - (t - stareEnd) / GLASS.RECOVER_DURATION);
  const yaw = THREE.MathUtils.clamp(cat.camYaw, -A.STARE_MAX_YAW, A.STARE_MAX_YAW);
  p.headGroup.rotation.y = yaw * stare;
  p.headGroup.rotation.x = -A.STARE_HEAD_TILT * stare;
}

function buildGlassMesh() {
  const group = new THREE.Group();
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(GLASS.RADIUS, GLASS.RADIUS * 0.85, GLASS.HEIGHT, 14),
    new THREE.MeshStandardMaterial({ ...MATERIALS.drinkGlass })
  );
  cup.castShadow = true;
  group.add(cup);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(GLASS.RADIUS * 0.82, GLASS.RADIUS * 0.75, GLASS.HEIGHT * 0.6, 12),
    new THREE.MeshStandardMaterial({ ...MATERIALS.drinkWater })
  );
  water.position.y = -GLASS.HEIGHT * 0.15;
  group.add(water);
  return group;
}

function spawnShards(ctx, position) {
  const geo = new THREE.TetrahedronGeometry(GLASS.SHARD_SIZE);
  for (let i = 0; i < GLASS.SHARD_COUNT; i++) {
    const mat = new THREE.MeshStandardMaterial({ ...MATERIALS.glassShard });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    const angle = Math.random() * Math.PI * 2;
    const speed = GLASS.SHARD_SPEED_MIN + Math.random() * GLASS.SHARD_SPEED_RANGE;
    const body = addBody(ctx, {
      mesh,
      material: mat,
      radius: GLASS.SHARD_SIZE,
      bottomOffset: GLASS.SHARD_SIZE * 0.5,
      restitution: GLASS.SHARD_RESTITUTION,
      friction: GLASS.SHARD_FRICTION,
      life: GLASS.SHARD_LIFE + GLASS.SHARD_FADE,
      fade: GLASS.SHARD_FADE
    });
    body.vel.set(
      Math.cos(angle) * speed,
      GLASS.SHARD_UP_MIN + Math.random() * GLASS.SHARD_UP_RANGE,
      Math.sin(angle) * speed
    );
    const s = GLASS.SHARD_SPIN;
    body.angVel.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
}

export function createGlass(ctx, spec) {
  const mesh = buildGlassMesh();
  mesh.position.set(spec.x, spec.y + GLASS.HEIGHT / 2, spec.z);
  ctx.mischief.group.add(mesh);

  const inst = {
    type: 'glass',
    mesh,
    phase: 'idle', // idle → pushing → falling → shattered
    body: null,
    pushT: 0,
    fallT: 0,
    startPos: new THREE.Vector3(),
    dir: new THREE.Vector3()
  };

  function shatter() {
    if (inst.phase === 'shattered') return;
    inst.phase = 'shattered';
    const pos = mesh.position.clone();
    if (inst.body) removeBody(ctx, inst.body);
    else removeAndDispose(mesh);
    inst.body = null;

    spawnShards(ctx, pos);
    triggerShake(ctx.cameraShake, GLASS.SHAKE_AMPLITUDE, GLASS.SHAKE_DURATION);
    ctx.audio.play('shatter');
    scoreMischief(ctx, 'glass', pos);
  }

  function release() {
    inst.phase = 'falling';
    inst.body = addBody(ctx, {
      mesh,
      radius: GLASS.RADIUS,
      bottomOffset: GLASS.HEIGHT / 2,
      restitution: GLASS.RESTITUTION,
      friction: GLASS.FRICTION,
      frictionless: true, // meluncur bebas sampai jatuh dari tepi
      grounded: true, // masih di atas meja: belum dianggap benturan
      onImpact: () => shatter()
    });
    inst.body.vel.set(inst.dir.x * GLASS.RELEASE_SPEED, 0, inst.dir.z * GLASS.RELEASE_SPEED);
    inst.body.angVel.set(inst.dir.z * GLASS.TUMBLE_SPIN, 0, -inst.dir.x * GLASS.TUMBLE_SPIN);
  }

  registerMischief(ctx, inst, {
    label: 'Dorong gelas',
    position: mesh.position,
    surfaceY: spec.y,
    markerHeight: GLASS.HEIGHT / 2 + GLASS.MARKER_OFFSET,
    onInteract: (c) => {
      inst.done = true;
      inst.phase = 'pushing';
      inst.pushT = 0;
      inst.startPos.copy(mesh.position);
      inst.dir.copy(dirFromCat(c, mesh.position));
      startCatAction(c.cat, {
        type: 'pushGlass',
        duration: ACTION_DURATION,
        faceYaw: yawTowards(c.cat, mesh.position.x, mesh.position.z),
        pose: pushPose,
        events: [{ at: GLASS.PAW_DURATION + GLASS.STARE_DURATION, fn: release }]
      });
    }
  });

  inst.update = (c, dt) => {
    if (inst.phase === 'pushing') {
      // Geser pelan selama kaki mendorong
      inst.pushT += dt;
      const k = smoothstep(inst.pushT / GLASS.PAW_DURATION);
      mesh.position.set(
        inst.startPos.x + inst.dir.x * GLASS.PUSH_DISTANCE * k,
        inst.startPos.y,
        inst.startPos.z + inst.dir.z * GLASS.PUSH_DISTANCE * k
      );
    } else if (inst.phase === 'falling') {
      inst.fallT += dt;
      if (inst.fallT > GLASS.MAX_SLIDE_TIME) shatter(); // pengaman
    }
  };

  inst.dispose = (c) => {
    if (inst.body) removeBody(c, inst.body);
    removeAndDispose(mesh);
  };

  return inst;
}
