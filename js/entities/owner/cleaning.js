// Rutinitas bersih-bersih pemilik (Level Bonus "Minggu Bersih-bersih").
// Per ruangan (jadwal dari systems/cleaning.js):
//   dust   → mengelap debu dengan kemoceng di satu perabot (DUST_TIME)
//   place  → meletakkan kemoceng di lantai (tempat tetap ruangan itu)
//   sweep  → menyapu pelan menyisir titik-titik sapuan, kepala bergoyang
//   check  → membungkuk mengecek kolong sofa/kasur (selalu, bagian rutinitas)
//   tidy   → kekacauan yang terlihat di ruangan ini didatangi & dibereskan
//   fetch  → menjelang giliran habis: mengambil kemoceng; hilang →
//   search → "Kemocengku mana?", menoleh ke sekitar, lalu pindah ruangan
// Gangguan (curiga/menyelidiki/mengejar) tidak mereset langkah: setelah
// kembali ke rutinitas, pemilik melanjutkan langkah yang sama.
import * as THREE from 'three';
import { OWNER, OWNER_ANIM, FLOAT_TEXT, SUSPICION as S } from '../../config.js';
import { HIP_Y } from './model.js';
import { walkTo, turnTowards, lookAt, clearPath } from './movement.js';
import { cleaningConfig, scheduledRoom, pointInRoom, messPoint, messSeen, tidyMess, isRedoMess, giveLhoKok } from '../../systems/cleaning.js';
import { ownerSeesPoint } from '../../systems/perception.js';
import { hideSpotOf } from '../../systems/hiding.js';
import { startCapture } from '../../systems/capture.js';

export function say(ctx, text) {
  const p = ctx.owner.mesh.position;
  ctx.floatText.spawn(text, { x: p.x, y: OWNER.EYE_HEIGHT_STAND + FLOAT_TEXT.SPEECH_HEIGHT, z: p.z }, 'speech', { duration: FLOAT_TEXT.SPEECH_DURATION });
}

function duster(ctx) {
  return ctx.mischief.instances.find((i) => i.type === 'duster') || null;
}

// Kolong tempat sembunyi terdekat dari titik (untuk langkah "check")
function hideSpotAt(ctx, p) {
  let best = null;
  let bestD = Infinity;
  for (const box of ctx.colliders) {
    if (!box.hideSpot) continue;
    const d = Math.hypot((box.minX + box.maxX) / 2 - p.x, (box.minZ + box.maxZ) / 2 - p.z);
    if (d < bestD) {
      best = box;
      bestD = d;
    }
  }
  return best;
}

export function resetCleanRoutine(ctx) {
  const o = ctx.owner;
  const C = cleaningConfig(ctx);
  o.cleanMode = !!C;
  o.tool = null;
  o.clean = null;
  if (!C) return;
  const room = ctx.cleaning.rooms[0];
  o.mesh.position.set(room.dust.x, 0, room.dust.z);
  o.yaw = room.dust.yaw;
  o.mesh.rotation.y = o.yaw;
  o.headYaw = 0;
  o.pose = 'stand';
  o.parts.hips.position.y = HIP_Y;
  o.activity = 'clean';
  o.phase = 'do';
  o.tool = 'duster';
  o.clean = {
    room: 0,
    slot: 0, // giliran yang sedang dikerjakan (bisa mendahului jadwal setelah mengambil kemoceng)
    step: 'dust',
    t: C.DUST_TIME,
    hasDuster: true,
    sweepIdx: 0,
    sweepT: 0,
    checked: false,
    target: null, // { mess } atau { loose: duster }
    prev: null,
    seeT: 0,
    lhoT: 0,
    arrived: false
  };
  clearPath(o);
}

// Kembali ke rutinitas setelah gangguan: langkah dilanjutkan
export function resumeCleaning(o) {
  if (!o.clean) return;
  o.activity = 'clean';
  o.clean.arrived = false;
  clearPath(o);
}

// Giliran berikutnya setelah mengambil kemoceng: ruangan berikutnya
// (walau jadwal belum berganti, mis. kemoceng diambil menjelang giliran habis)
function nextSlot(ctx, o) {
  return Math.max(scheduledRoom(ctx).slot, o.clean.slot + 1);
}

