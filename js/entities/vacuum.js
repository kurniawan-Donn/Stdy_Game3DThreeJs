// Robot vacuum: berkeliaran di rumah (lurus, berbelok acak) dan bisa
// ditumpangi kucing. Tidak melukai kucing (sejak Fase 3).
import * as THREE from 'three';
import { VACUUM, MATERIALS, ROOM_HALF_W, ROOM_HALF_D } from '../config.js';
import { findFreeFloorPosition } from '../systems/spawn.js';

function createRobotVacuumMesh() {
  const R = VACUUM.RADIUS;
  const H = VACUUM.HEIGHT;
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 20),
    new THREE.MeshStandardMaterial({ ...MATERIALS.vacuumBody })
  );
  body.position.y = H / 2 + 0.005;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Aksen cincin merah di atas
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.72, R * 0.72, H * 0.15, 18),
    new THREE.MeshStandardMaterial({ ...MATERIALS.vacuumRing })
  );
  ring.position.y = H + H * 0.08;
  group.add(ring);

  // Sensor LiDAR & LED menyala
  const sensor = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.24, R * 0.27, H * 0.35, 12),
    new THREE.MeshStandardMaterial({ ...MATERIALS.vacuumSensor })
  );
  sensor.position.y = H + H * 0.2;
  group.add(sensor);

  return group;
}

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

export function spawnObstacle(ctx) {
  const pos = findFreeFloorPosition(ctx.colliders, ctx.cat.mesh.position, VACUUM.RADIUS, VACUUM.MIN_PLAYER_DIST);
  const mesh = createRobotVacuumMesh();
  mesh.position.set(pos.x, 0, pos.z);
  ctx.scene.add(mesh);

  ctx.obstacles.push({
    mesh,
    heading: Math.random() * Math.PI * 2, // arah jalan (yaw)
    turnTarget: null, // arah tujuan saat sedang berbelok
    wanderIn: randRange(VACUUM.WANDER_INTERVAL_MIN, VACUUM.WANDER_INTERVAL_MAX),
    vel: new THREE.Vector3(), // dipakai kucing yang menumpang
    rider: null
  });
}

export function clearObstacles(ctx) {
  for (const obs of ctx.obstacles) {
    ctx.scene.remove(obs.mesh);
  }
  ctx.obstacles.length = 0;
}

// Bebas untuk robot? Robot (tinggi 0,09 m) lewat di bawah perabot berkolong
// dan melewati pintu yang terbuka (collider setinggi 0).
function robotFree(colliders, x, z) {
  const r = VACUUM.RADIUS - VACUUM.WALL_CHECK_SHRINK;
  if (x < -ROOM_HALF_W + r || x > ROOM_HALF_W - r || z < -ROOM_HALF_D + r || z > ROOM_HALF_D - r) return false;
  for (const box of colliders) {
    if (box.topHeight <= VACUUM.HEIGHT * 0.2) continue;
    if (box.crawlHeight > VACUUM.HEIGHT) continue;
    const cx = Math.max(box.minX, Math.min(x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return false;
  }
  return true;
}

// Robot berkeliaran: jalan lurus, berbelok acak saat menabrak dan sesekali,
// sehingga lama-lama melewati pintu & pindah ruangan. Tidak melukai kucing;
// kucing bisa menumpang (entities/catBehavior.js).
export function updateObstacles(ctx, dt) {
  const { state, colliders, obstacles } = ctx;
  const speed = state.obstacleSpeed;
  const steps = speed * dt > VACUUM.SUBSTEP_THRESHOLD ? 2 : 1;
  const subDt = dt / steps;

  for (const obs of obstacles) {
    obs.wanderIn -= dt;
    if (obs.wanderIn <= 0 && obs.turnTarget === null) {
      obs.turnTarget = obs.heading + (Math.random() * 2 - 1) * VACUUM.WANDER_TURN;
      obs.wanderIn = randRange(VACUUM.WANDER_INTERVAL_MIN, VACUUM.WANDER_INTERVAL_MAX);
    }
    const pos = obs.mesh.position;
    const startX = pos.x;
    const startZ = pos.z;
    for (let s = 0; s < steps; s++) {
      if (obs.turnTarget !== null) {
        const diff = obs.turnTarget - obs.heading;
        const step = VACUUM.TURN_RATE * subDt;
        if (Math.abs(diff) <= step) {
          obs.heading = obs.turnTarget;
          obs.turnTarget = null;
        } else {
          obs.heading += Math.sign(diff) * step;
        }
      }
      const nx = pos.x + Math.sin(obs.heading) * speed * subDt;
      const nz = pos.z + Math.cos(obs.heading) * speed * subDt;
      if (robotFree(colliders, nx, nz)) {
        pos.x = nx;
        pos.z = nz;
      } else if (obs.turnTarget === null) {
        // Menabrak: berbelok ke arah acak
        const sign = Math.random() < 0.5 ? -1 : 1;
        obs.turnTarget = obs.heading + sign * randRange(VACUUM.BOUNCE_TURN_MIN, VACUUM.BOUNCE_TURN_MAX);
      }
    }
    obs.mesh.rotation.y += VACUUM.SPIN_SPEED * dt;
    obs.vel.set((pos.x - startX) / Math.max(dt, 1e-6), 0, (pos.z - startZ) / Math.max(dt, 1e-6));
  }
}
