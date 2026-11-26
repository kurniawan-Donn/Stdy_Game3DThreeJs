// Alur game: LOBI → PILIH LEVEL → MAIN → (PAUSE) → HASIL → LOBI.
// flow.state: 'lobby' | 'select' | 'playing' | 'paused' | 'results'
// - 'results' diatur oleh endLevel (systems/level.js).
// - Pause: tombol P, atau otomatis saat kunci mouse lepas ketika bermain.
import { GAME_FLOW } from '../config.js';
import { loadLevel, levelAt, highestUnlockedIndex, nextLevelIndex, isLevelUnlocked } from '../systems/levelManager.js';
import { releasePointerLock } from './input.js';

export function createFlow() {
  return { state: 'lobby', helpShown: false, resumeLock: false };
}

function setMode(ctx, mode) {
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('mode-lobby', mode === 'lobby');
    document.body.classList.toggle('mode-play', mode === 'play');
  }
}

function silence(ctx) {
  if (ctx.audio.murmur) ctx.audio.murmur(0);
}

export function enterLobby(ctx) {
  const flow = ctx.flow;
  flow.state = 'lobby';
  silence(ctx);
  releasePointerLock();
  ctx.results.hide();
  ctx.pause.hide();
  setMode(ctx, 'lobby');
  ctx.menus.showMain(ctx.save);
}

export function openLevelSelect(ctx) {
  ctx.flow.state = 'select';
  ctx.menus.showLevels(ctx.save);
}

// Mulai level ke-index (hanya jika sudah terbuka)
export function playLevel(ctx, index) {
  if (!isLevelUnlocked(ctx.save, index) || !levelAt(index)) return false;
  const flow = ctx.flow;
  loadLevel(ctx, index);
  flow.state = 'playing';
  ctx.menus.hideAll();
  ctx.results.hide();
  ctx.pause.hide();
  setMode(ctx, 'play');
  // Bantuan kontrol muncul otomatis di level pertama yang dimainkan
  if (!flow.helpShown) {
    flow.helpShown = true;
    ctx.help.showAuto();
  }
  return true;
}

// "Main" di lobi: lanjut ke level tertinggi yang terbuka
export function playContinue(ctx) {
  return playLevel(ctx, highestUnlockedIndex(ctx.save));
}

export function retryLevel(ctx) {
  return playLevel(ctx, ctx.state.levelIndex);
}

export function playNextLevel(ctx) {
  const n = nextLevelIndex(ctx.save, ctx.state.levelIndex);
  return n >= 0 ? playLevel(ctx, n) : false;
}

export function pauseGame(ctx) {
  const flow = ctx.flow;
  if (flow.state !== 'playing' || ctx.state.isGameOver) return false;
  flow.state = 'paused';
  flow.resumeLock = !!ctx.input.pointerLocked;
  silence(ctx);
  releasePointerLock();
  ctx.input.keys = {};
  ctx.pause.show(levelAt(ctx.state.levelIndex));
  return true;
}

export function resumeGame(ctx) {
  const flow = ctx.flow;
  if (flow.state !== 'paused') return false;
  flow.state = 'playing';
  ctx.pause.hide();
  ctx.input.keys = {};
  return true;
}

// Tombol P (dipanggil tiap frame sebelum update dunia)
export function updateFlowInput(ctx) {
  if (!ctx.input.pressed[GAME_FLOW.PAUSE_KEY]) return;
  if (ctx.flow.state === 'playing') pauseGame(ctx);
  else if (ctx.flow.state === 'paused') resumeGame(ctx);
}

// Kunci mouse lepas saat bermain (Esc, pindah jendela) → pause otomatis
export function onPointerLockChange(ctx, locked) {
  if (!locked && ctx.flow.state === 'playing' && !ctx.state.isGameOver) pauseGame(ctx);
}
