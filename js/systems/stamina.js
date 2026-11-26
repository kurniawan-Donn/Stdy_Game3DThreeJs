// Stamina kucing (GDD §6): terkuras saat lari & lompat tinggi, pulih saat
// jalan/diam. Saat habis, kucing terengah: tidak bisa lari / lompat tinggi.
import { STAMINA } from '../config.js';

export function createStamina() {
  const s = {};
  resetStamina(s);
  return s;
}

export function resetStamina(s) {
  s.value = STAMINA.MAX;
  s.exhaustedTimer = 0;
  s.justExhausted = false; // ditandai true pada frame stamina habis
}

export function isExhausted(s) {
  return s.exhaustedTimer > 0;
}

export function canRun(s) {
  return !isExhausted(s) && s.value > 0;
}

function exhaust(s) {
  s.value = 0;
  s.exhaustedTimer = STAMINA.EXHAUSTED_DURATION;
  s.justExhausted = true;
}

// Mengembalikan true jika lompat tinggi boleh dilakukan (dan stamina dipotong).
export function trySpendHighJump(s) {
  if (isExhausted(s) || s.value < STAMINA.HIGH_JUMP_COST) return false;
  s.value -= STAMINA.HIGH_JUMP_COST;
  if (s.value <= 0) exhaust(s);
  return true;
}

export function updateStamina(s, dt, { running, grounded }) {
  if (s.exhaustedTimer > 0) {
    s.exhaustedTimer = Math.max(0, s.exhaustedTimer - dt);
  }

  if (running) {
    s.value -= STAMINA.RUN_DRAIN_PER_SEC * dt;
    if (s.value <= 0) exhaust(s);
  } else if (grounded) {
    s.value = Math.min(STAMINA.MAX, s.value + STAMINA.REGEN_PER_SEC * dt);
  }
}
