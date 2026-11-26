// Latihan (Level 0, GDD §15): langkah bertahap dengan petunjuk di layar.
//   1 Gerak · 2 Lompat · 3 Naik ke meja · 4 Jatuhkan gelas ·
//   5 Sembunyi di kardus (pemilik lewat) · 6 Ditangkap sekali (nyawa tetap)
// Teks langkah ada di levels/level0.js, angka di TUTORIAL (config.js).
// Pemilik dikendalikan naskah: di luar layar → patroli → mengejar.
// updateTutorial mengembalikan 'done' satu kali saat latihan selesai.
import * as THREE from 'three';
import { TUTORIAL as T, FURNITURE_LAYOUT, MISCHIEF_LAYOUT, HIDE_BOX } from '../config.js';
import { currentLevel } from '../core/state.js';
import { removeAndDispose } from '../core/dispose.js';
import { ownerGoOffstage, ownerStartPatrol, ownerStartChase } from '../entities/owner/index.js';

export function isTutorial(ctx) {
  return !!currentLevel(ctx.state).TUTORIAL;
}

function createMarker() {
  const M = T.MARKER;
  const geo = new THREE.ConeGeometry(M.RADIUS, M.LENGTH, 12);
  geo.rotateX(Math.PI); // ujung menunjuk ke bawah
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: M.COLOR }));
  mesh.visible = false;
  return mesh;
}

export function resetTutorial(ctx) {
  if (ctx.tutorial && ctx.tutorial.marker) removeAndDispose(ctx.tutorial.marker);
  if (!isTutorial(ctx)) {
    ctx.tutorial = null;
    if (ctx.tutorialUi) ctx.tutorialUi.hide();
    return;
  }
  const marker = createMarker();
  ctx.scene.add(marker);
  ctx.tutorial = {
    steps: currentLevel(ctx.state).STEPS,
    step: 0,
    phase: 'run',
    t: 0,
    moved: 0,
    lastPos: ctx.cat.mesh.position.clone(),
    airborne: false,
    markerAt: null,
    marker,
    done: false
  };
  ownerGoOffstage(ctx);
  enterStep(ctx, 0);
}

function setMarker(tut, pos) {
  tut.markerAt = pos;
  tut.marker.visible = !!pos;
  if (pos) tut.marker.position.set(pos.x, pos.y + T.MARKER.LIFT, pos.z);
}

function showHint(ctx, textKey = 'text') {
  const tut = ctx.tutorial;
  const s = tut.steps[tut.step];
  if (ctx.tutorialUi) ctx.tutorialUi.show({ index: tut.step + 1, total: tut.steps.length, title: s.title, text: s[textKey] || s.text });
}

function enterStep(ctx, i) {
  const tut = ctx.tutorial;
  tut.step = i;
  tut.phase = 'run';
  tut.t = 0;
  tut.moved = 0;
  tut.lastPos.copy(ctx.cat.mesh.position);
  tut.airborne = false;
  const id = tut.steps[i].id;
  setMarker(tut, null);
  if (id === 'table') {
    const c = FURNITURE_LAYOUT.coffeeTable.colliders[0];
    setMarker(tut, { x: c.x, y: c.topHeight, z: c.z });
  } else if (id === 'glass') {
    const g = MISCHIEF_LAYOUT.glass[T.GLASS_INDEX];
    setMarker(tut, { x: g.x, y: g.y + T.MARKER.GLASS_OFFSET, z: g.z });
  } else if (id === 'box') {
    tut.phase = 'enter';
    const box = ctx.hideBoxes[T.BOX_INDEX];
    if (box) setMarker(tut, { x: box.mesh.position.x, y: HIDE_BOX.HEIGHT, z: box.mesh.position.z });
  } else if (id === 'caught') {
    tut.phase = 'start';
  }
  showHint(ctx);
}

// Langkah selesai → jeda singkat → langkah berikutnya (atau selesai)
function completeStep(ctx) {
  const tut = ctx.tutorial;
  setMarker(tut, null);
  if (ctx.audio) ctx.audio.play('tutorialStep');
  tut.phase = 'pause';
  tut.t = 0;
}