function setStep(o, step, t = 0) {
  const c = o.clean;
  c.picking = false;
  c.step = step;
  c.t = t;
  c.arrived = false;
  clearPath(o);
}

// Mulai giliran `slot` (ruangan = slot % jumlah ruangan)
function enterRoom(ctx, o, slot) {
  const C = ctx.cleaning.C;
  const c = o.clean;
  const index = slot % ctx.cleaning.rooms.length;
  const room = ctx.cleaning.rooms[index];
  c.slot = slot;
  c.room = index;
  c.sweepT = 0;
  c.checked = false;
  // Mulai menyapu dari titik terdekat
  let best = 0;
  let bestD = Infinity;
  room.sweep.forEach((p, i) => {
    const d = Math.hypot(p.x - room.dust.x, p.z - room.dust.z);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  });
  c.sweepIdx = best;
  if (c.hasDuster) setStep(o, 'dust', C.DUST_TIME);
  else setStep(o, 'sweep');
}

// Berjalan ke titik; true jika sudah sampai (status disimpan di c.arrived)
function goTo(ctx, o, p, speed, dt) {
  const c = o.clean;
  if (c.arrived) return true;
  if (walkTo(ctx, o, p, speed, dt)) c.arrived = true;
  return c.arrived;
}

// Kemoceng tergeletak (tanpa Chaos tertunda) yang terlihat di ruangan ini
function looseDusterSeen(ctx, o, room) {
  const d = duster(ctx);
  if (!d || d.state !== 'dropped' || d.mess || o.clean.hasDuster) return null;
  const p = d.messPoint();
  if (!pointInRoom(room, p.x, p.z)) return null;
  return ownerSeesPoint(ctx, p, { range: ctx.cleaning.C.SEE_RANGE, lift: ctx.cleaning.C.SEE_LIFT }) ? d : null;
}

// Cari kekacauan yang terlihat di ruangan jadwal (throttle SEE_HZ)
function lookForMess(ctx, o, dt) {
  const cl = ctx.cleaning;
  const c = o.clean;
  c.seeT -= dt;
  if (c.seeT > 0) return null;
  c.seeT = 1 / cl.C.SEE_HZ;
  const room = cl.rooms[c.room];
  let best = null;
  let bestD = Infinity;
  const op = o.mesh.position;
  for (const mess of cl.messes) {
    const p = messPoint(mess);
    if (!pointInRoom(room, p.x, p.z)) continue;
    if (mess.type === 'duster' && mess.inst.state !== 'dropped') continue;
    if (!messSeen(ctx, mess)) continue;
    const d = Math.hypot(p.x - op.x, p.z - op.z);
    if (d < bestD) {
      best = { mess };
      bestD = d;
    }
  }
  if (best) return best;
  const loose = looseDusterSeen(ctx, o, room);
  return loose ? { loose } : null;
}

function startTidy(o, target) {
  const c = o.clean;
  if (c.step !== 'tidy' && c.step !== 'pickup') c.prev = c.step === 'fetch' || c.step === 'search' ? 'afterFetch' : c.step;
  c.target = target;
  setStep(o, target.loose ? 'pickup' : 'tidy', 0);
}

function finishTarget(ctx, o) {
  const c = o.clean;
  const prev = c.prev || 'sweep';
  c.target = null;
  c.prev = null;
  if (prev === 'afterFetch') {
    enterRoom(ctx, o, nextSlot(ctx, o));
    return;
  }
  setStep(o, prev, prev === 'dust' ? Math.max(c.t, 1) : 0);
  if (prev === 'dust' && !c.hasDuster) setStep(o, 'sweep');
}

