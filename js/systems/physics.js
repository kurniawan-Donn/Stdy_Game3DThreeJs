// Fisika benda sederhana buatan sendiri (tanpa library):
// gravitasi, pantulan kecil, gesekan permukaan, spin visual, tertahan dinding
// & sisi perabot, dan mendarat di lantai atau atas perabot.
//
// Body = {
//   mesh, vel: Vector3, angVel: Vector3,
//   radius,          // radius horizontal untuk tabrakan
//   bottomOffset,    // jarak dari origin mesh ke titik bawah benda
//   restitution, friction,
//   frictionless?,   // true: tanpa gesekan sampai benda melayang (dorongan gelas)
//   life?, fade?, material?,  // opsional: benda hilang perlahan setelah life detik
//   onImpact?(body, impactSpeed, ctx),
//   noClaim?,        // bukan bagian kekacauan (kardus dilempar): tidak dibereskan/disedot
//   grounded, sleeping, airborneTime
// }
import * as THREE from 'three';
import { PHYSICS, BODY_PHYSICS } from '../config.js';
import { resolveCircleCollisions, getGroundHeight } from './collision.js';
import { removeAndDispose, disposeObject3D } from '../core/dispose.js';

export function createPhysicsWorld() {
  return { bodies: [] };
}

export function addBody(ctx, opts) {
  const body = {
    vel: new THREE.Vector3(),
    angVel: new THREE.Vector3(),
    restitution: 0.2,
    friction: 6,
    grounded: false,
    sleeping: false,
    frictionless: false,
    airborneTime: 0,
    bornAt: ctx.time || 0, // waktu dibuat (Level Bonus: benda milik kekacauan mana)
    ...opts
  };
  if (!body.mesh.parent) ctx.scene.add(body.mesh);
  if (body.material) body.baseOpacity = body.material.opacity;
  ctx.physics.bodies.push(body);
  return body;
}

export function removeBody(ctx, body) {
  const i = ctx.physics.bodies.indexOf(body);
  if (i >= 0) ctx.physics.bodies.splice(i, 1);
  if (body.mesh.parent) body.mesh.parent.remove(body.mesh);
}

export function clearBodies(ctx) {
  for (const b of ctx.physics.bodies) removeAndDispose(b.mesh);
  ctx.physics.bodies.length = 0;
}

export function updatePhysics(ctx, dt) {
  const bodies = ctx.physics.bodies;
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];

    // Umur & memudar
    if (b.life !== undefined) {
      b.life -= dt;
      if (b.life <= 0) {
        removeBody(ctx, b);
        disposeObject3D(b.mesh); // serpihan yang habis umurnya
        continue;
      }
      if (b.fade && b.material && b.life < b.fade) {
        b.material.opacity = b.baseOpacity * (b.life / b.fade);
      }
    }

    if (b.sleeping) continue;
    stepBody(ctx, b, dt);
  }
}

function stepBody(ctx, b, dt) {
  const pos = b.mesh.position;
  const prevBottom = pos.y - b.bottomOffset;

  b.vel.y += PHYSICS.GRAVITY * dt;
  pos.addScaledVector(b.vel, dt);
  b.mesh.rotation.x += b.angVel.x * dt;
  b.mesh.rotation.y += b.angVel.y * dt;
  b.mesh.rotation.z += b.angVel.z * dt;

  const bottom = pos.y - b.bottomOffset;
  resolveCircleCollisions(pos, b.vel, ctx.colliders, b.radius, bottom);

  const ground = getGroundHeight(ctx.colliders, pos.x, pos.z, Math.max(prevBottom, bottom));

  if (bottom <= ground && b.vel.y <= 0) {
    pos.y = ground + b.bottomOffset;
    const impactSpeed = -b.vel.y;
    const wasGrounded = b.grounded;

    if (impactSpeed > BODY_PHYSICS.BOUNCE_MIN_SPEED) {
      b.vel.y = impactSpeed * b.restitution;
      b.grounded = false;
    } else {
      b.vel.y = 0;
      b.grounded = true;
    }

    if (!wasGrounded && b.onImpact && impactSpeed > 0.01) {
      b.onImpact(b, impactSpeed, ctx);
    }

    // Gesekan permukaan (kecuali sedang didorong tanpa gesekan)
    if (!b.frictionless) {
      const damp = Math.exp(-b.friction * dt);
      b.vel.x *= damp;
      b.vel.z *= damp;
      b.angVel.multiplyScalar(Math.exp(-BODY_PHYSICS.ANGULAR_DAMPING * dt));
    }
    b.airborneTime = 0;

    if (
      b.grounded &&
      Math.hypot(b.vel.x, b.vel.z) < BODY_PHYSICS.SLEEP_SPEED &&
      b.angVel.lengthSq() < BODY_PHYSICS.SLEEP_SPEED
    ) {
      b.vel.set(0, 0, 0);
      b.angVel.set(0, 0, 0);
      b.sleeping = true;
    }
  } else {
    b.grounded = false;
    b.frictionless = false; // dorongan selesai begitu benda lepas dari permukaan
    b.airborneTime += dt;
  }
}
