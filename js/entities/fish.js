// Ikan camilan (menggantikan kristal; GDD §11): muncul acak di lantai atau di
// atas perabot yang bisa dinaiki, melayang & berputar pelan. Dimakan otomatis
// saat disentuh (stamina +40), lalu muncul lagi setelah jeda.
import { FISH, PLAYER } from '../config.js';
import { findFreeFloorPosition } from '../systems/spawn.js';
import { createFishMesh } from './fishModel.js';

export function createFishPickup(scene) {
  const mesh = createFishMesh(FISH.MODEL_SCALE);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, active: false, respawnTimer: 0, clock: 0, baseY: 0 };
}

export function spawnFish(ctx) {
  const { fish, colliders } = ctx;
  const playerPos = ctx.cat.mesh.position;
  const climbables = colliders.filter((b) => b.climbable);
  let x;
  let z;
  let surface = 0;
  let placed = false;

  // Peluang muncul di atas perabot yang bisa dinaiki
  if (climbables.length > 0 && Math.random() < FISH.FURNITURE_SPAWN_CHANCE) {
    for (let attempts = 0; attempts < FISH.FURNITURE_SPAWN_ATTEMPTS && !placed; attempts++) {
      const box = climbables[Math.floor(Math.random() * climbables.length)];
      const pad = FISH.RADIUS + FISH.FURNITURE_EDGE_PAD;
      if (box.maxX - box.minX <= pad * 2 || box.maxZ - box.minZ <= pad * 2) continue;

      const cx = box.minX + pad + Math.random() * (box.maxX - box.minX - pad * 2);
      const cz = box.minZ + pad + Math.random() * (box.maxZ - box.minZ - pad * 2);

      // Jangan tumpang tindih dengan perabot lain yang lebih tinggi (mis. sandaran sofa)
      let blockedByHigher = false;
      for (const other of colliders) {
        if (other !== box && other.topHeight > box.topHeight) {
          if (
            cx >= other.minX - FISH.RADIUS && cx <= other.maxX + FISH.RADIUS &&
            cz >= other.minZ - FISH.RADIUS && cz <= other.maxZ + FISH.RADIUS
          ) {
            blockedByHigher = true;
            break;
          }
        }
      }
      if (!blockedByHigher && Math.hypot(cx - playerPos.x, cz - playerPos.z) >= FISH.MIN_PLAYER_DIST_FURNITURE) {
        x = cx;
        z = cz;
        surface = box.topHeight;
        placed = true;
      }
    }
  }

  if (!placed) {
    const pos = findFreeFloorPosition(colliders, playerPos, FISH.RADIUS, FISH.MIN_PLAYER_DIST_FLOOR);
    x = pos.x;
    z = pos.z;
    surface = 0;
  }

  fish.baseY = surface + FISH.HOVER_HEIGHT;
  fish.mesh.position.set(x, fish.baseY, z);
  fish.mesh.visible = true;
  fish.active = true;
}

export function hideFish(fish, respawnDelay) {
  fish.active = false;
  fish.mesh.visible = false;
  fish.respawnTimer = respawnDelay;
}

// Mengembalikan true jika ikan dimakan kucing pada frame ini.
export function updateFish(ctx, dt) {
  const { fish } = ctx;

  if (!fish.active) {
    fish.respawnTimer -= dt;
    if (fish.respawnTimer <= 0) spawnFish(ctx);
    return false;
  }

  fish.clock += dt;
  fish.mesh.rotation.y += FISH.SPIN_SPEED * dt;
  fish.mesh.position.y = fish.baseY + Math.sin(fish.clock * FISH.BOB_SPEED) * FISH.BOB_AMP;

  const p = ctx.cat.mesh.position;
  const dist = Math.hypot(
    p.x - fish.mesh.position.x,
    p.y + PLAYER.CENTER_HEIGHT - fish.mesh.position.y,
    p.z - fish.mesh.position.z
  );
  return dist < PLAYER.RADIUS + FISH.RADIUS;
}
