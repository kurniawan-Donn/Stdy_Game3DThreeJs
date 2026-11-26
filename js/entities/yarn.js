// Bola benang (pengalih): E = tendang ke arah hadap kucing. Bola menggelinding
// dengan fisika yang ada dan memancarkan noise kecil saat berhenti, sehingga
// pemilik datang menyelidiki titik itu.
import * as THREE from 'three';
import { YARN, MATERIALS } from '../config.js';
import { registerInteractable } from '../systems/interaction.js';
import { addBody } from '../systems/physics.js';
import { emitNoise } from '../systems/noise.js';
import { startCatAction, yawTowards } from './cat.js';
import { swipePose } from './mischief/common.js';

function buildYarnMesh() {
  const group = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(YARN.RADIUS, 14, 10), new THREE.MeshStandardMaterial({ ...MATERIALS.yarn }));
  ball.castShadow = true;
  group.add(ball);
  // Lilitan benang
  const strandMat = new THREE.MeshStandardMaterial({ ...MATERIALS.yarnStrand });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(YARN.RADIUS * 1.01, YARN.RADIUS * 0.08, 6, 20), strandMat);
    ring.rotation.set(i * 1.1, i * 0.7, 0);
    group.add(ring);
  }
  return group;
}

export function createYarnBalls(ctx) {
  const balls = [];
  for (const spec of YARN.POSITIONS) {
    const mesh = buildYarnMesh();
    mesh.position.set(spec.x, YARN.RADIUS, spec.z);
    const body = addBody(ctx, {
      mesh,
      radius: YARN.RADIUS,
      bottomOffset: YARN.RADIUS,
      restitution: YARN.RESTITUTION,
      friction: YARN.FRICTION,
      grounded: true
    });
    body.sleeping = true;
    const ball = { mesh, body, cooldown: 0, rolling: false, rollFrom: new THREE.Vector3(), unregister: null };
    ball.unregister = registerInteractable(ctx.interaction, {
      label: 'Tendang',
      position: mesh.position,
      markerHeight: YARN.MARKER_HEIGHT,
      isEnabled: () => ball.cooldown <= 0,
      onInteract: (c) => kick(c, ball)
    });
    balls.push(ball);
  }
  return balls;
}

export function disposeYarnBalls(ctx) {
  for (const ball of ctx.yarnBalls || []) {
    if (ball.unregister) ball.unregister();
    if (ball.mesh.parent) ball.mesh.parent.remove(ball.mesh);
    const i = ctx.physics.bodies.indexOf(ball.body);
    if (i >= 0) ctx.physics.bodies.splice(i, 1);
  }
  ctx.yarnBalls = [];
}

function kick(ctx, ball) {
  const cat = ctx.cat;
  ball.cooldown = YARN.COOLDOWN;
  startCatAction(cat, {
    type: 'kick',
    duration: YARN.ACTION_DURATION,
    faceYaw: yawTowards(cat, ball.mesh.position.x, ball.mesh.position.z),
    pose: swipePose(YARN.HIT_AT),
    events: [{
      at: YARN.HIT_AT,
      fn: () => {
        const dx = ball.mesh.position.x - cat.mesh.position.x;
        const dz = ball.mesh.position.z - cat.mesh.position.z;
        const d = Math.hypot(dx, dz) || 1;
        const b = ball.body;
        b.sleeping = false;
        b.grounded = false;
        b.vel.set((dx / d) * YARN.KICK_SPEED, YARN.KICK_UP, (dz / d) * YARN.KICK_SPEED);
        ball.rolling = true;
        ball.rollFrom.copy(ball.mesh.position);
        ctx.audio.play('kick');
      }
    }]
  });
}

export function updateYarnBalls(ctx, dt) {
  for (const ball of ctx.yarnBalls || []) {
    if (ball.cooldown > 0) ball.cooldown -= dt;
    const b = ball.body;
    if (!b.sleeping) {
      // Putaran menggelinding sesuai kecepatan (berhenti berputar saat hampir diam)
      const speed = Math.hypot(b.vel.x, b.vel.z);
      if (speed > YARN.SPIN_MIN_SPEED) b.angVel.set(b.vel.z / YARN.RADIUS, 0, -b.vel.x / YARN.RADIUS);
      else b.angVel.set(0, 0, 0);
    }
    if (ball.rolling && b.sleeping) {
      ball.rolling = false;
      const p = ball.mesh.position;
      if (p.distanceTo(ball.rollFrom) >= YARN.MIN_ROLL_DIST) {
        emitNoise(ctx, { x: p.x, z: p.z, radius: YARN.NOISE_RADIUS, source: 'yarn' });
        ctx.audio.play('yarnStop');
      }
    }
  }
}
