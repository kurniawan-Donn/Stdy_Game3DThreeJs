// Tamu (Level 5 "Kedatangan Tamu"). Model & animasi memakai modul pemilik
// dengan parameter lain (warna, rambut, tinggi 1,62 m); gerak & navigasi
// memakai fungsi pemilik (npcWalkTo, dst.), persepsi memakai senseCat.
// Tamu tidak bisa menangkap. Ia:
// - melihat kucing → "Pus, pus!" (suara: pemilik menoleh ke tamu) → mendekat;
//   jika sampai & kucing diam → mengelus 3 detik → camilan ikan (stamina +40)
// - melihat kenakalan → tertawa "Kucingmu nakal!" → pemilik menyelidiki
// - dipancing meong di dekatnya → mendekat
// Jadwal duduk/dapur/toilet/pembuka/penutup diatur systems/visit.js.
import * as THREE from 'three';
import { GUEST_FX as F, OWNER, OWNER_ANIM, STAMINA, FLOAT_TEXT } from '../../config.js';
import { createOwnerMesh } from '../owner/model.js';
import { animateOwner, isSittingPose } from '../owner/animation.js';
import { npcWalkTo, npcTurnTowards, npcLookAt, npcClearPath, ownerReport } from '../owner/index.js';
import { senseCat } from '../../systems/perception.js';
import { hideSpotOf } from '../../systems/hiding.js';
import { emitNoise } from '../../systems/noise.js';
import { startCatAction } from '../cat.js';
import { currentLevel } from '../../core/state.js';

export function guestConfig(ctx) {
  return currentLevel(ctx.state).GUEST || null;
}

export function createGuest(scene) {
  const L = F.LOOK;
  const { root, parts } = createOwnerMesh({ ...L, scale: L.height / F.OWNER_HEIGHT });
  root.visible = false;
  scene.add(root);
  return {
    mesh: root,
    parts,
    scale: L.height / F.OWNER_HEIGHT,
    active: false,
    yaw: 0,
    headYaw: 0,
    pose: 'stand',
    walkPhase: 0,
    clock: 0,
    path: null,
    pathGoal: null,
    replanT: 0,
    state: 'off', // off | outside | enter | toSeat | seated | kitchen | toilet | approach | pet | laugh | leave
    t: 0,
    sense: null,
    seen: false,
    senseT: 0,
    unseenT: 0,
    petCooldown: 0,
    reportCooldown: 0,
    laughT: 0,
    afterLaugh: null,
    inToilet: false,
    drinkIn: 0,
    drinkT: 0,
    heartT: 0,
    purrT: 0,
    lure: null
  };
}

export function resetGuest(ctx) {
  const g = ctx.guest;
  if (!g) return;
  const G = guestConfig(ctx);
  g.active = !!G;
  g.mesh.visible = !!G;
  g.inToilet = false;
  g.laughT = 0;
  g.petCooldown = 0;
  g.reportCooldown = 0;
  g.seen = false;
  g.sense = null;
  npcClearPath(g);
  if (!G) {
    g.state = 'off';
    return;
  }
  g.mesh.position.set(G.DOOR_OUTSIDE.x, 0, G.DOOR_OUTSIDE.z);
  g.yaw = Math.PI; // menghadap ke dalam rumah (−Z)
  g.mesh.rotation.y = g.yaw;
  g.pose = 'stand';
  g.state = 'outside';
  g.drinkIn = rand(G.DRINK_EVERY);
}

function rand([a, b]) {
  return a + Math.random() * (b - a);
}

function setState(g, state) {
  g.state = state;
  g.t = 0;
  npcClearPath(g);
}

function say(ctx, text) {
  const g = ctx.guest;
  const p = g.mesh.position;
  ctx.floatText.spawn(text, { x: p.x, y: OWNER.EYE_HEIGHT_STAND * g.scale + FLOAT_TEXT.SPEECH_HEIGHT, z: p.z }, 'speech', { duration: FLOAT_TEXT.SPEECH_DURATION });
  ctx.audio.play('guestMumble', { x: p.x, z: p.z });
}

function sitAt(g, seat) {
  g.mesh.position.set(seat.x, 0, seat.z);
  g.yaw = seat.yaw;
  g.mesh.rotation.y = g.yaw;
}

