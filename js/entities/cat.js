// Kucing pemain: model low-poly, gerakan relatif kamera, lompat, dan animasi.
import * as THREE from 'three';
import { PLAYER, PHYSICS, CAT_ANIM, NOISE, OWNER, VACUUM, HIDE_BOX, CATNIP, CUSTOMIZATION } from '../config.js';
import { buildCatModel, disposeCatModel } from './catModel.js';
import { resolveRoomCollisions, getGroundHeight, pushOutOfCircle, crawlBoxAt } from '../systems/collision.js';
import { canRun, trySpendHighJump, updateStamina, isExhausted } from '../systems/stamina.js';
import { emitNoise } from '../systems/noise.js';
import { resetCatBehavior, updateRiding, updateIdle, tryMountRobot, wake, applyBehaviorPose } from './catBehavior.js';

// Parameter per mode gerak
const MODE_SPEED = {
  walk: PLAYER.WALK_SPEED,
  run: PLAYER.RUN_SPEED,
  sneak: PLAYER.SNEAK_SPEED
};
const MODE_STEP_RADIUS = {
  walk: NOISE.WALK_STEP_RADIUS,
  run: NOISE.RUN_STEP_RADIUS,
  sneak: NOISE.SNEAK_STEP_RADIUS
};

// Vektor kerja privat untuk arah kamera
const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

// Membuat model kucing dalam satu THREE.Group dan objek state kucing.
export function createCat(scene, look = { cat: CUSTOMIZATION.DEFAULT_CAT, accessory: null }) {
  const mesh = new THREE.Group();
  const model = buildCatModel(look);
  mesh.add(model.bodyPivot);
  scene.add(mesh);

  return {
    mesh,
    parts: model.parts,
    look: model.look, // tampilan (kustomisasi): { cat, accessory }
    bell: model.look.accessory === 'bell', // kalung lonceng: langkah berbunyi, Chaos ×1,2
    darkStealth: !!model.variant.darkStealth, // kucing hitam: sulit terlihat di area gelap
    chonky: !!model.variant.chonky,
    vel: new THREE.Vector3(),
    isGrounded: true,
    groundHeight: 0,
    landingSquashTimer: 0,
    yaw: PLAYER.START_YAW,
    animClock: 0,
    walkCycle: 0,
    lastStepIndex: 0,
    moveMode: 'walk', // 'walk' | 'run' | 'sneak'
    profile: PLAYER.NORMAL_PROFILE, // seberapa mudah terlihat (Fase 3)
    crouch: 0, // 0..1, animasi merendah saat mengendap
    isPanting: false,
    meowTimer: 0,
    camYaw: 0, // sudut ke kamera relatif terhadap badan (untuk menoleh)
    action: null, // aksi kenakalan yang sedang berjalan (lihat startCatAction)
    underCrawl: null, // collider berkolong tempat kucing berada di bawahnya (atau null)
    // Tingkah (entities/catBehavior.js): inBox, riding, sleeping, loaf, zoomiesT, ...
    inBox: null,
    riding: null,
    sleeping: false,
    loaf: false,
    idleT: 0,
    idleAnim: null,
    nextIdleAnimAt: 0,
    heartT: 0,
    zzzT: 0,
    zoomiesT: 0,
    remountBlockT: 0
  };
}

// Ganti tampilan kucing (kustomisasi): model lama dilepas, model baru
// dipasang di grup yang sama. Pose & state gerak tetap.
export function setCatLook(cat, look) {
  disposeCatModel(cat.parts.bodyPivot);
  const model = buildCatModel(look);
  cat.mesh.add(model.bodyPivot);
  cat.parts = model.parts;
  cat.look = model.look;
  cat.bell = model.look.accessory === 'bell';
  cat.darkStealth = !!model.variant.darkStealth;
  cat.chonky = !!model.variant.chonky;
}

