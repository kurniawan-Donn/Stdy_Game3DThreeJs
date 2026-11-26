// State permainan bersama (skor, nyawa, level, timer). Data state kucing
// (kecepatan, grounded, animasi) ada di objek cat (entities/cat.js).
import { GAME, VACUUM, POWERUP } from '../config.js';

export function createState() {
  const state = { highScore: 0 };
  resetRunState(state);
  return state;
}

// Reset nilai yang berlaku per sesi main (highScore dipertahankan).
export function resetRunState(state) {
  state.score = 0;
  state.coinsCollected = 0;
  state.level = 1;
  state.lives = GAME.MAX_LIVES;
  state.invulnerableTimer = 0;
  state.magnetTimer = 0;
  state.powerUpSpawnTimer = POWERUP.FIRST_SPAWN_DELAY;
  state.powerUpActive = false;
  state.obstacleSpeed = VACUUM.BASE_SPEED;
  state.isGameOver = false;
}
