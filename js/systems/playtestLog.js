// Log playtest lokal (Fase 9.2), opsional: nyala/mati dengan F3 → K, ekspor
// JSON dengan F3 → J (unduh file). Disimpan di localStorage dengan kunci
// sendiri (PLAYTEST_LOG.KEY), terpisah dari save game. Tiap sesi = satu kali
// main satu level: Chaos per kenakalan (dari state.scoreLog), ketahuan
// (waktu, posisi, ruangan, penyebab), durasi, hasil, bintang.
// Saat mati, tidak ada yang dicatat.
import { PLAYTEST_LOG as P } from '../config.js';
import { currentLevel } from '../core/state.js';
import { roomAt } from '../core/audio.js';

function storage() {
  try {
    return window.localStorage || null;
  } catch (e) {
    return null;
  }
}

export function createPlaytestLog() {
  const log = { enabled: false, sessions: [], current: null };
  const ls = storage();
  if (ls) {
    try {
      const data = JSON.parse(ls.getItem(P.KEY) || 'null');
      if (data && Array.isArray(data.sessions)) {
        log.enabled = data.enabled === true;
        log.sessions = data.sessions;
      }
    } catch (e) {
      // log rusak: mulai baru
    }
  }
  return log;
}

function persist(log) {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(P.KEY, JSON.stringify({ enabled: log.enabled, sessions: log.sessions }));
  } catch (e) {
    // kuota penuh: log tidak tersimpan
  }
}

export function setPlaytestEnabled(log, on) {
  log.enabled = on;
  if (!on) log.current = null;
  persist(log);
}

export function clearPlaytestLog(log) {
  log.sessions = [];
  log.current = null;
  persist(log);
}

// Dipanggil levelManager.loadLevel setelah reset
export function beginPlaytestSession(ctx) {
  const log = ctx.playtest;
  if (!log || !log.enabled) return;
  if (log.current) finishSession(ctx, 'keluar');
  const level = currentLevel(ctx.state);
  log.current = {
    level: level.key,
    name: level.name,
    startedAt: new Date().toISOString(),
    cat: ctx.cat.look ? ctx.cat.look.cat : null,
    bell: !!ctx.cat.bell,
    captures: []
  };
}

// Dipanggil capture.startCapture
export function logCapture(ctx) {
  const log = ctx.playtest;
  if (!log || !log.current) return;
  const p = ctx.cat.mesh.position;
  const o = ctx.owner;
  let cause = 'terlihat';
  if (o.chaseFrom === 'kneel') cause = 'kolong diperiksa';
  else if (ctx.cat.inBox) cause = 'kardus bergerak';
  else if (o.chaseFrom === 'routine') cause = 'langsung terlihat';
  else if (o.chaseFrom === 'investigate') cause = 'saat menyelidiki';
  else if (o.chaseFrom === 'curious') cause = 'saat curiga';
  log.current.captures.push({
    t: +ctx.time.toFixed(1),
    x: +p.x.toFixed(2),
    z: +p.z.toFixed(2),
    room: roomAt(p.x, p.z) || '-',
    cause,
    hidden: ctx.cat.underCrawl ? 'kolong' : ctx.cat.inBox ? 'kardus' : null
  });
}

function finishSession(ctx, result, extra = {}) {
  const log = ctx.playtest;
  const cur = log.current;
  if (!cur) return null;
  const s = ctx.state;
  const level = currentLevel(s);
  const byType = {};
  for (const e of s.scoreLog || []) {
    const b = (byType[e.type] ||= { count: 0, chaos: 0 });
    b.count++;
    b.chaos += e.amount;
  }
  const session = {
    ...cur,
    result,
    duration: +ctx.time.toFixed(1),
    levelDuration: level.DURATION,
    chaos: s.chaos,
    target: level.TARGET_CHAOS,
    stars: extra.stars || 0,
    livesLeft: s.lives,
    mischief: (s.scoreLog || []).map((e) => ({ type: e.type, amount: e.amount, t: +e.t.toFixed(1) })),
    byType
  };
  log.sessions.push(session);
  if (log.sessions.length > P.MAX_SESSIONS) log.sessions.splice(0, log.sessions.length - P.MAX_SESSIONS);
  log.current = null;
  persist(log);
  return session;
}

// Dipanggil level.endLevel. result: 'menang' | 'kalah' | 'nyawa habis'
export function endPlaytestSession(ctx, result, stars) {
  if (!ctx.playtest || !ctx.playtest.current) return null;
  return finishSession(ctx, result, { stars });
}

// Keluar ke lobi / ulangi di tengah level
export function abortPlaytestSession(ctx) {
  if (!ctx.playtest || !ctx.playtest.current) return null;
  return finishSession(ctx, 'keluar');
}

export function playtestJson(log) {
  return JSON.stringify({ game: 'Meong Mayhem', exportedAt: new Date().toISOString(), sessions: log.sessions }, null, 2);
}

// Unduh sebagai file JSON (browser)
export function exportPlaytestLog(log) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([playtestJson(log)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `meong-playtest-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
