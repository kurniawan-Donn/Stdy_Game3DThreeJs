// State permainan bersama (Chaos, combo, waktu, nyawa, timer). Data state
// kucing (kecepatan, grounded, animasi) ada di objek cat (entities/cat.js).
import { GAME, VACUUM } from '../config.js';
import { LEVELS } from '../levels/index.js';

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
  state.recentChaos = []; // [{x, z, t}] posisi & waktu kekacauan (kucing tidur di dekatnya dicurigai)
  state.starsReached = 0;
  state.timeLeft = level.DURATION;
  state.lives = GAME.MAX_LIVES;
  state.invulnerableTimer = 0;
  state.obstacleSpeed = VACUUM.BASE_SPEED;
  state.isGameOver = false; // true saat level berakhir (layar hasil tampil)
}
