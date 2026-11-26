// Nyawa, camilan, dan reset level.
// (Skor & kenaikan level berbasis koin dihapus di Fase 2; diganti Chaos.)
import { GAME, PLAYER, VACUUM, STAMINA, FISH } from '../config.js';
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
import { endLevel } from './level.js';

// Dipanggil saat kucing memakan ikan camilan.
export function onFishEaten(ctx) {
  const { stamina, fish, audio } = ctx;
  stamina.value = Math.min(STAMINA.MAX, stamina.value + STAMINA.FISH_RESTORE);
  audio.play('fishEat');
  spawnPickupParticles(ctx.particles, ctx.scene, fish.mesh.position);
  hideFish(fish, FISH.RESPAWN_DELAY);
}

// Dipanggil saat kucing tertabrak robot vacuum (sampai Fase 6).
export function handlePlayerDamage(ctx) {
  const { state, hud, audio, cat } = ctx;
  state.lives -= 1;
  hud.setLives(state.lives);

  if (state.lives <= 0) {
    endLevel(ctx, 'outOfLives');
    return;
  }

  audio.playHit();
  state.invulnerableTimer = GAME.INVULNERABLE_DURATION;
  cat.vel.y = PLAYER.HIT_BOUNCE_VELOCITY;
  cat.isGrounded = false;
}

export function resetGame(ctx) {
  const { state, cat, hud, camera } = ctx;
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

  for (let i = 0; i < VACUUM.INITIAL_COUNT; i++) {
    spawnObstacle(ctx);
  }
  spawnFish(ctx);

  resetCamera(camera, cat.mesh.position, ctx.cameraShake);

  const level = currentLevel(state);
  hud.setLevel(level.id);
  hud.setTimer(state.timeLeft);
  hud.setChaos(0, level.TARGET_CHAOS);
  hud.setCombo(0);
  hud.setLives(state.lives);
  hud.setStamina(ctx.stamina.value, STAMINA.MAX, false);
  hud.setMeowCooldown(0);
  ctx.results.hide();
}
