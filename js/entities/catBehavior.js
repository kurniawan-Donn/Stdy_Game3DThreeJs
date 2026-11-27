// Tingkah kucing di luar gerak biasa (GDD §6, §12):
// - menumpang robot vacuum (mendarat di atasnya; WASD diabaikan, Spasi = turun)
// - tidur di sinar matahari (tahan E di zona matahari; stamina pulih cepat, "Zzz")
// - loaf (diam LOAF_DELAY detik) dengan ikon hati, animasi kecil acak saat diam
// - zoomies setelah makan catnip (sangat cepat & senyap)
// Fungsi pose dipanggil di akhir animateCat (entities/cat.js).
import { actionPressed } from '../core/input.js';
import { IDLE, RIDE, SUN_NAP, SUN_ZONES, VACUUM, CATNIP, CUSTOMIZATION } from '../config.js';
import { registerInteractable } from '../systems/interaction.js';
import { crawlBoxAt } from '../systems/collision.js';

const IDLE_ANIMS = ['lick', 'scratch', 'yawn'];

export function isInSunZone(x, z) {
  for (const s of SUN_ZONES) {
    if (Math.abs(x - s.x) <= s.width / 2 && Math.abs(z - s.z) <= s.depth / 2) return true;
  }
  return false;
}

export function resetCatBehavior(cat) {
  cat.riding = null;
  cat.sleeping = false;
  cat.loaf = false;
  cat.idleT = 0;
  cat.idleAnim = null;
  cat.nextIdleAnimAt = IDLE.ANIM_DELAY;
  cat.heartT = 0;
  cat.zzzT = 0;
  cat.zoomiesT = 0;
  cat.remountBlockT = 0;
  cat.inBox = null;
}

// Tahan E di zona matahari = tidur (didaftarkan sekali di main.js)
export function registerCatInteractions(ctx) {
  const cat = ctx.cat;
  registerInteractable(ctx.interaction, {
    label: 'Tahan E: Tidur',
    position: cat.mesh.position,
    markerHeight: SUN_NAP.MARKER_HEIGHT,
    hold: SUN_NAP.HOLD_TIME,
    bias: SUN_NAP.PROMPT_BIAS, // objek lain di dekatnya didahulukan
    isEnabled: (c) => c.cat.isGrounded && !c.cat.inBox && !c.cat.riding && !c.cat.sleeping && !c.cat.underCrawl &&
      c.cat.zoomiesT <= 0 && !c.weather && isInSunZone(c.cat.mesh.position.x, c.cat.mesh.position.z), // hujan: tidak ada sinar matahari
    onInteract: (c) => startSleep(c)
  });
}

export function startSleep(ctx) {
  const cat = ctx.cat;
  cat.sleeping = true;
  cat.loaf = false;
  cat.idleAnim = null;
  cat.vel.set(0, 0, 0);
  cat.zzzT = 0;
  ctx.audio.play('catYawn');
}

export function wake(ctx) {
  ctx.cat.sleeping = false;
  ctx.cat.idleT = 0;
  // E yang dipakai untuk bangun tidak langsung memicu tidur lagi
  ctx.interaction.holdDone = true;
}

// --- Menumpang robot vacuum -------------------------------------------------

// Dipanggil saat kucing jatuh: mendarat di atas robot?
export function tryMountRobot(ctx, prevY) {
  const cat = ctx.cat;
  if (cat.remountBlockT > 0 || cat.inBox || cat.vel.y > 0) return false;
  const p = cat.mesh.position;
  if (p.y > VACUUM.HEIGHT + RIDE.MOUNT_TOLERANCE || prevY < VACUUM.HEIGHT - 0.02) return false;
  for (const obs of ctx.obstacles) {
    if (obs.rider) continue;
    const d = Math.hypot(p.x - obs.mesh.position.x, p.z - obs.mesh.position.z);
    if (d <= RIDE.MOUNT_RADIUS) {
      cat.riding = obs;
      obs.rider = cat;
      cat.isGrounded = true;
      cat.vel.set(0, 0, 0);
      ctx.audio.play('robotBeep');
      return true;
    }
  }
  return false;
}

