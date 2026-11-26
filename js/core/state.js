// State permainan bersama (Chaos, combo, waktu, nyawa, timer). Data state
// kucing (kecepatan, grounded, animasi) ada di objek cat (entities/cat.js).
import { GAME, VACUUM, POWERUP, LEVELS } from '../config.js';

export function createState() {
  const state = { levelIndex: 0 };
  resetRunState(state);
  return state;
}

export function currentLevel(state) {
  return LEVELS[state.levelIndex];
}

// Reset nilai yang berlaku per sesi main.
export function resetRunState(state) {
  const level = currentLevel(state);
  state.chaos = 0;
  state.mischiefCount = 0; // jumlah kenakalan yang sudah dilakukan
  state.lastMischiefTime = -Infinity; // untuk combo
  state.starsReached = 0;
  state.timeLeft = level.DURATION;
  state.lives = GAME.MAX_LIVES;
  state.invulnerableTimer = 0;
  state.obstacleSpeed = VACUUM.BASE_SPEED;
  state.isGameOver = false; // true saat level berakhir (layar hasil tampil)
  // Magnet dinonaktifkan sejak Fase 2 (dihapus di Fase 5); field dipertahankan
  // agar entities/powerup.js tetap konsisten sampai dihapus.
  state.magnetTimer = 0;
  state.powerUpSpawnTimer = POWERUP.FIRST_SPAWN_DELAY;
  state.powerUpActive = false;
}
