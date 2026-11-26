// Kucing pemain: model low-poly, gerakan relatif kamera, lompat, dan animasi.
import * as THREE from 'three';
import { PLAYER, PHYSICS, CAT_ANIM, MATERIALS, NOISE, OWNER, VACUUM } from '../config.js';
import { resolveRoomCollisions, getGroundHeight, pushOutOfCircle } from '../systems/collision.js';
import { canRun, trySpendHighJump, updateStamina, isExhausted } from '../systems/stamina.js';
import { emitNoise } from '../systems/noise.js';

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
export function createCat(scene) {
  const mesh = new THREE.Group();

  const furMain = new THREE.MeshStandardMaterial({ ...MATERIALS.catFurMain });
  const furLight = new THREE.MeshStandardMaterial({ ...MATERIALS.catFurLight });
  const pinkMat = new THREE.MeshStandardMaterial({ ...MATERIALS.catPink });
  const eyeMat = new THREE.MeshStandardMaterial({ ...MATERIALS.catEye });

  // Pivot badan agar bisa bernapas & condong saat bergerak
  const bodyPivot = new THREE.Group();
  mesh.add(bodyPivot);

  // Badan
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.72), furMain);
  torso.position.set(0, 0.42, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Perut terang
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.62), furLight);
  belly.position.set(0, 0.28, 0);
  bodyPivot.add(belly);

  // Kepala (menghadap +Z lokal)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.66, 0.36);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.38), furMain);
  head.castShadow = true;
  headGroup.add(head);

  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.12), furLight);
  muzzle.position.set(0, -0.06, 0.2);
  headGroup.add(muzzle);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), pinkMat);
  nose.position.set(0, -0.02, 0.26);
  headGroup.add(nose);

  // Mata
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.05), eyeMat);
  eyeL.position.set(-0.11, 0.04, 0.18);
  headGroup.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.11;
  headGroup.add(eyeR);

  // 2 Telinga
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.19, 4), furMain);
  earL.position.set(-0.13, 0.25, 0.02);
  earL.rotation.y = Math.PI / 4;
  earL.rotation.z = 0.14;
  earL.castShadow = true;
  headGroup.add(earL);

  const earR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.19, 4), furMain);
  earR.position.set(0.13, 0.25, 0.02);
  earR.rotation.y = Math.PI / 4;
  earR.rotation.z = -0.14;
  earR.castShadow = true;
  headGroup.add(earR);

  bodyPivot.add(headGroup);

  // 4 Kaki dengan pivot di bahu/pinggul
  function makeLeg(x, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.28, z);

    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.13), furMain);
    legMesh.position.y = -0.14;
    legMesh.castShadow = true;
    pivot.add(legMesh);

    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.16), furLight);
    paw.position.set(0, -0.25, 0.02);
    pivot.add(paw);

    bodyPivot.add(pivot);
    return pivot;
  }

  const legFL = makeLeg(-0.14, 0.24);
  const legFR = makeLeg(0.14, 0.24);
  const legBL = makeLeg(-0.14, -0.24);
  const legBR = makeLeg(0.14, -0.24);

  // Ekor dengan pivot di pangkal
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.5, -0.35);

  const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.1), furMain);
  tailMesh.position.set(0, 0.2, -0.06);
  tailMesh.rotation.x = -0.45;
  tailMesh.castShadow = true;
  tailPivot.add(tailMesh);

  const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), furLight);
  tailTip.position.set(0, 0.39, -0.15);
  tailPivot.add(tailTip);

  bodyPivot.add(tailPivot);

  scene.add(mesh);

  return {
    mesh,
    parts: { bodyPivot, headGroup, legFL, legFR, legBL, legBR, tailPivot },
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
    action: null // aksi kenakalan yang sedang berjalan (lihat startCatAction)
  };
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
  cat.lastStepIndex = Math.floor(cat.walkCycle / Math.PI);
}

