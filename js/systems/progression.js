// Skor, nyawa, level, reset, dan game over.
import { COIN, GAME, PLAYER, VACUUM, STAMINA } from '../config.js';
import { resetRunState } from '../core/state.js';
import { resetCamera } from '../core/camera.js';
import { resetCat } from '../entities/cat.js';
import { spawnCoin } from '../entities/coin.js';
import { hidePowerUp } from '../entities/powerup.js';
import { spawnObstacle, clearObstacles } from '../entities/vacuum.js';
import { spawnCoinParticles, clearParticles } from '../entities/particles.js';
import { resetStamina } from './stamina.js';
import { resetMeow } from './meow.js';
import { clearNoise } from './noise.js';
import { hideInteraction } from './interaction.js';

// Dipanggil saat kucing mengambil koin.
export function onCoinCollected(ctx) {
  const { state, hud, audio } = ctx;
  state.score += COIN.SCORE;
  state.coinsCollected += 1;
  hud.setScore(state.score);

  audio.playCoin();
  spawnCoinParticles(ctx.particles, ctx.scene, ctx.coin.position);

  if (state.coinsCollected % COIN.COINS_PER_LEVEL === 0) {
    state.level += 1;
    state.obstacleSpeed += VACUUM.SPEED_PER_LEVEL;
    hud.setLevel(state.level);
    spawnObstacle(ctx);
  }

  spawnCoin(ctx);
}

// Dipanggil saat kucing tertabrak robot vacuum.
export function handlePlayerDamage(ctx) {
  const { state, hud, audio, cat } = ctx;
  state.lives -= 1;
  hud.setLives(state.lives);

  if (state.lives <= 0) {
    audio.playGameOver();
    triggerGameOver(ctx);
    return;
  }

  audio.playHit();
  state.invulnerableTimer = GAME.INVULNERABLE_DURATION;
  cat.vel.y = PLAYER.HIT_BOUNCE_VELOCITY;
  cat.isGrounded = false;
}

export function triggerGameOver(ctx) {
  const { state, cat, gameOver } = ctx;
  if (state.isGameOver) return;
  state.isGameOver = true;
  cat.mesh.visible = true;

  if (state.score > state.highScore) {
    state.highScore = state.score;
  }

  hideInteraction(ctx);
  gameOver.show(state.score, state.highScore);
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
  hud.setStamina(ctx.stamina.value, STAMINA.MAX, false);
  hud.setMeowCooldown(0);

  hidePowerUp(ctx.powerUp);
  hud.hideMagnet();

  clearObstacles(ctx);
  clearParticles(ctx.particles, ctx.scene);

  hud.setLevel(1);
  for (let i = 0; i < VACUUM.INITIAL_COUNT; i++) {
    spawnObstacle(ctx);
  }
  spawnCoin(ctx);

  resetCamera(camera, cat.mesh.position);

  hud.setScore(0);
  hud.setLives(state.lives);
  ctx.gameOver.hide();
}
