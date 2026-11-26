// Rapat video (Level 2 "Deadline"). Jadwal & aturan ada di file level
// (MEETINGS); tampilan & suara di MEETING (config.js).
// - Rapat dimulai saat jadwalnya tiba dan pemilik sedang duduk di meja.
//   Jika pemilik sedang berkegiatan lain, ia kembali bekerja dulu.
// - Selama rapat pemilik duduk diam menghadap laptop (tidak menoleh), layar
//   laptop menampilkan kotak-kotak wajah, dan terdengar suara bicara samar.
// - Suara dengan radius ≥ LOUD_RADIUS yang terdengar pemilik = langsung "!".
// - Rapat berakhir setelah DURATION detik, atau saat pemilik keluar dari
//   rutinitas (mis. mengejar).
import * as THREE from 'three';
import { MEETING } from '../../config.js';
import { currentLevel } from '../../core/state.js';

function meetingConfig(ctx) {
  return currentLevel(ctx.state).MEETINGS || null;
}

export function resetMeetings(ctx) {
  const o = ctx.owner;
  if (o.inMeeting) endMeeting(ctx);
  const M = meetingConfig(ctx);
  o.meetings = M ? M.START_TIMES.map((at) => ({ at, state: 'pending' })) : [];
  o.inMeeting = null;
  o.meetingT = 0;
}

// Rapat berikutnya yang sudah waktunya (rapat yang terlambat & tak sempat dilewati)
export function dueMeeting(ctx) {
  const o = ctx.owner;
  const M = meetingConfig(ctx);
  if (!M || !o.meetings) return null;
  for (const m of o.meetings) {
    if (m.state !== 'pending' || ctx.time < m.at) continue;
    if (ctx.state.timeLeft < M.MIN_TIME_LEFT) {
      m.state = 'skipped';
      continue;
    }
    return m;
  }
  return null;
}

export function startMeeting(ctx, m) {
  const o = ctx.owner;
  const M = meetingConfig(ctx);
  m.state = 'active';
  o.inMeeting = m;
  o.meetingT = M.DURATION;
  o.glanceT = 0;
  o.stretchT = 0;
  setScreen(ctx, true);
  if (ctx.hud.setMeeting) ctx.hud.setMeeting(true);
}

export function endMeeting(ctx) {
  const o = ctx.owner;
  if (!o.inMeeting) return;
  o.inMeeting.state = 'done';
  o.inMeeting = null;
  o.meetingT = 0;
  setScreen(ctx, false);
  if (ctx.hud.setMeeting) ctx.hud.setMeeting(false);
  if (ctx.audio.murmur) ctx.audio.murmur(0);
}

// Dipanggil dari rutinitas kerja saat pemilik duduk. true = sedang rapat.
export function updateMeeting(ctx, dt) {
  const o = ctx.owner;
  if (!o.inMeeting) {
    const m = dueMeeting(ctx);
    if (!m) return false;
    startMeeting(ctx, m);
  }
  o.meetingT -= dt;
  if (o.meetingT <= 0) {
    endMeeting(ctx);
    return false;
  }
  animateScreen(ctx, dt);
  // Suara bicara samar, makin keras saat kucing dekat
  if (ctx.audio.murmur) {
    const A = MEETING.AUDIO;
    const d = ctx.cat.mesh.position.distanceTo(o.mesh.position);
    ctx.audio.murmur(A.VOLUME * Math.max(A.MIN_LEVEL, 1 - d / A.MAX_DIST));
  }
  return true;
}

// Suara keras selama rapat? (ev dari emitNoise, pemilik sudah di dalam radius)
export function isLoudDuringMeeting(ctx, ev) {
  const M = meetingConfig(ctx);
  return !!(ctx.owner.inMeeting && M && ev.radius >= M.LOUD_RADIUS);
}

// --- Layar laptop: kotak-kotak wajah (kanvas prosedural) ---

function drawFaces(fx) {
  const [W, H] = MEETING.SCREEN_SIZE;
  const g = fx.canvas.getContext('2d');
  g.fillStyle = MEETING.SCREEN_BG;
  g.fillRect(0, 0, W, H);
  const cols = 2;
  const rows = 2;
  const pad = 6;
  const tw = (W - pad * (cols + 1)) / cols;
  const th = (H - pad * (rows + 1)) / rows;
  MEETING.TILE_COLORS.forEach((color, i) => {
    const x = pad + (i % cols) * (tw + pad);
    const y = pad + Math.floor(i / cols) * (th + pad);
    g.fillStyle = '#1e293b';
    g.fillRect(x, y, tw, th);
    // Kepala & bahu sederhana
    g.fillStyle = color;
    g.beginPath();
    g.arc(x + tw / 2, y + th * 0.42, th * 0.2, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x + tw * 0.3, y + th * 0.68, tw * 0.4, th * 0.32);
    if (i === fx.speaker) {
      g.strokeStyle = MEETING.SPEAKER_COLOR;
      g.lineWidth = 4;
      g.strokeRect(x + 2, y + 2, tw - 4, th - 4);
    }
  });
  fx.texture.needsUpdate = true;
}

function screenFx(ctx) {
  if (ctx.meetingFx) return ctx.meetingFx;
  const screen = ctx.furnitureRefs && ctx.furnitureRefs.laptopScreen;
  if (!screen || typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  if (!canvas.getContext || !canvas.getContext('2d')) return null;
  [canvas.width, canvas.height] = MEETING.SCREEN_SIZE;
  const texture = new THREE.CanvasTexture(canvas);
  ctx.meetingFx = { screen, canvas, texture, speaker: 0, speakerT: 0 };
  return ctx.meetingFx;
}

function setScreen(ctx, on) {
  const fx = screenFx(ctx);
  if (!fx) return;
  const mat = fx.screen.material;
  if (on && !fx.base) fx.base = { color: mat.color.getHex(), emissive: mat.emissive.getHex() };
  if (fx.base) {
    // Warna dasar layar (biru) diganti putih agar gambar tidak ikut terwarnai
    mat.color.setHex(on ? 0xffffff : fx.base.color);
    mat.emissive.setHex(on ? 0xffffff : fx.base.emissive);
  }
  mat.map = on ? fx.texture : null;
  mat.emissiveMap = on ? fx.texture : null;
  mat.needsUpdate = true;
  if (on) {
    fx.speaker = 0;
    fx.speakerT = MEETING.SPEAKER_INTERVAL;
    drawFaces(fx);
  }
}

function animateScreen(ctx, dt) {
  const fx = ctx.meetingFx;
  if (!fx) return;
  fx.speakerT -= dt;
  if (fx.speakerT <= 0) {
    fx.speakerT = MEETING.SPEAKER_INTERVAL;
    fx.speaker = (fx.speaker + 1 + Math.floor(Math.random() * (MEETING.TILE_COLORS.length - 1))) % MEETING.TILE_COLORS.length;
    drawFaces(fx);
  }
}