// Menjalankan aksi kenakalan: kontrol dikunci selama `duration` detik,
// kucing berputar ke `faceYaw` (opsional), `pose(parts, t, cat)` dipanggil
// tiap frame untuk animasi khusus, dan `events` [{ at, fn }] dijalankan saat
// waktunya tiba. `onEnd()` dipanggil saat aksi selesai.
export function startCatAction(cat, action) {
  cat.action = { t: 0, events: [], ...action };
  for (const ev of cat.action.events) ev.fired = false;
}

function updateCatAction(cat, dt) {
  const a = cat.action;
  if (!a) return;
  a.t += dt;
  for (const ev of a.events) {
    if (!ev.fired && a.t >= ev.at) {
      ev.fired = true;
      ev.fn();
    }
  }
  if (a.t >= a.duration) {
    cat.action = null;
    if (a.onEnd) a.onEnd();
  }
}

// Menyelesaikan aksi yang sedang berjalan seketika: semua event yang belum
// terjadi dijalankan (mis. gelas tetap dilepas), lalu aksi dihapus.
export function finishCatAction(cat) {
  const a = cat.action;
  if (!a) return;
  cat.action = null;
  for (const ev of a.events) {
    if (!ev.fired) {
      ev.fired = true;
      ev.fn();
    }
  }
  if (a.onEnd) a.onEnd();
}

// Pose netral (dipakai setelah diangkat pemilik)
export function resetCatPose(cat) {
  const p = cat.parts;
  for (const leg of [p.legFL, p.legFR, p.legBL, p.legBR]) leg.rotation.set(0, 0, 0);
  p.headGroup.rotation.set(0, 0, 0);
  p.bodyPivot.rotation.set(0, 0, 0);
  p.bodyPivot.position.y = 0;
  p.bodyPivot.scale.set(1, 1, 1);
  cat.crouch = 0;
  cat.moveMode = 'walk';
  cat.profile = PLAYER.NORMAL_PROFILE;
  cat.meowTimer = 0;
  cat.landingSquashTimer = 0;
}

// Sudut yaw dari kucing ke titik (x, z)
export function yawTowards(cat, x, z) {
  return Math.atan2(x - cat.mesh.position.x, z - cat.mesh.position.z);
}

// Kembalikan kucing ke posisi awal (animClock & walkCycle sengaja tidak direset).
export function resetCat(cat) {
  cat.isGrounded = true;
  cat.groundHeight = 0;
  cat.landingSquashTimer = 0;

  cat.mesh.visible = true;
  const p = PLAYER.START_POSITION;
  cat.mesh.position.set(p.x, p.y, p.z);
  cat.vel.set(0, 0, 0);
  cat.yaw = PLAYER.START_YAW;
  cat.mesh.rotation.y = cat.yaw;

  cat.moveMode = 'walk';
  cat.profile = PLAYER.NORMAL_PROFILE;
  cat.crouch = 0;
  cat.isPanting = false;
  cat.meowTimer = 0;
  cat.action = null;
  cat.parts.headGroup.rotation.set(0, 0, 0);
  cat.parts.tailPivot.rotation.x = 0;
  cat.lastStepIndex = Math.floor(cat.walkCycle / Math.PI);
  resetCatBehavior(cat);
}

