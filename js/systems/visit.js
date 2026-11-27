// Kunjungan tamu (Level 5): pembuka, jadwal berdua, penutup.
// - Pembuka ±5 detik (Enter = lewati; kucing sudah bisa bergerak): bel pintu
//   → pemilik membuka pintu depan → tamu masuk → keduanya ke meja makan.
// - Mengobrol di meja makan; tiap KITCHEN_EVERY detik ke dapur bersama;
//   tamu ke toilet sekali (waktu acak di TOILET_WINDOW).
// - Penutup saat waktu habis: tamu ke pintu & melambai, lalu layar hasil.
// Hanya aktif di level dengan blok GUEST.
import { actionPressed } from '../core/input.js';
import { currentLevel } from '../core/state.js';
import { resetFrontDoor, setFrontDoorOpen, updateFrontDoor } from '../world/house.js';
import { ownerVisitActivity } from '../entities/owner/index.js';
import { guestDo, guestSitNow, guestIsBusy } from '../entities/guest/index.js';

function rand([a, b]) {
  return a + Math.random() * (b - a);
}

export function visitConfig(ctx) {
  return currentLevel(ctx.state).GUEST || null;
}

export function resetVisit(ctx) {
  if (ctx.frontDoor) resetFrontDoor(ctx.frontDoor);
  const G = visitConfig(ctx);
  if (!G) {
    ctx.visit = null;
    if (ctx.hud.setVisitBanner) ctx.hud.setVisitBanner(false);
    return;
  }
  ctx.visit = {
    G,
    phase: 'intro', // intro | chat | kitchen | outro
    t: 0,
    bell: false,
    doorOpened: false,
    entered: false,
    kitchenIn: G.KITCHEN_EVERY,
    toiletAt: rand(G.TOILET_WINDOW),
    toiletDone: false,
    outro: null,
    outroDone: false,
    chairStolen: false
  };
  if (ctx.hud.setVisitBanner) ctx.hud.setVisitBanner(true);
}

function endIntro(ctx, skipped) {
  const v = ctx.visit;
  v.phase = 'chat';
  v.t = 0;
  if (ctx.frontDoor) setFrontDoorOpen(ctx.frontDoor, false);
  if (ctx.hud.setVisitBanner) ctx.hud.setVisitBanner(false);
  if (skipped) {
    // Lewati: langsung duduk berdua di meja makan, pintu tertutup
    guestSitNow(ctx);
    const o = ctx.owner;
    const seat = v.G.OWNER_SEAT;
    o.mesh.position.set(seat.x, 0, seat.z);
    o.yaw = seat.yaw;
    o.mesh.rotation.y = o.yaw;
    ownerVisitActivity(ctx, 'toSeat');
    if (ctx.frontDoor) resetFrontDoor(ctx.frontDoor);
  } else {
    ownerVisitActivity(ctx, 'toSeat');
    guestDo(ctx, 'toSeat');
  }
}

// Waktu habis: mulai penutup (level.js menunggu outroDone)
export function startOutro(ctx) {
  const v = ctx.visit;
  if (!v || v.outro) return;
  v.phase = 'outro';
  v.outro = { t: 0 };
  guestDo(ctx, 'leave');
  ctx.owner.state = 'routine';
  ownerVisitActivity(ctx, 'seeOff');
}

export function updateVisit(ctx, dt) {
  const v = ctx.visit;
  if (!v) return;
  const G = v.G;
  if (ctx.frontDoor) updateFrontDoor(ctx.frontDoor, dt);

  if (v.phase === 'intro') {
    v.t += dt;
    if (!v.bell && v.t >= G.BELL_AT) {
      v.bell = true;
      ctx.audio.play('doorbell');
    }
    if (!v.doorOpened && v.t >= G.DOOR_OPEN_AT) {
      v.doorOpened = true;
      setFrontDoorOpen(ctx.frontDoor, true);
      ctx.audio.play('frontDoor');
    }
    if (!v.entered && v.t >= G.GUEST_ENTER_AT) {
      v.entered = true;
      guestDo(ctx, 'enter');
    }
    const skip = actionPressed(ctx.input, 'skip');
    if (skip || v.t >= G.INTRO_DURATION) endIntro(ctx, !!skip);
    return;
  }

  if (v.phase === 'outro') {
    v.outro.t += dt;
    if (v.outro.t >= G.OUTRO_DURATION * 0.3) setFrontDoorOpen(ctx.frontDoor, true);
    if (v.outro.t >= G.OUTRO_DURATION) v.outroDone = true;
    return;
  }

  const guest = ctx.guest;
  const o = ctx.owner;

  // Tamu ke toilet sekali
  if (!v.toiletDone && ctx.time >= v.toiletAt && guest.state === 'seated' && v.phase === 'chat') {
    v.toiletDone = true;
    guestDo(ctx, 'toilet');
  }

  if (v.phase === 'chat') {
    v.kitchenIn -= dt;
    // Ke dapur bersama (jika keduanya sedang santai)
    if (v.kitchenIn <= 0 && o.state === 'routine' && o.activity === 'chat' && guest.state === 'seated') {
      v.phase = 'kitchen';
      v.t = 0;
      ownerVisitActivity(ctx, 'kitchen');
      guestDo(ctx, 'kitchen');
    }
  } else if (v.phase === 'kitchen') {
    // Hitung waktu di dapur sejak pemilik sampai
    if (o.activity === 'kitchen' && o.phase === 'do') v.t += dt;
    const ownerBusy = o.state !== 'routine';
    if (v.t >= G.KITCHEN_DURATION || (ownerBusy && v.t > 0)) {
      v.phase = 'chat';
      v.kitchenIn = G.KITCHEN_EVERY;
      ownerVisitActivity(ctx, 'toSeat');
      if (!guestIsBusy(ctx) || guest.state === 'kitchen') guestDo(ctx, 'toSeat');
    }
  }
}