// Update gerakan, lompat, tabrakan, animasi, dan kedip kebal.
export function updateCat(ctx, dt) {
  const { cat, input, camera, colliders, audio, state, stamina } = ctx;
  const keys = input.keys;
  const player = cat.mesh;
  const playerVel = cat.vel;

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
  const sneaking = wantsSneak && cat.isGrounded;
  const running = !wantsSneak && wantsRun && moveLen > 0 && canRun(stamina);
  cat.moveMode = sneaking ? 'sneak' : running ? 'run' : 'walk';
  cat.profile = sneaking ? PLAYER.SNEAK_PROFILE : PLAYER.NORMAL_PROFILE;
  const maxSpeed = MODE_SPEED[cat.moveMode];

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
  if (!locked && keys['Space'] && cat.isGrounded) {
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

  resolveRoomCollisions(player.position, playerVel, colliders);

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
    colliders, player.position.x, player.position.z, Math.max(prevY, player.position.y)
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

  updateStamina(stamina, dt, { running: cat.moveMode === 'run', grounded: cat.isGrounded });
  if (stamina.justExhausted) {
    stamina.justExhausted = false;
    audio.playPant();
  }
  cat.isPanting = isExhausted(stamina);

  // Sudut ke kamera relatif terhadap badan (dipakai animasi menoleh)
  let camYaw = yawTowards(cat, camera.position.x, camera.position.z) - cat.yaw;
  while (camYaw > Math.PI) camYaw -= Math.PI * 2;
  while (camYaw < -Math.PI) camYaw += Math.PI * 2;
  cat.camYaw = camYaw;

  animateCat(cat, dt);
  updateCatAction(cat, dt);

  // Suara langkah: satu event per setengah siklus jalan
  const stepIndex = Math.floor(cat.walkCycle / Math.PI);
  if (stepIndex !== cat.lastStepIndex) {
    cat.lastStepIndex = stepIndex;
    if (cat.isGrounded) {
      emitNoise(ctx, {
        x: player.position.x,
        z: player.position.z,
        radius: MODE_STEP_RADIUS[cat.moveMode],
        source: 'step-' + cat.moveMode
      });
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
}

function animateCat(cat, dt) {
  const A = CAT_ANIM;
  const p = cat.parts;
  const lerp = THREE.MathUtils.lerp;

  cat.animClock += dt;
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
    cat.walkCycle += dt * (A.WALK_CADENCE_BASE + speedRatio * A.WALK_CADENCE_SPEED);
    const swing = Math.sin(cat.walkCycle) * A.WALK_LEG_SWING * speedRatio;
    p.legFL.rotation.x = swing;
    p.legBR.rotation.x = swing;
    p.legFR.rotation.x = -swing;
    p.legBL.rotation.x = -swing;

    p.bodyPivot.position.y = Math.abs(Math.sin(cat.walkCycle)) * A.WALK_BOB * speedRatio;
    p.bodyPivot.rotation.x = lerp(p.bodyPivot.rotation.x, A.WALK_LEAN * speedRatio, A.LEAN_LERP * dt);
    p.tailPivot.rotation.z = Math.sin(cat.walkCycle * A.WALK_TAIL_FREQ) * A.WALK_TAIL_AMP;
  } else {
    // Diam: kaki netral, efek bernapas tipis, ekor bergoyang pelan
    const k = Math.min(1, A.IDLE_LERP * dt);
    p.legFL.rotation.x = lerp(p.legFL.rotation.x, 0, k);
    p.legFR.rotation.x = lerp(p.legFR.rotation.x, 0, k);
    p.legBL.rotation.x = lerp(p.legBL.rotation.x, 0, k);
    p.legBR.rotation.x = lerp(p.legBR.rotation.x, 0, k);

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

  // Pose khusus aksi kenakalan (menimpa pose normal)
  p.headGroup.rotation.y = 0;
  if (cat.action && cat.action.pose) {
    cat.action.pose(p, cat.action.t, cat);
  }
}
