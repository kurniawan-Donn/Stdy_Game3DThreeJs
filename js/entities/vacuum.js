// Robot vacuum: berkeliaran di rumah (lurus, berbelok acak) dan bisa
// ditumpangi kucing. Tidak melukai kucing (sejak Fase 3).
import * as THREE from 'three';
import { VACUUM, MATERIALS, ROOM_HALF_W, ROOM_HALF_D, PLAYER } from '../config.js';
import { findFreeFloorPosition } from '../systems/spawn.js';
import { removeAndDispose } from '../core/dispose.js';

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
    rider: null,
    yield: null // menyingkir saat pemilik mengejar: { dir, done, resumeIn }
  });
}

export function clearObstacles(ctx) {
  for (const obs of ctx.obstacles) {
    removeAndDispose(obs.mesh);
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

// Kucing di lantai (tidak sedang menumpang/di atas perabot) menghalangi robot:
// robot berbelok sebelum menabraknya alih-alih mendorongnya.
function hitsCat(ctx, obs, x, z) {
  const cat = ctx.cat;
  if (!cat || cat.riding === obs || cat.mesh.position.y > VACUUM.BLOCK_HEIGHT) return false;
  const r = VACUUM.RADIUS + PLAYER.RADIUS + VACUUM.CAT_AVOID_MARGIN;
  const p = cat.mesh.position;
  const dNew = (x - p.x) ** 2 + (z - p.z) ** 2;
  const dOld = (obs.mesh.position.x - p.x) ** 2 + (obs.mesh.position.z - p.z) ** 2;
  return dNew < r * r && dNew < dOld; // hanya saat makin mendekat (tidak terkunci)
}

// Jarak bebas ke samping (sampai YIELD_PROBE) dari posisi robot ke arah dir
function sideClearance(colliders, x, z, dir) {
  const step = 0.05;
  for (let d = step; d <= VACUUM.YIELD_PROBE; d += step) {
    if (!robotFree(colliders, x + Math.sin(dir) * d, z + Math.cos(dir) * d)) return d - step;
  }
  return Infinity;
}

// Pemilik sedang mengejar dekat robot ini?
function chaseNear(ctx, obs) {
  const o = ctx.owner;
  if (!o || o.state !== 'chase' || ctx.cat.riding === obs) return false;
  const p = obs.mesh.position;
  const r2 = VACUUM.YIELD_RADIUS ** 2;
  const c = ctx.cat.mesh.position;
  const q = o.mesh.position;
  return (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < r2 || (p.x - q.x) ** 2 + (p.z - q.z) ** 2 < r2;
}

// Menyingkir: robot bergerak menyamping ke dinding terdekat (sisi lorong) lalu
// diam. Di ruang terbuka tanpa dinding dekat, robot cukup berhenti.
// Mengembalikan true selama robot sedang menyingkir/diam.
function updateYield(ctx, obs, dt) {
  const pos = obs.mesh.position;
  if (chaseNear(ctx, obs)) {
    if (!obs.yield) {
      const left = obs.heading + Math.PI / 2;
      const right = obs.heading - Math.PI / 2;
      const cl = sideClearance(ctx.colliders, pos.x, pos.z, left);
      const cr = sideClearance(ctx.colliders, pos.x, pos.z, right);
      const dir = Math.min(cl, cr) === Infinity ? null : cl <= cr ? left : right;
      obs.yield = { dir, done: dir === null, resumeIn: VACUUM.YIELD_RESUME_DELAY };
      obs.turnTarget = null;
    }
    obs.yield.resumeIn = VACUUM.YIELD_RESUME_DELAY;
  } else if (obs.yield) {
    obs.yield.resumeIn -= dt;
    if (obs.yield.resumeIn <= 0) {
      obs.yield = null;
      return false;
    }
  } else {
    return false;
  }
  const y = obs.yield;
  if (!y.done) {
    const d = VACUUM.YIELD_SPEED * dt;
    const nx = pos.x + Math.sin(y.dir) * d;
    const nz = pos.z + Math.cos(y.dir) * d;
    const gx = nx + Math.sin(y.dir) * VACUUM.YIELD_WALL_GAP;
    const gz = nz + Math.cos(y.dir) * VACUUM.YIELD_WALL_GAP;
    if (robotFree(ctx.colliders, gx, gz) && !hitsCat(ctx, obs, nx, nz)) {
      pos.x = nx;
      pos.z = nz;
    } else {
      y.done = true;
    }
  }
  return true;
}

// Robot berkeliaran: jalan lurus, berbelok acak saat menabrak dan sesekali,
// sehingga lama-lama melewati pintu & pindah ruangan. Tidak melukai kucing;
// kucing bisa menumpang (entities/catBehavior.js). Saat pemilik mengejar,
// robot di dekatnya menyingkir agar jalur kabur tidak tertutup.
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
    const yielding = updateYield(ctx, obs, dt);
    for (let s = 0; s < steps && !yielding; s++) {
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
      if (robotFree(colliders, nx, nz) && !hitsCat(ctx, obs, nx, nz)) {
        pos.x = nx;
        pos.z = nz;
      } else if (obs.turnTarget === null) {
        // Menabrak: berbelok ke arah acak
        const sign = Math.random() < 0.5 ? -1 : 1;
        obs.turnTarget = obs.heading + sign * randRange(VACUUM.BOUNCE_TURN_MIN, VACUUM.BOUNCE_TURN_MAX);
      }
    }
    if (!yielding || !obs.yield.done) obs.mesh.rotation.y += VACUUM.SPIN_SPEED * dt;
    obs.vel.set((pos.x - startX) / Math.max(dt, 1e-6), 0, (pos.z - startZ) / Math.max(dt, 1e-6));
  }
}