// Update gerakan, lompat, tabrakan, animasi, dan kedip kebal.
export function updateCat(ctx, dt) {
  const { cat, input, camera, colliders, audio, state, stamina } = ctx;
  const keys = input.keys;
  const player = cat.mesh;
  const playerVel = cat.vel;

  const hasMoveInput = !!(keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] ||
    keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] || keys['Space']);

  // Tidur: bangun dengan input gerak, E, atau Q
  if (cat.sleeping && (hasMoveInput || input.pressed['KeyE'] || input.pressed['KeyQ'])) wake(ctx);
  // Menumpang robot: posisi mengikuti robot (Spasi = turun)
  if (cat.riding) updateRiding(ctx, dt);
  if (cat.riding || cat.sleeping) {
    updateStamina(stamina, dt, { running: false, grounded: true, sunNap: cat.sleeping });
    updateIdle(ctx, dt, false);
    finishCatFrame(ctx, dt);
    return;
  }

  // Selama aksi kenakalan, kontrol dikunci
  const locked = !!cat.action;
  const wantsSneak = !locked && !!keys['KeyC'];
  const wantsRun = !locked && !!(keys['ShiftLeft'] || keys['ShiftRight']);

  let inputForward = 0;
  let inputRight = 0;

  if (!locked) {
    if (keys['KeyW'] || keys['ArrowUp']) inputForward += 1;
    if (keys['KeyS'] || keys['ArrowDown']) inputForward -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) inputRight += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) inputRight -= 1;
  }

  // Vektor gerakan relatif terhadap kamera pada bidang XZ
  camera.getWorldDirection(camForward);
  camForward.y = 0;
  if (camForward.lengthSq() < 0.0001) camForward.set(0, 0, -1);
  camForward.normalize();
  camRight.crossVectors(camForward, worldUp).normalize();

  let moveX = camForward.x * inputForward + camRight.x * inputRight;
  let moveZ = camForward.z * inputForward + camRight.z * inputRight;
  const moveLen = Math.hypot(moveX, moveZ);

  // Mode gerak: mengendap menang atas lari; mengendap hanya di tanah
  // (lompat membatalkan mengendap); lari butuh stamina dan tidak terengah.
  // Di kolong yang lebih rendah dari tinggi berdiri: kucing otomatis merunduk
  cat.underCrawl = crawlBoxAt(colliders, player.position.x, player.position.z, player.position.y);
  const forcedCrouch = !!cat.underCrawl && cat.underCrawl.crawlHeight < PLAYER.HEIGHT_STAND;
  const zoomies = cat.zoomiesT > 0;
  // Di dalam kardus: selalu pelan (kecepatan mengendap)
  const sneaking = ((wantsSneak || forcedCrouch) && cat.isGrounded) || !!cat.inBox;
  const running = !sneaking && moveLen > 0 && (zoomies || (wantsRun && canRun(stamina)));
  cat.moveMode = sneaking ? 'sneak' : running ? 'run' : 'walk';
  cat.profile = sneaking ? PLAYER.SNEAK_PROFILE : PLAYER.NORMAL_PROFILE;
  const maxSpeed = zoomies && !sneaking ? CATNIP.SPEED : MODE_SPEED[cat.moveMode];

  if (moveLen > 0) {
    moveX /= moveLen;
    moveZ /= moveLen;

    const prevSpeed = Math.hypot(playerVel.x, playerVel.z);
    playerVel.x += moveX * PLAYER.ACCELERATION * dt;
    playerVel.z += moveZ * PLAYER.ACCELERATION * dt;

    // Batas kecepatan: langsung dijepit saat berakselerasi, tapi melambat
    // halus jika baru pindah ke mode yang lebih lambat (mis. lari → endap).
    const horizSpeed = Math.hypot(playerVel.x, playerVel.z);
    const allowed = Math.max(maxSpeed, prevSpeed * Math.exp(-PLAYER.SPEED_CAP_DAMPING * dt));
    if (horizSpeed > allowed) {
      const scale = allowed / horizSpeed;
      playerVel.x *= scale;
      playerVel.z *= scale;
    }

    // Sudut target dari vektor input & interpolasi jalur terpendek (-PI..PI)
    const targetYaw = Math.atan2(moveX, moveZ);
    let diff = targetYaw - cat.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cat.yaw += diff * Math.min(1, PLAYER.TURN_SPEED * dt);
    player.rotation.y = cat.yaw;
  } else {
    const friction = cat.isGrounded ? PLAYER.GROUND_FRICTION : PLAYER.AIR_FRICTION;
    const damping = Math.exp(-friction * dt);
    playerVel.x *= damping;
    playerVel.z *= damping;

    if (Math.hypot(playerVel.x, playerVel.z) < PLAYER.STOP_SPEED) {
      playerVel.x = 0;
      playerVel.z = 0;
    }
  }

  // Aksi kenakalan: putar badan menghadap target
  if (locked && cat.action.faceYaw !== undefined) {
    let diff = cat.action.faceYaw - cat.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cat.yaw += diff * Math.min(1, PLAYER.TURN_SPEED * dt);
    player.rotation.y = cat.yaw;
  }

  // Lompat: Spasi = lompat biasa (gratis); Shift + Spasi = lompat tinggi (pakai stamina)
  if (!locked && keys['Space'] && cat.isGrounded && !cat.underCrawl && !cat.inBox) {
    const highJump = wantsRun && trySpendHighJump(stamina);
    playerVel.y = highJump ? PLAYER.HIGH_JUMP_FORCE : PLAYER.JUMP_FORCE;
    cat.isGrounded = false;
    audio.playJump();
  }

  playerVel.y += PHYSICS.GRAVITY * dt;

  const prevY = player.position.y;
  player.position.x += playerVel.x * dt;
  player.position.z += playerVel.z * dt;
  player.position.y += playerVel.y * dt;

  // Mendarat di atas robot vacuum = menumpang
  if (!cat.isGrounded && tryMountRobot(ctx, prevY)) {
    finishCatFrame(ctx, dt);
    return;
  }

  const bodyHeight = cat.inBox ? HIDE_BOX.HEIGHT : cat.moveMode === 'sneak' ? PLAYER.HEIGHT_SNEAK : PLAYER.HEIGHT_STAND;
  resolveRoomCollisions(player.position, playerVel, colliders, bodyHeight, cat.inBox ? HIDE_BOX.RADIUS : PLAYER.RADIUS);

  // Penghalang bergerak: tubuh pemilik dan robot vacuum
  const o = ctx.owner;
  if (o && o.mesh.visible && !o.away) {
    pushOutOfCircle(player.position, playerVel, o.mesh.position.x, o.mesh.position.z, OWNER.RADIUS, OWNER.BLOCK_HEIGHT);
  }
  for (const obs of ctx.obstacles) {
    pushOutOfCircle(player.position, playerVel, obs.mesh.position.x, obs.mesh.position.z, VACUUM.RADIUS, VACUUM.BLOCK_HEIGHT);
  }

  const wasGrounded = cat.isGrounded;
  cat.groundHeight = getGroundHeight(
    colliders, player.position.x, player.position.z, Math.max(prevY, player.position.y), PLAYER.LEDGE_ASSIST
  );

  if (player.position.y <= cat.groundHeight && playerVel.y <= 0) {
    player.position.y = cat.groundHeight;
    playerVel.y = 0;
    cat.isGrounded = true;
    if (!wasGrounded) {
      cat.landingSquashTimer = CAT_ANIM.SQUASH_DURATION;
      emitNoise(ctx, { x: player.position.x, z: player.position.z, radius: NOISE.LAND_RADIUS, source: 'land' });
    }
  } else {
    cat.isGrounded = false;
  }

  updateStamina(stamina, dt, { running: cat.moveMode === 'run' && !zoomies, grounded: cat.isGrounded });
  if (stamina.justExhausted) {
    stamina.justExhausted = false;
    audio.playPant();
  }
  updateIdle(ctx, dt, hasMoveInput || locked);
  finishCatFrame(ctx, dt, true);
}