// Bisa bereaksi pada kucing? (tidak di pembuka/penutup/toilet/sedang sibuk)
function available(g) {
  return g.state === 'seated' || g.state === 'kitchen' || g.state === 'toSeat';
}

// Diperintah visit.js
export function guestDo(ctx, state) {
  const g = ctx.guest;
  if (!g.active) return;
  setState(g, state);
}

export function guestIsBusy(ctx) {
  const g = ctx.guest;
  return !available(g);
}

// Teleport ke kursi (lewati adegan pembuka)
export function guestSitNow(ctx) {
  const g = ctx.guest;
  const G = guestConfig(ctx);
  sitAt(g, G.GUEST_SEAT);
  g.pose = 'sitTalk';
  setState(g, 'seated');
}

// Meong di dekat tamu memancingnya mendekat (didaftarkan via onNoise di main.js)
export function guestHearNoise(ctx, ev) {
  const g = ctx.guest;
  const G = guestConfig(ctx);
  if (!g || !g.active || !G || ev.source !== 'meow' || !available(g)) return;
  const p = g.mesh.position;
  if (Math.hypot(ev.x - p.x, ev.z - p.z) > G.MEOW_LURE_RADIUS) return;
  say(ctx, 'Pus?');
  setState(g, 'approach');
  g.unseenT = 0;
  g.lure = { x: ev.x, z: ev.z };
}

// Pose kucing saat dielus: duduk tenang, kepala menengadah
function pettedPose(p, t) {
  p.legBL.rotation.x = 1.3;
  p.legBR.rotation.x = 1.3;
  p.legFL.rotation.x = 0.25;
  p.legFR.rotation.x = 0.25;
  p.bodyPivot.rotation.x = -0.35;
  p.headGroup.rotation.x = -0.25 + Math.sin(t * 4) * 0.05;
}

function updatePerception(ctx, g, dt) {
  g.senseT -= dt;
  if (g.senseT > 1e-6) return; // dibatasi PERCEPTION_HZ (hemat raycast)
  g.senseT += 1 / F.PERCEPTION_HZ;
  if (g.senseT <= 0) g.senseT = 1 / F.PERCEPTION_HZ;
  const p = g.mesh.position;
  const eyeY = (isSittingPose(g.pose) ? OWNER.EYE_HEIGHT_SIT : OWNER.EYE_HEIGHT_STAND) * g.scale;
  g.eye = { x: p.x, y: eyeY, z: p.z };
  g.lookYaw = g.yaw + g.headYaw;
  g.sense = senseCat(ctx, g.eye, g.lookYaw);
  g.seen = g.sense.visibility > 0;
}

// Kucing duduk di kursi tamu yang direbutnya (tamu tertawa, bukan memanggil)
function onStolenChair(ctx, G) {
  if (!ctx.visit || !ctx.visit.chairStolen) return false;
  const c = ctx.cat.mesh.position;
  return Math.hypot(c.x - G.GUEST_SEAT.x, c.z - G.GUEST_SEAT.z) < G.PET_DIST;
}

function startLaugh(ctx, g, text) {
  say(ctx, text);
  ctx.audio.play('guestLaugh');
  g.laughT = guestConfig(ctx).LAUGH_TIME;
}

