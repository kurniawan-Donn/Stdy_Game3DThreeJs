// Bersih-bersih (Level Bonus "Minggu Bersih-bersih"). Aktif hanya di level
// dengan blok CLEANING.
// - Jadwal ruangan: ROOMS berurutan, ROOM_TIME detik per ruangan (HUD: ikon).
// - Kekacauan: tiap kenakalan yang mendapat Chaos (state.scoreLog dari
//   scoreMischief) dicatat sebagai "mess" beserta benda fisikanya (serpihan,
//   lembar tisu, pakaian). Pemilik yang sedang bersih-bersih membereskannya
//   (owner/cleaning.js → tidyMess): Chaos −50%, objek dikembalikan seperti
//   semula dan bisa dinakali sekali lagi (MAX_REDO).
// - Dua robot menyedot benda kecil (robotSuck); kekacauan yang serpihannya
//   habis disedot hilang dari pandangan pemilik (tanpa pengurangan Chaos).
import { HOUSE, VACUUM, MISCHIEF } from '../config.js';
import { currentLevel } from '../core/state.js';
import { ownerSeesPoint } from './perception.js';
import { removeBody } from './physics.js';
import { disposeObject3D } from '../core/dispose.js';
import { isWalkable } from './navGrid.js';
import { adjustChaos } from './chaos.js';
import { respawnMischief } from '../entities/mischief/index.js';

export function cleaningConfig(ctx) {
  return currentLevel(ctx.state).CLEANING || null;
}

// Titik sapuan otomatis per ruangan: grid SWEEP_STEP di atas sel navigasi
// yang bebas, diurutkan berliku (baris bolak-balik) agar pemilik menyisir.
function buildSweepPoints(ctx, room, step) {
  const pts = [];
  for (const name of room.rooms) {
    const r = HOUSE.rooms[name];
    const rows = [];
    for (let z = r.minZ + step / 2; z < r.maxZ; z += step) {
      const row = [];
      for (let x = r.minX + step / 2; x < r.maxX; x += step) {
        if (isWalkable(ctx.nav, x, z)) row.push({ x, z });
      }
      if (row.length) rows.push(row);
    }
    rows.forEach((row, i) => pts.push(...(i % 2 ? row.reverse() : row)));
  }
  return pts;
}

export function resetCleaning(ctx) {
  const C = cleaningConfig(ctx);
  if (!C) {
    ctx.cleaning = null;
    if (ctx.hud.setCleanRooms) ctx.hud.setCleanRooms(null);
    return;
  }
  ctx.cleaning = {
    C,
    rooms: C.ROOMS.map((r) => ({ ...r, sweep: buildSweepPoints(ctx, r, C.SWEEP_STEP) })),
    messes: [],
    logIdx: 0,
    suckSoundT: 0
  };
  if (ctx.hud.setCleanRooms) ctx.hud.setCleanRooms(C.ROOMS, 0, 1);
}

// Ruangan sesuai jadwal saat ini + sisa waktu gilirannya (0..1)
export function scheduledRoom(ctx) {
  const cl = ctx.cleaning;
  const T = cl.C.ROOM_TIME;
  const slot = Math.floor(ctx.time / T);
  return { slot, index: slot % cl.rooms.length, left: 1 - (ctx.time - slot * T) / T, timeLeft: (slot + 1) * T - ctx.time };
}

export function pointInRoom(room, x, z) {
  for (const name of room.rooms) {
    const r = HOUSE.rooms[name];
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return true;
  }
  return false;
}

// Titik kekacauan saat ini (kemoceng bisa berpindah)
export function messPoint(mess) {
  return mess.inst.messPoint ? mess.inst.messPoint() : mess.point;
}

export function messSeen(ctx, mess) {
  const C = ctx.cleaning.C;
  return ownerSeesPoint(ctx, messPoint(mess), { range: C.SEE_RANGE, lift: C.SEE_LIFT });
}