// Bagian akhir frame kucing (dipakai juga saat tidur / menumpang):
// sudut ke kamera, animasi, aksi, suara langkah, dan kedip kebal.
function finishCatFrame(ctx, dt, footsteps = false) {
  const { cat, camera, state, stamina } = ctx;
  const player = cat.mesh;
  cat.isPanting = isExhausted(stamina);

  // Sudut ke kamera relatif terhadap badan (dipakai animasi menoleh)
  let camYaw = yawTowards(cat, camera.position.x, camera.position.z) - cat.yaw;
  while (camYaw > Math.PI) camYaw -= Math.PI * 2;
  while (camYaw < -Math.PI) camYaw += Math.PI * 2;
  cat.camYaw = camYaw;

  animateCat(cat, dt);
  updateCatAction(cat, dt);

  // Suara langkah: satu event per setengah siklus jalan
  // (senyap saat zoomies, di dalam kardus, atau menumpang robot)
  const stepIndex = Math.floor(cat.walkCycle / Math.PI);
  if (stepIndex !== cat.lastStepIndex) {
    cat.lastStepIndex = stepIndex;
    if (footsteps && cat.isGrounded && cat.zoomiesT <= 0 && !cat.inBox) {
      emitNoise(ctx, {
        x: player.position.x,
        z: player.position.z,
        radius: cat.bell ? CUSTOMIZATION.BELL.STEP_RADIUS[cat.moveMode] : MODE_STEP_RADIUS[cat.moveMode],
        source: 'step-' + cat.moveMode
      });
      if (cat.bell) ctx.audio.play('bellStep'); // lonceng berdenting tiap langkah
    }
  }

  // Kedip saat kebal sementara
  if (state.invulnerableTimer > 0) {
    state.invulnerableTimer -= dt;
    player.visible = Math.floor(state.invulnerableTimer * CAT_ANIM.BLINK_RATE) % 2 === 0;
    if (state.invulnerableTimer <= 0) {
      state.invulnerableTimer = 0;
      player.visible = true;
    }
  }
  // Di dalam kardus hanya mata yang terlihat (lewat mesh kardus)
  if (cat.inBox) player.visible = false;
}

