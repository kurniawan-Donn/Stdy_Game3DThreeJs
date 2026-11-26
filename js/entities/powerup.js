// Power-up magnet: muncul berkala, saat diambil menarik koin ke kucing.
import * as THREE from 'three';
import { POWERUP, PLAYER, MATERIALS } from '../config.js';
import { findFreeFloorPosition } from '../systems/spawn.js';

export function createPowerUp(scene) {
  const geo = new THREE.OctahedronGeometry(POWERUP.SIZE, 0);
  const mat = new THREE.MeshStandardMaterial({ ...MATERIALS.powerUp });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

export function hidePowerUp(mesh) {
  mesh.visible = false;
}

function spawnPowerUp(ctx) {
  const pos = findFreeFloorPosition(
    ctx.colliders, ctx.cat.mesh.position, POWERUP.SPAWN_RADIUS, POWERUP.MIN_PLAYER_DIST
  );
  ctx.powerUp.position.set(pos.x, POWERUP.HOVER_Y, pos.z);
  ctx.powerUp.visible = true;
  ctx.state.powerUpActive = true;
}

export function updatePowerUp(ctx, dt) {
  const { state, hud, audio, powerUp } = ctx;
  const playerPos = ctx.cat.mesh.position;

  if (state.magnetTimer > 0) {
    state.magnetTimer -= dt;
    if (state.magnetTimer <= 0) {
      state.magnetTimer = 0;
      hud.hideMagnet();
    } else {
      hud.setMagnetTime(state.magnetTimer);
    }
  }

  if (state.powerUpActive) {
    powerUp.rotation.y += POWERUP.SPIN_Y * dt;
    powerUp.rotation.x += POWERUP.SPIN_X * dt;

    const dist = Math.hypot(
      playerPos.x - powerUp.position.x,
      (playerPos.y + PLAYER.CENTER_HEIGHT) - powerUp.position.y,
      playerPos.z - powerUp.position.z
    );

    if (dist < PLAYER.RADIUS + POWERUP.PICKUP_RADIUS) {
      state.powerUpActive = false;
      powerUp.visible = false;
      state.magnetTimer = POWERUP.MAGNET_DURATION;
      state.powerUpSpawnTimer = POWERUP.SPAWN_INTERVAL;
      hud.showMagnet();
      hud.setMagnetTime(state.magnetTimer);
      audio.playPowerUp();
    }
  } else if (state.magnetTimer <= 0) {
    state.powerUpSpawnTimer -= dt;
    if (state.powerUpSpawnTimer <= 0) {
      spawnPowerUp(ctx);
    }
  }
}
