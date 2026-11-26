// Item koleksi (kristal/koin): spawn di lantai atau di atas perabot, berputar,
// dan tertarik ke kucing saat magnet aktif.
import * as THREE from 'three';
import { COIN, PLAYER, POWERUP, MATERIALS } from '../config.js';
import { findFreeFloorPosition } from '../systems/spawn.js';

export function createCoin(scene) {
  const geo = new THREE.CylinderGeometry(COIN.RADIUS, COIN.RADIUS, COIN.THICKNESS, COIN.SEGMENTS);
  const mat = new THREE.MeshStandardMaterial({ ...MATERIALS.coin });
  const coin = new THREE.Mesh(geo, mat);
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  scene.add(coin);
  return coin;
}

export function spawnCoin(ctx) {
  const { coin, colliders } = ctx;
  const playerPos = ctx.cat.mesh.position;
  const climbables = colliders.filter((b) => b.climbable);

  // Peluang koin muncul di atas perabot yang bisa dinaiki sebagai hadiah
  if (climbables.length > 0 && Math.random() < COIN.FURNITURE_SPAWN_CHANCE) {
    for (let attempts = 0; attempts < COIN.FURNITURE_SPAWN_ATTEMPTS; attempts++) {
      const box = climbables[Math.floor(Math.random() * climbables.length)];
      const pad = COIN.RADIUS + COIN.FURNITURE_EDGE_PAD;
      if (box.maxX - box.minX <= pad * 2 || box.maxZ - box.minZ <= pad * 2) continue;

      const x = box.minX + pad + Math.random() * (box.maxX - box.minX - pad * 2);
      const z = box.minZ + pad + Math.random() * (box.maxZ - box.minZ - pad * 2);

      // Pastikan tidak tumpang tindih dengan perabot lain yang lebih tinggi (misal sandaran sofa)
      let blockedByHigher = false;
      for (const other of colliders) {
        if (other !== box && other.topHeight > box.topHeight) {
          if (
            x >= other.minX - COIN.RADIUS && x <= other.maxX + COIN.RADIUS &&
            z >= other.minZ - COIN.RADIUS && z <= other.maxZ + COIN.RADIUS
          ) {
            blockedByHigher = true;
            break;
          }
        }
      }
      if (!blockedByHigher && Math.hypot(x - playerPos.x, z - playerPos.z) >= COIN.MIN_PLAYER_DIST_FURNITURE) {
        coin.position.set(x, box.topHeight + COIN.RADIUS + COIN.HOVER_HEIGHT, z);
        return;
      }
    }
  }

  const pos = findFreeFloorPosition(colliders, playerPos, COIN.RADIUS, COIN.MIN_PLAYER_DIST_FLOOR);
  coin.position.set(pos.x, COIN.RADIUS + COIN.HOVER_HEIGHT, pos.z);
}

// Mengembalikan true jika koin diambil kucing pada frame ini.
export function updateCoin(ctx, dt) {
  const { coin, state } = ctx;
  const playerPos = ctx.cat.mesh.position;

  coin.rotation.z += COIN.SPIN_SPEED * dt;

  if (state.magnetTimer > 0) {
    const dx = playerPos.x - coin.position.x;
    const dz = playerPos.z - coin.position.z;
    const distXZ = Math.hypot(dx, dz);
    if (distXZ > POWERUP.MAGNET_MIN_DIST && distXZ <= POWERUP.MAGNET_RADIUS) {
      const pull = Math.min(POWERUP.MAGNET_PULL_SPEED * dt, distXZ);
      coin.position.x += (dx / distXZ) * pull;
      coin.position.z += (dz / distXZ) * pull;
    }
  }

  const catCenterY = playerPos.y + PLAYER.CENTER_HEIGHT;
  const dist = Math.hypot(
    playerPos.x - coin.position.x,
    catCenterY - coin.position.y,
    playerPos.z - coin.position.z
  );

  return dist < PLAYER.RADIUS + COIN.RADIUS;
}
