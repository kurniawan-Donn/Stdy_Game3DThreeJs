// Lanskap suara per frame (Fase 9):
// - pendengar audio posisional = kucing, pan mengikuti arah kamera
// - langkah pemilik & tamu (posisional, per jarak tempuh)
// - suasana: kicau burung (level siang tanpa hujan), tetesan atap bocor
//   (Level 3), dengung robot terdekat, dengkur kucing tidur
// - musik latar: lobi / tenang saat main / tegang saat pemilik MENGEJAR /
//   musik speaker Level Bonus
// Semua fungsi audio dicek keberadaannya (uji headless memakai audio tiruan).
import { AUDIO_MIX as M, MUSIC_BG } from '../config.js';
import { currentLevel } from '../core/state.js';
import { musicLevelAt } from '../world/sunday.js';

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function resetSoundscape(ctx) {
  ctx.soundscape = {
    steps: new Map(), // npc → { x, z, acc }
    birdT: rand(M.BIRDS.MIN, M.BIRDS.MAX),
    dripT: M.DRIP_EVERY,
    purrT: 0,
    chaseHold: 0
  };
}

// Langkah NPC: satu bunyi tiap NPC_STRIDE meter yang ditempuh
function npcSteps(ctx, npc, name, dt, scale = 1) {
  const sc = ctx.soundscape;
  const p = npc.mesh.position;
  let s = sc.steps.get(npc);
  if (!s) {
    s = { x: p.x, z: p.z, acc: 0 };
    sc.steps.set(npc, s);
  }
  const d = Math.hypot(p.x - s.x, p.z - s.z);
  s.x = p.x;
  s.z = p.z;
  if (!npc.mesh.visible || d > 1 || dt <= 0) return; // teleport / tersembunyi
  const running = d / dt > M.NPC_RUN_SPEED;
  s.acc += d;
  const stride = (running ? M.NPC_STRIDE.RUN : M.NPC_STRIDE.WALK) * scale;
  if (s.acc >= stride) {
    s.acc = 0;
    ctx.audio.play(running && name === 'ownerStep' ? 'ownerRun' : name, { x: p.x, z: p.z });
  }
}

export function updateSoundscape(ctx, dt) {
  if (!ctx.soundscape) resetSoundscape(ctx);
  const sc = ctx.soundscape;
  const a = ctx.audio;
  const cp = ctx.cat.mesh.position;
  if (a.setListener) a.setListener(cp.x, cp.z, ctx.camRig ? ctx.camRig.yaw : 0);
  if (ctx.state.isGameOver) {
    if (a.loop) a.loop('robotHum', 0);
    return;
  }

  const o = ctx.owner;
  if (o && !o.away && !o.asleep) npcSteps(ctx, o, 'ownerStep', dt);
  const g = ctx.guest;
  if (g && g.active && !g.inToilet) npcSteps(ctx, g, 'guestStep', dt, g.scale || 1);

  // Kucing tidur: dengkur pelan berkala
  if (ctx.cat.sleeping) {
    sc.purrT -= dt;
    if (sc.purrT <= 0) {
      sc.purrT = M.SLEEP_PURR_EVERY;
      a.play('purr');
    }
  } else sc.purrT = 0.8;

  // Kicau burung di luar jendela (siang, tanpa hujan, bukan malam)
  if (!ctx.weather && !ctx.night && ctx.windows && ctx.windows.length) {
    sc.birdT -= dt;
    if (sc.birdT <= 0) {
      sc.birdT = rand(M.BIRDS.MIN, M.BIRDS.MAX);
      const w = ctx.windows[Math.floor(Math.random() * ctx.windows.length)];
      a.play('birdChirp', { x: w.center[0], z: w.center[2] });
    }
  }

  // Atap bocor (Level 3): tetesan ke ember jika sudah dipasang, ke genangan jika belum
  const rain = ctx.weather && ctx.weather.rain;
  if (rain && rain.bucket) {
    sc.dripT -= dt;
    if (sc.dripT <= 0) {
      sc.dripT = M.DRIP_EVERY * rand(0.8, 1.25);
      const bp = rain.bucket.position;
      a.play(rain.bucket.visible ? 'drip' : 'dripPuddle', { x: bp.x, z: bp.z });
    }
  }

  // Dengung robot vacuum terdekat
  if (a.loop) {
    let best = null;
    let bestD = Infinity;
    for (const obs of ctx.obstacles) {
      const d = Math.hypot(obs.mesh.position.x - cp.x, obs.mesh.position.z - cp.z);
      if (d < bestD) {
        bestD = d;
        best = obs;
      }
    }
    if (best && bestD < M.ROBOT_HUM_RANGE) {
      const lvl = best.rider ? 1 : 1 - bestD / M.ROBOT_HUM_RANGE;
      a.loop('robotHum', lvl, best.rider ? null : { x: best.mesh.position.x, z: best.mesh.position.z });
    } else a.loop('robotHum', 0);
  }
}

// Volume tiap trek musik untuk flow state saat ini (dipanggil tiap frame,
// juga di lobi & saat pause). dt = waktu nyata.
export function musicLevels(ctx, dt) {
  const st = ctx.flow ? ctx.flow.state : 'playing';
  if (st === 'lobby' || st === 'select') return { lobby: MUSIC_BG.LOBBY_LEVEL };
  if (!ctx.soundscape) resetSoundscape(ctx);
  const sc = ctx.soundscape;
  const level = currentLevel(ctx.state);
  const o = ctx.owner;
  const chasing = !!(o && (o.state === 'chase' || o.state === 'capture') && !ctx.state.isGameOver);
  if (chasing) sc.chaseHold = MUSIC_BG.CHASE_HOLD;
  else if (st === 'playing') sc.chaseHold = Math.max(0, sc.chaseHold - dt);
  const chase = sc.chaseHold > 0 ? MUSIC_BG.CHASE_LEVEL : 0;
  const duck = chase > 0 ? MUSIC_BG.CHASE_DUCK : 1;
  let calm = (level.MUSIC_CALM !== undefined ? level.MUSIC_CALM : MUSIC_BG.CALM_LEVEL) * duck;
  let sunday = 0;
  if (ctx.sunday) {
    sunday = musicLevelAt(ctx) * duck; // speaker Level Bonus menggantikan musik tenang
    calm = 0;
  }
  let mult = 1;
  if (st === 'paused') mult = MUSIC_BG.PAUSE_MULT;
  else if (st === 'results' || ctx.state.isGameOver) mult = MUSIC_BG.RESULTS_MULT;
  return { calm: calm * mult, chase: st === 'playing' ? chase : 0, sunday: sunday * mult };
}