export function updateGuest(ctx, dt) {
  const g = ctx.guest;
  if (!g || !g.active) return;
  const G = guestConfig(ctx);
  const cat = ctx.cat;
  g.clock += dt;
  g.petCooldown = Math.max(0, g.petCooldown - dt);
  g.reportCooldown = Math.max(0, g.reportCooldown - dt);
  if (g.laughT > 0) g.laughT = Math.max(0, g.laughT - dt);

  // Alur KETAHUAN: tamu ikut tertawa
  if (ctx.capture.active) {
    if (g.laughT <= 0 && g.state !== 'off') startLaugh(ctx, g, 'Hahaha!');
    if (g.state === 'approach' || g.state === 'pet') setState(g, 'toSeat');
  }

  const visible = g.state !== 'outside' && g.state !== 'off';
  if (visible && g.state !== 'toilet' && g.state !== 'leave') updatePerception(ctx, g, dt);
  else g.seen = false;

  // Bereaksi pada kucing yang terlihat: kenakalan selalu dilaporkan (juga
  // saat sedang mendekat); memanggil hanya saat santai
  const canReport = available(g) || g.state === 'approach' || g.state === 'waitSeat';
  if (g.seen && canReport && !ctx.capture.active) {
    const act = cat.action;
    if (act && act.type !== 'petted') {
      // Melihat kenakalan: tertawa & mengadu ke pemilik
      if (g.reportCooldown <= 0) {
        g.reportCooldown = G.REPORT_COOLDOWN;
        startLaugh(ctx, g, 'Kucingmu nakal!');
        ownerReport(ctx, cat.mesh.position, G.REPORT_SUSPICION);
      }
    } else if (available(g) && g.petCooldown <= 0 && !cat.inBox && !onStolenChair(ctx, G)) {
      // "Pus, pus!" lalu mendekat (pemilik menoleh ke arah tamu)
      say(ctx, 'Pus, pus!');
      ctx.audio.play('pusPus');
      emitNoise(ctx, { x: g.mesh.position.x, z: g.mesh.position.z, radius: G.CALL_RADIUS, source: 'guestCall' });
      setState(g, 'approach');
      g.unseenT = 0;
      g.lure = null;
    }
  }

  switch (g.state) {
    case 'outside':
      g.pose = 'stand';
      break;
    case 'enter': {
      // Masuk lewat pintu depan (di luar grid navigasi: jalan lurus)
      const t = G.DOOR_INSIDE;
      const p = g.mesh.position;
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      const step = G.APPROACH_SPEED * dt;
      if (d > step) {
        p.x += ((t.x - p.x) / d) * step;
        p.z += ((t.z - p.z) / d) * step;
        g.walkPhase += step * OWNER_ANIM.WALK_STRIDE;
        g.pose = 'walk';
      } else {
        p.set(t.x, 0, t.z);
        g.pose = 'stand';
      }
      break;
    }
    case 'toSeat': {
      const seat = G.GUEST_SEAT;
      if (npcWalkTo(ctx, g, seat.approach, OWNER.WALK_SPEED * g.scale, dt)) {
        const c = cat.mesh.position;
        if (Math.hypot(c.x - seat.x, c.z - seat.z) < G.PET_DIST) {
          // Kursinya direbut kucing: tertawa, menunggu sampai kucing pergi
          startLaugh(ctx, g, 'Hei, itu kursiku!');
          setState(g, 'waitSeat');
        } else {
          sitAt(g, seat);
          setState(g, 'seated');
        }
      }
      break;
    }
    case 'waitSeat': {
      const seat = G.GUEST_SEAT;
      const c = cat.mesh.position;
      npcLookAt(g, c, dt, true);
      g.pose = g.laughT > 0 ? 'laugh' : 'stand';
      if (Math.hypot(c.x - seat.x, c.z - seat.z) >= G.PET_DIST) {
        sitAt(g, seat);
        setState(g, 'seated');
      }
      break;
    }
    case 'seated': {
      sitAt(g, G.GUEST_SEAT);
      // Menatap pemilik, sesekali minum teh
      if (ctx.owner.mesh.visible) npcLookAt(g, ctx.owner.mesh.position, dt, false);
      g.drinkIn -= dt;
      if (g.drinkIn <= 0) {
        g.drinkT = G.DRINK_DURATION;
        g.drinkIn = rand(G.DRINK_EVERY);
      }
      if (g.drinkT > 0) g.drinkT -= dt;
      g.pose = g.laughT > 0 ? 'sitLaugh' : g.drinkT > 0 ? 'sitDrink' : 'sitTalk';
      break;
    }
    case 'kitchen': {
      const spot = G.GUEST_KITCHEN;
      if (npcWalkTo(ctx, g, spot, OWNER.WALK_SPEED * g.scale, dt)) {
        npcTurnTowards(g, spot.yaw, dt);
        g.pose = g.laughT > 0 ? 'laugh' : 'drink';
      }
      break;
    }
    case 'toilet': {
      // Ke kamar mandi; pintu tertutup selama di dalam (owner/index.js)
      const spot = G.TOILET_SPOT || { x: -1.5, z: -3.0 };
      if (!g.inToilet) {
        if (npcWalkTo(ctx, g, spot, OWNER.WALK_SPEED * g.scale, dt)) {
          g.inToilet = true;
          g.t = 0;
        }
      } else {
        g.t += dt;
        g.pose = 'stand';
        if (g.t >= G.TOILET_DURATION) {
          g.inToilet = false;
          g.toiletDone = true;
          setState(g, 'toSeat');
        }
      }
      break;
    }
    case 'approach': {
      g.t += dt;
      const c = cat.mesh.position;
      const target = g.lure && !g.seen ? g.lure : { x: c.x, z: c.z };
      if (g.seen) {
        g.unseenT = 0;
        g.lure = null;
      } else {
        g.unseenT += dt;
      }
      const p = g.mesh.position;
      const dist = Math.hypot(c.x - p.x, c.z - p.z);
      // Menyerah: kucing tak terlihat lama, atau terlalu jauh
      if ((!g.lure && g.unseenT >= G.GIVE_UP_UNSEEN) || dist > G.GIVE_UP_DIST || (g.lure && g.t > G.GIVE_UP_UNSEEN * 2)) {
        g.petCooldown = Math.max(g.petCooldown, G.CALL_COOLDOWN);
        setState(g, ctx.visit && ctx.visit.phase === 'kitchen' ? 'kitchen' : 'toSeat'); // kembali sesuai jadwal saat ini
        break;
      }
      const catSpeed = Math.hypot(cat.vel.x, cat.vel.z);
      const pettable = !cat.inBox && !hideSpotOf(cat) && !cat.action && !cat.riding && c.y < G.PET_MAX_HEIGHT;
      if (dist <= G.PET_DIST && pettable && catSpeed <= G.PET_MAX_CAT_SPEED && g.seen) {
        setState(g, 'pet');
        startCatAction(cat, { type: 'petted', duration: G.PET_DURATION, pose: pettedPose });
        g.heartT = 0;
        g.purrT = 0;
        break;
      }
      const arrived = npcWalkTo(ctx, g, target, G.APPROACH_SPEED, dt, true);
      if (dist <= G.PET_DIST) npcLookAt(g, c, dt, true);
      // Kucing di tempat yang tak terjangkau (mis. tengah meja): menyerah
      g.stuckT = arrived && dist > G.PET_DIST ? (g.stuckT || 0) + dt : 0;
      if (g.stuckT >= G.REACH_WAIT) {
        g.stuckT = 0;
        g.petCooldown = Math.max(g.petCooldown, G.CALL_COOLDOWN);
        setState(g, ctx.visit && ctx.visit.phase === 'kitchen' ? 'kitchen' : 'toSeat');
      }
      break;
    }
    case 'pet': {
      g.t += dt;
      const c = cat.mesh.position;
      npcLookAt(g, c, dt, true);
      g.pose = c.y < 0.3 ? 'pet' : 'stand';
      g.heartT -= dt;
      if (g.heartT <= 0) {
        g.heartT = F.PET_HEARTS_INTERVAL;
        ctx.floatText.spawn('♥', { x: c.x, y: c.y + 0.35, z: c.z }, 'heart');
      }
      g.purrT -= dt;
      if (g.purrT <= 0) {
        g.purrT = F.PURR_INTERVAL;
        ctx.audio.play('purr');
      }
      if (g.t >= G.PET_DURATION) {
        // Camilan ikan dari tamu
        ctx.stamina.value = Math.min(STAMINA.MAX, ctx.stamina.value + G.PET_STAMINA);
        ctx.audio.play('fishTreat');
        ctx.floatText.spawn(`🐟 +${G.PET_STAMINA}`, { x: c.x, y: c.y + 0.4, z: c.z }, 'chaos');
        g.petCooldown = G.PET_COOLDOWN;
        setState(g, ctx.visit && ctx.visit.phase === 'kitchen' ? 'kitchen' : 'toSeat'); // kembali sesuai jadwal saat ini
      }
      break;
    }
    case 'leave': {
      // Penutup: ke pintu depan lalu melambai
      const t = G.DOOR_INSIDE;
      if (npcWalkTo(ctx, g, t, OWNER.WALK_SPEED * g.scale, dt)) {
        npcTurnTowards(g, Math.PI, dt); // menghadap pemilik (ke dalam rumah), lalu melambai
        g.pose = 'wave';
      }
      break;
    }
    default:
      break;
  }
  if (g.laughT > 0 && !isSittingPose(g.pose) && g.state !== 'pet' && g.state !== 'leave' && g.pose !== 'walk') g.pose = 'laugh';
  animateOwner(g, dt, g.clock);
}
