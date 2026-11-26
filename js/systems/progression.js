// Camilan dan reset level. (Nyawa berkurang lewat systems/capture.js.)
// (Skor & kenaikan level berbasis koin dihapus di Fase 2; diganti Chaos.)
import { VACUUM, STAMINA, FISH } from '../config.js';
import { resetRunState, currentLevel } from '../core/state.js';
import { resetCamera } from '../core/camera.js';
import { resetCat } from '../entities/cat.js';
import { spawnFish, hideFish } from '../entities/fish.js';
import { spawnObstacle, clearObstacles } from '../entities/vacuum.js';
import { spawnPickupParticles, clearParticles } from '../entities/particles.js';
import { resetMischief } from '../entities/mischief/index.js';
import { resetStamina } from './stamina.js';
import { resetMeow } from './meow.js';
import { clearNoise } from './noise.js';
import { hideInteraction } from './interaction.js';
import { clearBodies } from './physics.js';
import { resetCapture } from './capture.js';
import { resetCameraOcclusion } from './cameraOcclusion.js';
import { resetOwner } from '../entities/owner/index.js';
import { resetDoor } from '../world/house.js';
import { createHideBoxes, disposeHideBoxes } from '../entities/hideBox.js';
import { createYarnBalls, disposeYarnBalls } from '../entities/yarn.js';
import { resetCatnip } from '../entities/catnip.js';
import { createNavGrid } from './navGrid.js';

// Dipanggil saat kucing memakan ikan camilan.
export function onFishEaten(ctx) {
  const { stamina, fish, audio } = ctx;
  stamina.value = Math.min(STAMINA.MAX, stamina.value + STAMINA.FISH_RESTORE);
  audio.play('fishEat');
  spawnPickupParticles(ctx.particles, ctx.scene, fish.mesh.position);
  hideFish(fish, FISH.RESPAWN_DELAY);
}

export function resetGame(ctx) {
  const { state, cat, hud } = ctx;
  resetRunState(state);
  resetCat(cat);
  ctx.time = 0;
  resetStamina(ctx.stamina);
  resetMeow(ctx.meow);
  clearNoise(ctx.noise);
  hideInteraction(ctx);
  ctx.floatText.clear();

  clearObstacles(ctx);
  clearParticles(ctx.particles, ctx.scene);
  clearBodies(ctx);
  resetMischief(ctx);
  resetCapture(ctx);
  // Alat stealth & mainan: kardus, bola benang, catnip
  disposeHideBoxes(ctx);
  ctx.hideBoxes = createHideBoxes(ctx);
  disposeYarnBalls(ctx);
  ctx.yarnBalls = createYarnBalls(ctx);
  resetCatnip(ctx);
  ctx.nav = createNavGrid(ctx.colliders); // kardus ikut menghalangi jalur pemilik
  resetDoor(ctx.door);
  resetOwner(ctx);

  for (let i = 0; i < VACUUM.INITIAL_COUNT; i++) {
    spawnObstacle(ctx);
  }
  spawnFish(ctx);

  resetCamera(ctx);
  resetCameraOcclusion(ctx);

  const level = currentLevel(state);
  hud.setLevel(level.id);
  hud.setTimer(state.timeLeft);
  hud.setChaos(0, level.TARGET_CHAOS);
  hud.setCombo(0);
  hud.setLives(state.lives);
  hud.setStamina(ctx.stamina.value, STAMINA.MAX, false);
  hud.setMeowCooldown(0);
  hud.setHideStatus('');
  ctx.results.hide();
}