function stepCondition(ctx, dt) {
  const tut = ctx.tutorial;
  const cat = ctx.cat;
  const id = tut.steps[tut.step].id;
  const p = cat.mesh.position;
  switch (id) {
    case 'move': {
      tut.moved += Math.hypot(p.x - tut.lastPos.x, p.z - tut.lastPos.z);
      tut.lastPos.copy(p);
      return tut.moved >= T.MOVE_DIST;
    }
    case 'jump':
      if (!cat.isGrounded) tut.airborne = true;
      return tut.airborne && cat.isGrounded;
    case 'table': {
      const c = FURNITURE_LAYOUT.coffeeTable.colliders[0];
      return cat.isGrounded && Math.abs(p.y - c.topHeight) < 0.02 && Math.abs(p.x - c.x) <= c.width / 2 && Math.abs(p.z - c.z) <= c.depth / 2;
    }
    case 'glass':
      return ctx.state.mischiefCount > 0; // gelas sudah pecah (juga jika dijatuhkan lebih awal)
    case 'box':
      return updateBoxStep(ctx, dt);
    case 'caught':
      return updateCaughtStep(ctx, dt);
    default:
      return true;
  }
}

// Sembunyi di kardus: masuk → tunggu → pemilik patroli melewati kardus.
// Ketahuan (pemilik keluar dari rutinitas) → pesan, lalu ulangi.
function updateBoxStep(ctx, dt) {
  const tut = ctx.tutorial;
  const box = ctx.hideBoxes[T.BOX_INDEX];
  const o = ctx.owner;
  tut.t += dt;
  if (tut.phase === 'enter') {
    if (box) setMarker(tut, { x: box.mesh.position.x, y: HIDE_BOX.HEIGHT, z: box.mesh.position.z });
    if (ctx.cat.inBox) {
      setMarker(tut, null);
      tut.phase = 'wait';
      tut.t = 0;
      showHint(ctx, 'waitText');
    }
    return false;
  }
  if (tut.phase === 'wait') {
    if (!ctx.cat.inBox) {
      tut.phase = 'enter';
      showHint(ctx);
      return false;
    }
    if (tut.t >= T.BOX_WAIT_BEFORE_PATROL) {
      ownerStartPatrol(ctx, T.PATROL_START, T.PATROL_POINTS);
      tut.phase = 'patrol';
      tut.t = 0;
    }
    return false;
  }
  if (tut.phase === 'patrol') {
    if (o.state !== 'routine') {
      tut.phase = 'fail';
      tut.t = 0;
      showHint(ctx, 'failText');
      return false;
    }
    return o.activity === 'offstage'; // pemilik lewat & pergi tanpa curiga
  }
  if (tut.phase === 'fail' && tut.t >= T.FAIL_TIME && !ctx.capture.active) {
    ownerGoOffstage(ctx);
    tut.phase = 'enter';
    tut.t = 0;
    showHint(ctx);
  }
  return false;
}

// Ditangkap sekali: pemilik muncul & mengejar; selesai setelah alur
// KETAHUAN berakhir (nyawa tidak berkurang di latihan, lihat capture.js)
function updateCaughtStep(ctx, dt) {
  const tut = ctx.tutorial;
  const o = ctx.owner;
  tut.t += dt;
  if (tut.phase === 'start') {
    ownerStartChase(ctx, T.CHASE_START);
    tut.phase = 'chase';
    tut.t = 0;
    return false;
  }
  if (tut.phase === 'chase') {
    if (ctx.capture.active) {
      tut.phase = 'captured';
      return false;
    }
    if (o.state !== 'chase') {
      // Kehilangan jejak: kejar lagi sebentar kemudian
      if (tut.retryT === undefined) tut.retryT = T.CHASE_RETRY;
      tut.retryT -= dt;
      if (tut.retryT <= 0) {
        tut.retryT = undefined;
        ownerStartChase(ctx, null);
      }
    }
    return false;
  }
  return tut.phase === 'captured' && !ctx.capture.active;
}

export function updateTutorial(ctx, dt) {
  const tut = ctx.tutorial;
  if (!tut || tut.done) return null;
  // Penanda panah melayang naik-turun
  if (tut.markerAt) {
    const M = T.MARKER;
    tut.marker.position.set(tut.markerAt.x, tut.markerAt.y + M.LIFT + Math.sin(ctx.time * M.BOB_FREQ) * M.BOB_AMP, tut.markerAt.z);
    tut.marker.rotation.y += dt * 2;
  }
  if (tut.phase === 'pause') {
    tut.t += dt;
    if (tut.t < T.STEP_PAUSE) return null;
    if (tut.step + 1 >= tut.steps.length) {
      tut.done = true;
      if (ctx.tutorialUi) ctx.tutorialUi.hide();
      return 'done';
    }
    enterStep(ctx, tut.step + 1);
    return null;
  }
  if (stepCondition(ctx, dt)) completeStep(ctx);
  return null;
}
