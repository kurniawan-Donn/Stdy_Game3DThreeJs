// Gerak & navigasi NPC (pemilik, tamu, rutinitas bersih-bersih): berbelok,
// berjalan mengikuti jalur A*, menoleh ke titik. Bekerja pada objek NPC apa pun
// ({ mesh, yaw, headYaw, path, pathGoal, replanT, walkPhase, pose }).
import { OWNER, NAV, OWNER_ANIM } from '../../config.js';
import { findPath } from '../../systems/navGrid.js';

const HEAD_MAX = (OWNER.HEAD_MAX_YAW_DEG * Math.PI) / 180;

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function turnTowards(o, targetYaw, dt) {
  const diff = wrapAngle(targetYaw - o.yaw);
  o.yaw += diff * Math.min(1, OWNER.TURN_SPEED * dt);
  o.mesh.rotation.y = o.yaw;
}

export function yawTo(o, x, z) {
  return Math.atan2(x - o.mesh.position.x, z - o.mesh.position.z);
}

export function clearPath(o) {
  o.path = null;
  o.pathGoal = null;
}

// Berjalan mengikuti jalur A* ke target. Mengembalikan true jika sudah sampai.
export function walkTo(ctx, o, target, speed, dt, replan = false) {
  const pos = o.mesh.position;
  o.replanT -= dt;
  const goalMoved = !o.pathGoal || Math.hypot(o.pathGoal.x - target.x, o.pathGoal.z - target.z) > 0.3;
  if (!o.path || (goalMoved && (!replan || o.replanT <= 0))) {
    o.path = findPath(ctx.nav, pos.x, pos.z, target.x, target.z) || [];
    o.pathGoal = { x: target.x, z: target.z };
    o.replanT = NAV.REPLAN_INTERVAL;
  }
  return followPath(o, speed, dt);
}

export function followPath(o, speed, dt) {
  const pos = o.mesh.position;
  let step = speed * dt;
  while (o.path.length && step > 0) {
    const wp = o.path[0];
    const dx = wp.x - pos.x;
    const dz = wp.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= NAV.ARRIVE_DIST) {
      o.path.shift();
      continue;
    }
    const move = Math.min(step, d);
    pos.x += (dx / d) * move;
    pos.z += (dz / d) * move;
    o.walkPhase += move * OWNER_ANIM.WALK_STRIDE;
    step -= move;
    turnTowards(o, Math.atan2(dx, dz), dt);
    o.pose = speed > OWNER.INVESTIGATE_SPEED ? 'run' : 'walk';
    break;
  }
  return o.path.length === 0;
}

export function lookAt(o, point, dt, turnBody) {
  if (!point) return;
  const target = yawTo(o, point.x, point.z);
  if (turnBody) turnTowards(o, target, dt);
  const rel = Math.max(-HEAD_MAX, Math.min(HEAD_MAX, wrapAngle(target - o.yaw)));
  o.headYaw += (rel - o.headYaw) * Math.min(1, OWNER.HEAD_TURN_SPEED * dt);
}
