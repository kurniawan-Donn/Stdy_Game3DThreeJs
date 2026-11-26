// Alur KETAHUAN (GDD §9): slow motion → desaturasi + vignette + teks
// "KETAHUAN!" sambil pemilik mengangkat kucing → fade hitam → kucing muncul di
// keranjang, nyawa −1, kebal sebentar → fade masuk. Nyawa habis = layar hasil.
// Durasi dihitung dalam waktu nyata (bukan waktu dunia yang diperlambat).
import { CAPTURE, BASKET } from '../config.js';
import { finishCatAction, resetCatPose } from '../entities/cat.js';
import { ownerAfterCapture } from '../entities/owner/index.js';
import { triggerShake, snapCameraBehind } from '../core/camera.js';
import { clearNoise } from './noise.js';
import { hideInteraction } from './interaction.js';
import { endLevel } from './level.js';
import { tossBox } from '../entities/hideBox.js';
import { dismount, wake } from '../entities/catBehavior.js';
import { currentLevel } from '../core/state.js';

export function createCapture() {
  return { active: false, phase: 'idle', t: 0, timeScale: 1, liftFrom: null };
}

export function resetCapture(ctx) {
  const c = ctx.capture;
  c.active = false;
  c.phase = 'idle';
  c.t = 0;
  c.timeScale = 1;
  ctx.screenFx.reset();
}

export function startCapture(ctx) {
  const c = ctx.capture;
  if (c.active) return;
  const { cat, owner } = ctx;

  // Kenakalan yang sedang berjalan diselesaikan seketika (gelas tetap jatuh)
  finishCatAction(cat);
  // Kardus diangkat & dilempar; kucing turun dari robot / bangun
  if (cat.inBox) tossBox(ctx);
  if (cat.riding) dismount(ctx, false);
  if (cat.sleeping) wake(ctx);
  cat.loaf = false;
  cat.zoomiesT = 0;
  hideInteraction(ctx);

  c.active = true;
  c.phase = 'slowmo';
  c.t = 0;
  c.timeScale = CAPTURE.TIME_SCALE;
  c.liftFrom = cat.mesh.position.clone();

  owner.state = 'capture';
  owner.pose = 'lift';
  owner.path = null;

  ctx.screenFx.showCaughtText(true);
  ctx.audio.play('caught');
  triggerShake(ctx.cameraShake, CAPTURE.SHAKE_AMPLITUDE, CAPTURE.SHAKE_DURATION);
}

// Kucing diangkat ke depan badan pemilik
function updateLift(ctx, k) {
  const { cat, owner } = ctx;
  const o = owner.mesh.position;
  const fx = Math.sin(owner.yaw);
  const fz = Math.cos(owner.yaw);
  const tx = o.x + fx * CAPTURE.LIFT_DISTANCE;
  const tz = o.z + fz * CAPTURE.LIFT_DISTANCE;
  const p = cat.mesh.position;
  const from = ctx.capture.liftFrom;
  p.set(
    from.x + (tx - from.x) * k,
    from.y + (CAPTURE.LIFT_HEIGHT - from.y) * k,
    from.z + (tz - from.z) * k
  );
  cat.vel.set(0, 0, 0);
  // Kucing menghadap pemilik, kaki menggantung
  cat.yaw = owner.yaw + Math.PI;
  cat.mesh.rotation.y = cat.yaw;
  for (const leg of [cat.parts.legFL, cat.parts.legFR, cat.parts.legBL, cat.parts.legBR]) {
    leg.rotation.x = 0.3 * k;
  }
}

function respawnInBasket(ctx) {
  const { cat, state } = ctx;
  finishCatAction(cat);
  resetCatPose(cat);
  cat.mesh.position.set(BASKET.x, 0, BASKET.z);
  cat.vel.set(0, 0, 0);
  cat.isGrounded = true;
  cat.yaw = Math.PI; // menghadap ke dalam ruangan
  cat.mesh.rotation.y = cat.yaw;
  cat.mesh.visible = true;
  state.invulnerableTimer = CAPTURE.INVULNERABLE;
  clearNoise(ctx.noise);
  ownerAfterCapture(ctx);
  snapCameraBehind(ctx); // di balik layar hitam: kamera kembali normal
}

// dt = waktu nyata
export function updateCapture(ctx, dt) {
  const c = ctx.capture;
  if (!c.active) return;
  const fx = ctx.screenFx;
  c.t += dt;

  switch (c.phase) {
    case 'slowmo': {
      const k = Math.min(1, c.t / CAPTURE.SLOWMO_DURATION);
      fx.setDesaturation(Math.min(1, c.t / CAPTURE.DESATURATE_TIME));
      fx.setVignette(CAPTURE.VIGNETTE_MAX * Math.min(1, c.t / CAPTURE.DESATURATE_TIME));
      updateLift(ctx, Math.min(1, k * 2));
      if (c.t >= CAPTURE.SLOWMO_DURATION) {
        c.phase = 'fadeOut';
        c.t = 0;
      }
      break;
    }
    case 'fadeOut':
      updateLift(ctx, 1);
      fx.setFade(Math.min(1, c.t / CAPTURE.FADE_OUT));
      if (c.t >= CAPTURE.FADE_OUT) {
        c.phase = 'black';
        c.t = 0;
        onBlack(ctx);
      }
      break;
    case 'black':
      if (c.t >= CAPTURE.BLACK_HOLD) {
        c.phase = 'fadeIn';
        c.t = 0;
      }
      break;
    case 'fadeIn':
      fx.setFade(Math.max(0, 1 - c.t / CAPTURE.FADE_IN));
      if (c.t >= CAPTURE.FADE_IN) {
        c.active = false;
        c.phase = 'idle';
        fx.setFade(0);
      }
      break;
    default:
      break;
  }
}

// Saat layar hitam penuh: nyawa −1, lalu respawn atau akhir level.
function onBlack(ctx) {
  const { state, hud, capture } = ctx;
  // Di Latihan (tutorial) nyawa tidak berkurang
  if (!currentLevel(state).TUTORIAL) state.lives -= 1;
  hud.setLives(state.lives);

  // Efek layar dibersihkan di balik layar hitam
  ctx.screenFx.setDesaturation(0);
  ctx.screenFx.setVignette(0);
  ctx.screenFx.showCaughtText(false);
  capture.timeScale = 1;

  if (state.lives <= 0) {
    respawnInBasket(ctx);
    resetCapture(ctx);
    endLevel(ctx, 'outOfLives');
    return;
  }
  respawnInBasket(ctx);
}