export function dismount(ctx, hop) {
  const cat = ctx.cat;
  const obs = cat.riding;
  if (!obs) return;
  obs.rider = null;
  cat.riding = null;
  ctx.audio.play('robotOff');
  cat.remountBlockT = RIDE.REMOUNT_BLOCK;
  if (hop) {
    cat.vel.set(Math.sin(cat.yaw) * RIDE.DISMOUNT_SPEED, RIDE.DISMOUNT_UP, Math.cos(cat.yaw) * RIDE.DISMOUNT_SPEED);
    cat.isGrounded = false;
  } else {
    cat.mesh.position.y = 0;
    cat.vel.set(0, 0, 0);
  }
}

// Kucing mengikuti robot. Mengembalikan true jika masih menumpang.
export function updateRiding(ctx, dt) {
  const cat = ctx.cat;
  const obs = cat.riding;
  if (!obs) return false;
  if (actionPressed(ctx.input, 'jump')) {
    dismount(ctx, true);
    return false;
  }
  const r = obs.mesh.position;
  // Kolong terlalu rendah untuk kucing yang duduk: turun otomatis
  const crawl = crawlBoxAt(ctx.colliders, r.x, r.z, 0);
  if (crawl && crawl.crawlHeight < VACUUM.HEIGHT + RIDE.SEATED_HEIGHT) {
    dismount(ctx, false);
    return false;
  }
  cat.mesh.position.set(r.x, VACUUM.HEIGHT, r.z);
  cat.vel.set(obs.vel.x, 0, obs.vel.z);
  let diff = obs.heading - cat.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cat.yaw += diff * Math.min(1, RIDE.TURN_LERP * dt);
  cat.mesh.rotation.y = cat.yaw;
  cat.isGrounded = true;
  cat.moveMode = 'walk';
  return true;
}

// --- Diam: animasi acak, loaf, tidur ----------------------------------------

export function updateIdle(ctx, dt, hasInput) {
  const cat = ctx.cat;
  if (cat.remountBlockT > 0) cat.remountBlockT -= dt;
  if (cat.zoomiesT > 0) cat.zoomiesT = Math.max(0, cat.zoomiesT - dt);

  const p = cat.mesh.position;
  if (cat.sleeping) {
    cat.zzzT -= dt;
    if (cat.zzzT <= 0) {
      cat.zzzT = SUN_NAP.ZZZ_INTERVAL;
      ctx.floatText.spawn('Zzz', { x: p.x, y: p.y + 0.1, z: p.z }, 'zzz');
    }
    return;
  }

  const calm = !hasInput && cat.isGrounded && !cat.action && !cat.inBox && !cat.riding &&
    Math.hypot(cat.vel.x, cat.vel.z) < IDLE.CALM_SPEED && cat.zoomiesT <= 0;
  if (!calm) {
    cat.idleT = 0;
    cat.loaf = false;
    cat.idleAnim = null;
    cat.nextIdleAnimAt = IDLE.ANIM_DELAY;
    return;
  }
  cat.idleT += dt;

  if (cat.idleT >= IDLE.LOAF_DELAY) {
    if (!cat.loaf) {
      cat.loaf = true;
      cat.idleAnim = null;
      cat.heartT = 0;
    }
    cat.heartT -= dt;
    if (cat.heartT <= 0) {
      cat.heartT = IDLE.LOAF_HEART_INTERVAL;
      ctx.floatText.spawn('♥', { x: p.x, y: p.y + 0.05, z: p.z }, 'heart');
    }
    return;
  }

  // Animasi kecil acak sebelum loaf
  if (cat.idleAnim) {
    cat.idleAnim.t += dt;
    if (cat.idleAnim.t >= IDLE.ANIM_DURATION) cat.idleAnim = null;
  } else if (cat.idleT >= cat.nextIdleAnimAt) {
    cat.idleAnim = { type: IDLE_ANIMS[Math.floor(Math.random() * IDLE_ANIMS.length)], t: 0 };
    cat.nextIdleAnimAt = cat.idleT + IDLE.ANIM_DURATION +
      IDLE.ANIM_INTERVAL_MIN + Math.random() * (IDLE.ANIM_INTERVAL_MAX - IDLE.ANIM_INTERVAL_MIN);
  }
}