export function updateCleanRoutine(ctx, o, dt) {
  const cl = ctx.cleaning;
  const C = cl.C;
  const c = o.clean;
  const room = cl.rooms[c.room];
  const sched = scheduledRoom(ctx);
  const d = duster(ctx);
  o.headYaw += (0 - o.headYaw) * Math.min(1, OWNER.HEAD_TURN_SPEED * dt);

  // Giliran ruangan berganti (atau hampir habis): ambil kemoceng dulu
  const busy = c.step === 'tidy' || c.step === 'pickup' || c.step === 'fetch' || c.step === 'search' || c.step === 'check' || c.step === 'place';
  const dusterHere = d && d.state === 'placed' && d.roomIndex === c.room;
  if (!busy) {
    if (sched.slot > c.slot) {
      if (dusterHere || (!c.hasDuster && d && d.roomIndex === c.room && d.state !== 'owner')) setStep(o, 'fetch');
      else enterRoom(ctx, o, sched.slot);
    } else if (sched.slot === c.slot && sched.timeLeft <= C.FETCH_BEFORE && dusterHere && c.step === 'sweep') {
      setStep(o, 'fetch');
    }
  }

  // Kekacauan terlihat di ruangan ini → bereskan
  if (c.step === 'sweep' || c.step === 'dust' || c.step === 'search' || c.step === 'fetch') {
    const target = lookForMess(ctx, o, dt);
    if (target) startTidy(o, target);
  }

  switch (c.step) {
    case 'dust': {
      if (!c.hasDuster) {
        setStep(o, 'sweep');
        break;
      }
      o.tool = 'duster';
      if (!goTo(ctx, o, room.dust, OWNER.WALK_SPEED, dt)) break;
      turnTowards(o, room.dust.yaw, dt);
      o.pose = 'dust';
      c.t -= dt;
      if (c.t <= 0) setStep(o, 'place', C.PLACE_TIME);
      break;
    }
    case 'place': {
      o.tool = 'duster';
      if (!goTo(ctx, o, room.duster, OWNER.WALK_SPEED, dt)) break;
      o.pose = 'crouch';
      c.t -= dt;
      if (c.t <= 0) {
        if (d) d.place(room.duster, c.room);
        c.hasDuster = false;
        setStep(o, 'sweep');
      }
      break;
    }
    case 'sweep': {
      o.tool = 'broom';
      c.sweepT += dt;
      if (room.check && !c.checked && c.sweepT >= C.CHECK_AT) {
        setStep(o, 'check', C.CHECK_TIME);
        break;
      }
      const pts = room.sweep;
      if (!pts.length) break;
      const p = pts[c.sweepIdx % pts.length];
      if (walkTo(ctx, o, p, C.SWEEP_SPEED, dt)) {
        c.sweepIdx = (c.sweepIdx + 1) % pts.length;
        clearPath(o);
      }
      o.pose = 'sweep';
      o.headYaw = Math.sin(o.clock * C.HEAD_SWAY_SPEED) * C.HEAD_SWAY;
      c.soundT = (c.soundT || 0) - dt;
      if (c.soundT <= 0) {
        c.soundT = 0.9;
        const cp = ctx.cat.mesh.position;
        if (Math.hypot(cp.x - o.mesh.position.x, cp.z - o.mesh.position.z) < 6) ctx.audio.play('sweep');
      }
      break;
    }
    case 'check': {
      o.tool = 'broom';
      if (!goTo(ctx, o, room.check.spot, OWNER.WALK_SPEED, dt)) break;
      const spot = hideSpotAt(ctx, room.check.target);
      o.checkingSpot = spot;
      o.pose = 'kneel';
      lookAt(o, room.check.target, dt, true);
      c.t -= dt;
      if (c.t > 0) break;
      o.checkingSpot = null;
      c.checked = true;
      if (spot && hideSpotOf(ctx.cat) === spot && ctx.state.invulnerableTimer <= 0 && !ctx.capture.active) {
        // Kucing di kolong yang sedang dicek: ditarik keluar
        o.meter = S.MAX;
        o.state = 'chase';
        o.attention = { x: ctx.cat.mesh.position.x, z: ctx.cat.mesh.position.z };
        ctx.audio.play('alarm');
        startCapture(ctx);
        return true;
      }
      setStep(o, 'sweep');
      break;
    }
    case 'tidy': {
      const mess = c.target && c.target.mess;
      if (!mess || !cl.messes.includes(mess) || (mess.type === 'duster' && mess.inst.state !== 'dropped')) {
        finishTarget(ctx, o);
        break;
      }
      const p = messPoint(mess);
      if (!c.arrived) {
        const near = Math.hypot(p.x - o.mesh.position.x, p.z - o.mesh.position.z) < 0.7;
        if (near || walkTo(ctx, o, p, OWNER.WALK_SPEED, dt)) {
          c.arrived = true;
          c.t = C.TIDY_TIME;
          clearPath(o);
        }
        break;
      }
      o.pose = 'tidy';
      o.tool = null;
      lookAt(o, p, dt, true);
      c.t -= dt;
      if (c.t <= 0) {
        if (mess.type === 'duster') c.hasDuster = true;
        tidyMess(ctx, mess);
        finishTarget(ctx, o);
      }
      break;
    }
    case 'pickup': {
      const loose = c.target && c.target.loose;
      if (!loose || loose.state !== 'dropped') {
        finishTarget(ctx, o);
        break;
      }
      const p = loose.messPoint();
      if (!c.arrived) {
        const near = Math.hypot(p.x - o.mesh.position.x, p.z - o.mesh.position.z) < 0.7;
        if (near || walkTo(ctx, o, p, OWNER.WALK_SPEED, dt)) {
          c.arrived = true;
          c.t = C.PLACE_TIME;
          clearPath(o);
        }
        break;
      }
      o.pose = 'crouch';
      lookAt(o, p, dt, true);
      c.t -= dt;
      if (c.t <= 0) {
        loose.pickUp();
        c.hasDuster = true;
        ctx.audio.play('tidy');
        finishTarget(ctx, o);
      }
      break;
    }
    case 'fetch': {
      o.tool = 'broom';
      if (!d || d.state === 'owner') {
        c.hasDuster = c.hasDuster || (d && d.state === 'owner');
        enterRoom(ctx, o, nextSlot(ctx, o));
        break;
      }
      const home = d.home || room.duster;
      if (!goTo(ctx, o, home, OWNER.WALK_SPEED, dt)) break;
      if (d.state === 'placed' && Math.hypot(d.mesh.position.x - home.x, d.mesh.position.z - home.z) < 0.3) {
        o.pose = 'crouch';
        if (!c.picking) {
          c.picking = true;
          c.t = C.PLACE_TIME;
        }
        c.t -= dt;
        if (c.t <= 0) {
          c.picking = false;
          d.pickUp();
          c.hasDuster = true;
          enterRoom(ctx, o, nextSlot(ctx, o));
        }
        break;
      }
      // Kemoceng tidak di tempatnya
      say(ctx, 'Kemocengku mana?');
      setStep(o, 'search', C.SEARCH_TIME);
      break;
    }
    case 'search': {
      o.pose = 'stand';
      o.tool = 'broom';
      o.headYaw = Math.sin(o.clock * OWNER_ANIM.LOOK_AROUND_SPEED) * OWNER_ANIM.LOOK_AROUND_YAW;
      c.t -= dt;
      if (c.t <= 0) enterRoom(ctx, o, nextSlot(ctx, o)); // lanjut tanpa kemoceng
      break;
    }
    default:
      enterRoom(ctx, o, nextSlot(ctx, o));
  }
  if (o.pose === 'walk' || o.pose === 'run') o.tool = c.hasDuster && c.step !== 'sweep' ? 'duster' : 'broom';
  return true;
}

// "Lho, kok?!": pemilik melihat kekacauan ulang (objek yang pernah ia
// bereskan) → bonus Chaos untuk kucing. Mengembalikan titik kekacauan agar
// owner/index.js membuat pemilik curiga, atau null.
export function checkLhoKok(ctx, o, dt) {
  const cl = ctx.cleaning;
  if (!cl || !o.clean) return null;
  const c = o.clean;
  c.lhoT -= dt;
  if (c.lhoT > 0) return null;
  c.lhoT = 1 / cl.C.SEE_HZ;
  for (const mess of cl.messes) {
    if (!isRedoMess(mess) || !messSeen(ctx, mess)) continue;
    giveLhoKok(ctx, mess);
    say(ctx, 'Lho, kok?!');
    ctx.audio.play('lhoKok');
    const p = messPoint(mess);
    return new THREE.Vector3(p.x, 0, p.z);
  }
  return null;
}