function animateCat(cat, dt) {
  const A = CAT_ANIM;
  const p = cat.parts;
  const lerp = THREE.MathUtils.lerp;

  cat.animClock += dt;
  p.bodyPivot.rotation.z = 0;
  p.bodyPivot.position.x = 0;
  const horizSpeed = Math.hypot(cat.vel.x, cat.vel.z);
  const speedRatio = Math.min(horizSpeed / PLAYER.RUN_SPEED, 1);

  if (!cat.isGrounded) {
    // Kaki terlipat saat di udara
    p.legFL.rotation.x = lerp(p.legFL.rotation.x, -A.AIR_LEG_ANGLE, A.AIR_LEG_LERP * dt);
    p.legFR.rotation.x = lerp(p.legFR.rotation.x, -A.AIR_LEG_ANGLE, A.AIR_LEG_LERP * dt);
    p.legBL.rotation.x = lerp(p.legBL.rotation.x, A.AIR_LEG_ANGLE, A.AIR_LEG_LERP * dt);
    p.legBR.rotation.x = lerp(p.legBR.rotation.x, A.AIR_LEG_ANGLE, A.AIR_LEG_LERP * dt);
    p.bodyPivot.position.y = 0;
    p.bodyPivot.rotation.x = lerp(
      p.bodyPivot.rotation.x,
      THREE.MathUtils.clamp(-cat.vel.y * A.AIR_LEAN_FACTOR, -A.AIR_LEAN_MAX, A.AIR_LEAN_MAX),
      A.LEAN_LERP * dt
    );
    p.tailPivot.rotation.z = Math.sin(cat.animClock * A.AIR_TAIL_FREQ) * A.AIR_TAIL_AMP;
  } else if (horizSpeed > A.WALK_SPEED_THRESHOLD) {
    // Berjalan: kaki berayun bergantian, ekor bergoyang, badan condong ke depan
    cat.walkCycle += dt * (cat.zoomiesT > 0 ? CATNIP.ANIM_CADENCE : A.WALK_CADENCE_BASE + speedRatio * A.WALK_CADENCE_SPEED);
    const swing = Math.sin(cat.walkCycle) * A.WALK_LEG_SWING * speedRatio;
    p.legFL.rotation.x = swing;
    p.legBR.rotation.x = swing;
    p.legFR.rotation.x = -swing;
    p.legBL.rotation.x = -swing;

    p.bodyPivot.position.y = Math.abs(Math.sin(cat.walkCycle)) * A.WALK_BOB * speedRatio;
    p.bodyPivot.rotation.x = lerp(p.bodyPivot.rotation.x, A.WALK_LEAN * speedRatio, A.LEAN_LERP * dt);
    p.tailPivot.rotation.z = Math.sin(cat.walkCycle * A.WALK_TAIL_FREQ) * A.WALK_TAIL_AMP;
    if (cat.chonky) {
      // Chonky: jalan bergoyang ke kiri-kanan
      const CH = CUSTOMIZATION.CHONKY;
      p.bodyPivot.rotation.z = Math.sin(cat.walkCycle) * CH.WADDLE_ROLL * speedRatio;
      p.bodyPivot.position.x = Math.sin(cat.walkCycle) * CH.WADDLE_SWAY * speedRatio;
    }
  } else {
    // Diam: kaki netral, efek bernapas tipis, ekor bergoyang pelan
    const k = Math.min(1, A.IDLE_LERP * dt);
    // Kaki kembali netral (kecuali loaf/tidur: kaki dilipat oleh applyBehaviorPose)
    if (!cat.loaf && !cat.sleeping) {
      p.legFL.rotation.x = lerp(p.legFL.rotation.x, 0, k);
      p.legFR.rotation.x = lerp(p.legFR.rotation.x, 0, k);
      p.legBL.rotation.x = lerp(p.legBL.rotation.x, 0, k);
      p.legBR.rotation.x = lerp(p.legBR.rotation.x, 0, k);
    }

    // Napas biasa, atau napas cepat saat terengah
    p.bodyPivot.position.y = cat.isPanting
      ? Math.sin(cat.animClock * A.PANT_FREQ) * A.PANT_AMP
      : Math.sin(cat.animClock * A.IDLE_BREATH_FREQ) * A.IDLE_BREATH_AMP;
    p.bodyPivot.rotation.x = lerp(p.bodyPivot.rotation.x, 0, k);
    p.tailPivot.rotation.z = Math.sin(cat.animClock * A.IDLE_TAIL_FREQ) * A.IDLE_TAIL_AMP;
  }

  // Animasi pendaratan singkat (squash & stretch halus)
  if (cat.landingSquashTimer > 0) {
    cat.landingSquashTimer = Math.max(0, cat.landingSquashTimer - dt);
    const t = cat.landingSquashTimer / A.SQUASH_DURATION;
    p.bodyPivot.scale.set(1 + A.SQUASH_WIDEN * t, 1 - A.SQUASH_FLATTEN * t, 1 + A.SQUASH_WIDEN * t);
  } else {
    p.bodyPivot.scale.set(1, 1, 1);
  }

  // Mengendap: badan merendah (pivot di kaki, jadi kaki tetap menapak)
  const crouchTarget = cat.moveMode === 'sneak' ? 1 : 0;
  cat.crouch = lerp(cat.crouch, crouchTarget, Math.min(1, A.CROUCH_LERP * dt));
  if (cat.crouch > 0.001) {
    const c = cat.crouch;
    p.bodyPivot.scale.x *= 1 + A.SNEAK_WIDEN * c;
    p.bodyPivot.scale.y *= 1 - A.SNEAK_SQUASH * c;
    p.bodyPivot.scale.z *= 1 + A.SNEAK_WIDEN * c;
  }

  // Mengeong: kepala mendongak sebentar
  if (cat.meowTimer > 0) {
    cat.meowTimer = Math.max(0, cat.meowTimer - dt);
    const t = 1 - cat.meowTimer / A.MEOW_DURATION;
    p.headGroup.rotation.x = -Math.sin(Math.PI * t) * A.MEOW_HEAD_TILT;
  } else {
    p.headGroup.rotation.x = 0;
  }

  // Pose tingkah (loaf, tidur, menumpang, animasi idle), lalu pose aksi kenakalan
  p.headGroup.rotation.y = 0;
  applyBehaviorPose(cat, dt);
  if (cat.action && cat.action.pose) {
    cat.action.pose(p, cat.action.t, cat);
  }
}