// Catat kekacauan baru dari scoreMischief (state.scoreLog)
function noteMess(ctx, entry) {
  const cl = ctx.cleaning;
  let inst = null;
  for (const i of ctx.mischief.instances) {
    if (i.type !== entry.type || i.mess || i.exhausted || !(i.done || i.messReady)) continue;
    if (!inst || (i.startedAt ?? -1) > (inst.startedAt ?? -1)) inst = i;
  }
  if (!inst) return;
  inst.messReady = false;
  const point = { x: entry.x, y: entry.y, z: entry.z };
  const mess = {
    inst,
    type: entry.type,
    amount: entry.amount,
    point,
    tidyCount: inst.tidyCount || 0,
    lhoKokGiven: !!inst.lhoKokGiven,
    suckTotal: 0,
    suckLeft: 0,
    bodies: []
  };
  // Benda fisika yang muncul sejak kenakalan dimulai di sekitar titiknya
  const since = (inst.startedAt ?? entry.t) - 1e-6;
  for (const b of ctx.physics.bodies) {
    if (b.mess || b.noClaim || (b.bornAt ?? -1) < since) continue;
    if (Math.hypot(b.mesh.position.x - point.x, b.mesh.position.z - point.z) > cl.C.CLAIM_RADIUS) continue;
    b.mess = mess;
    mess.bodies.push(b);
    // Serpihan kecil yang tidak memudar sendiri = bukti yang bisa disedot robot
    if (b.radius <= cl.C.SUCK_MAX_RADIUS && (b.life === undefined || b.life > 1000)) {
      b.suck = true;
      mess.suckTotal++;
    }
  }
  mess.suckLeft = mess.suckTotal;
  inst.mess = mess;
  cl.messes.push(mess);
}

// Pemilik membereskan kekacauan: Chaos −50%, objek kembali seperti semula
// (bisa dinakali sekali lagi), benda fisikanya hilang.
export function tidyMess(ctx, mess) {
  const cl = ctx.cleaning;
  const i = cl.messes.indexOf(mess);
  if (i < 0) return;
  cl.messes.splice(i, 1);
  const C = cl.C;
  const p = messPoint(mess);
  const penalty = Math.round(mess.amount * C.TIDY_FRACTION);
  adjustChaos(ctx, -penalty, { x: p.x, y: (p.y || 0) + 0.3, z: p.z });
  ctx.audio.play('tidy');
  for (const b of mess.bodies) {
    if (!ctx.physics.bodies.includes(b)) continue;
    removeBody(ctx, b);
    disposeObject3D(b.mesh);
  }
  const tidyCount = mess.tidyCount + 1;
  if (mess.inst.onTidy) {
    mess.inst.mess = null;
    mess.inst.tidyCount = tidyCount;
    mess.inst.lhoKokGiven = mess.lhoKokGiven;
    mess.inst.onTidy(ctx);
  } else {
    respawnMischief(ctx, mess.inst, {
      tidyCount,
      lhoKokGiven: mess.lhoKokGiven,
      exhausted: tidyCount > C.MAX_REDO
    });
  }
}

// "Lho, kok?!": kekacauan ulang pada objek yang pernah dibereskan
export function isRedoMess(mess) {
  return mess.tidyCount > 0 && !mess.lhoKokGiven;
}

export function giveLhoKok(ctx, mess) {
  mess.lhoKokGiven = true;
  const p = messPoint(mess);
  adjustChaos(ctx, MISCHIEF.lhoKok.CHAOS, { x: p.x, y: (p.y || 0) + 0.3, z: p.z });
}

// Robot menyedot benda kecil di bawahnya (dipanggil entities/vacuum.js)
export function robotSuck(ctx, robot, dt) {
  const cl = ctx.cleaning;
  if (!cl) return;
  const C = cl.C;
  const rp = robot.mesh.position;
  const reach = VACUUM.RADIUS + C.SUCK_REACH;
  const bodies = ctx.physics.bodies;
  cl.suckSoundT -= dt;
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    if (b.noClaim || b.radius > C.SUCK_MAX_RADIUS) continue;
    const p = b.mesh.position;
    if (p.y - (b.bottomOffset || 0) > C.SUCK_MAX_Y) continue;
    if (Math.hypot(p.x - rp.x, p.z - rp.z) > reach) continue;
    removeBody(ctx, b);
    disposeObject3D(b.mesh);
    if (cl.suckSoundT <= 0) {
      ctx.audio.play('suck');
      cl.suckSoundT = 0.3;
    }
    const mess = b.mess;
    if (mess && b.suck) {
      mess.suckLeft--;
      if (mess.suckLeft <= 0) {
        // Bukti habis: kekacauan hilang dari pandangan (tidak bisa diulang)
        const k = cl.messes.indexOf(mess);
        if (k >= 0) cl.messes.splice(k, 1);
        mess.gone = true;
      }
    }
  }
}

export function updateCleaning(ctx) {
  const cl = ctx.cleaning;
  if (!cl) return;
  const log = ctx.state.scoreLog;
  while (cl.logIdx < log.length) noteMess(ctx, log[cl.logIdx++]);
  const s = scheduledRoom(ctx);
  if (ctx.hud.setCleanRooms) ctx.hud.setCleanRooms(cl.C.ROOMS, s.index, Math.max(0, s.left));
}
