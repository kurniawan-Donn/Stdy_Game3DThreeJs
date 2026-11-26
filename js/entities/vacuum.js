// Rintangan robot vacuum: bergerak bolak-balik di satu sumbu, memantul dari
// dinding/perabot, dan melukai kucing saat bersentuhan.
import * as THREE from 'three';
import { VACUUM, PLAYER, MATERIALS } from '../config.js';
import { isPositionFree } from '../systems/collision.js';
import { findFreeFloorPosition } from '../systems/spawn.js';

function createRobotVacuumMesh() {
  const R = VACUUM.RADIUS;
  const H = VACUUM.HEIGHT;
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 20),
    new THREE.MeshStandardMaterial({ ...MATERIALS.vacuumBody })
  );
  body.position.y = H / 2 + 0.02;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Aksen cincin merah di atas
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.72, R * 0.72, 0.04, 18),
    new THREE.MeshStandardMaterial({ ...MATERIALS.vacuumRing })
  );
  ring.position.y = H + 0.03;
  group.add(ring);

  // Sensor LiDAR & LED menyala
  const sensor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.09, 12),
    new THREE.MeshStandardMaterial({ ...MATERIALS.vacuumSensor })
  );
  sensor.position.y = H + 0.08;
  group.add(sensor);

  return group;
}

export function spawnObstacle(ctx) {
  const pos = findFreeFloorPosition(ctx.colliders, ctx.cat.mesh.position, VACUUM.RADIUS, VACUUM.MIN_PLAYER_DIST);
  const mesh = createRobotVacuumMesh();
  mesh.position.set(pos.x, 0, pos.z);
  ctx.scene.add(mesh);

  const axis = Math.random() < 0.5 ? 'x' : 'z';
  ctx.obstacles.push({
    mesh,
    axis,
    dir: Math.random() < 0.5 ? 1 : -1
  });
}

export function clearObstacles(ctx) {
  for (const obs of ctx.obstacles) {
    ctx.scene.remove(obs.mesh);
  }
  ctx.obstacles.length = 0;
}

// Mengembalikan true jika kucing tertabrak pada frame ini
// (sisa update robot di frame itu dihentikan, sama seperti versi awal).
export function updateObstacles(ctx, dt) {
  const { state, colliders, obstacles } = ctx;
  const playerPos = ctx.cat.mesh.position;
  const speed = state.obstacleSpeed;
  const steps = speed * dt > VACUUM.SUBSTEP_THRESHOLD ? 2 : 1;
  const subDt = dt / steps;

  for (let s = 0; s < steps; s++) {
    for (const obs of obstacles) {
      const pos = obs.mesh.position;
      const prevVal = pos[obs.axis];
      pos[obs.axis] += obs.dir * speed * subDt;
      obs.mesh.rotation.y += VACUUM.SPIN_SPEED * subDt;

      if (!isPositionFree(colliders, pos.x, pos.z, VACUUM.RADIUS - VACUUM.WALL_CHECK_SHRINK)) {
        pos[obs.axis] = prevVal;
        obs.dir *= -1;
      }

      if (state.invulnerableTimer > 0) continue;

      const dx = playerPos.x - pos.x;
      const dz = playerPos.z - pos.z;
      const dy = playerPos.y - 0; // Robot vacuum selalu di lantai (y = 0..HEIGHT)
      const hitDist = PLAYER.RADIUS + VACUUM.RADIUS - VACUUM.HIT_SHRINK;
      if (
        dy < VACUUM.HEIGHT + VACUUM.HIT_HEIGHT_MARGIN &&
        dx * dx + dz * dz < hitDist * hitDist
      ) {
        return true;
      }
    }
  }
  return false;
}