// --- Pose (menimpa pose normal di akhir animateCat) --------------------------

export function applyBehaviorPose(cat, dt) {
  const p = cat.parts;
  const k = Math.min(1, IDLE.POSE_LERP * dt);
  const lerp = (a, b) => a + (b - a) * k;
  p.headGroup.rotation.z = 0;

  if (cat.loaf || cat.sleeping) {
    // Duduk melingkar seperti roti: kaki terlipat di bawah badan
    // Kaki depan dilipat ke belakang & kaki belakang ke depan (terselip di
    // bawah badan), badan turun sampai perut menyentuh alas
    p.legFL.rotation.x = lerp(p.legFL.rotation.x, IDLE.LOAF_LEG_FOLD);
    p.legFR.rotation.x = lerp(p.legFR.rotation.x, IDLE.LOAF_LEG_FOLD);
    p.legBL.rotation.x = lerp(p.legBL.rotation.x, -IDLE.LOAF_LEG_FOLD);
    p.legBR.rotation.x = lerp(p.legBR.rotation.x, -IDLE.LOAF_LEG_FOLD);
    p.bodyPivot.scale.y *= 1 - IDLE.LOAF_SQUASH;
    p.bodyPivot.position.y = -(cat.chonky ? CUSTOMIZATION.CHONKY.LOAF_DROP : IDLE.LOAF_DROP);
    if (cat.chonky) {
      // Loaf chonky lebih bulat
      p.bodyPivot.scale.x *= CUSTOMIZATION.CHONKY.LOAF_WIDEN;
      p.bodyPivot.scale.z *= CUSTOMIZATION.CHONKY.LOAF_WIDEN;
    }
    p.bodyPivot.rotation.x = 0;
    p.tailPivot.rotation.z = 1.2;
    if (cat.sleeping) p.headGroup.rotation.x = SUN_NAP.HEAD_DIP;
    return;
  }

  if (cat.riding) {
    // Duduk tegak di atas robot
    p.legBL.rotation.x = lerp(p.legBL.rotation.x, 1.3);
    p.legBR.rotation.x = lerp(p.legBR.rotation.x, 1.3);
    p.legFL.rotation.x = lerp(p.legFL.rotation.x, 0.25);
    p.legFR.rotation.x = lerp(p.legFR.rotation.x, 0.25);
    p.bodyPivot.rotation.x = RIDE.SIT_LEAN;
    p.bodyPivot.position.y = 0;
    p.tailPivot.rotation.z = 0.9;
    return;
  }

  if (cat.zoomiesT > 0) {
    p.tailPivot.rotation.x = -CATNIP.TAIL_UP; // ekor tegak heboh
  } else {
    p.tailPivot.rotation.x = 0;
  }

  const a = cat.idleAnim;
  if (!a) return;
  const t = a.t / IDLE.ANIM_DURATION;
  const w = Math.sin(Math.PI * t); // naik lalu turun
  if (a.type === 'lick') {
    // Menjilat kaki depan
    p.legFR.rotation.x = -1.3 * w;
    p.headGroup.rotation.x = (0.45 + Math.sin(a.t * 18) * 0.08) * w;
    p.headGroup.rotation.y = -0.35 * w;
  } else if (a.type === 'scratch') {
    // Menggaruk telinga dengan kaki belakang
    p.legBR.rotation.x = (-1.2 + Math.sin(a.t * 22) * 0.25) * w;
    p.headGroup.rotation.z = 0.35 * w;
    p.bodyPivot.rotation.x = -0.15 * w;
  } else if (a.type === 'yawn') {
    p.headGroup.rotation.x = -0.45 * w;
  }
}
