// Kucing pemain: model low-poly, gerakan relatif kamera, lompat, dan animasi.
import * as THREE from 'three';
import { PLAYER, PHYSICS, CAT_ANIM, MATERIALS } from '../config.js';
import { resolveRoomCollisions, getGroundHeight } from '../systems/collision.js';

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
    walkCycle: 0
  };
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
}

// Update gerakan, lompat, tabrakan, animasi, dan kedip kebal.
export function updateCat(ctx, dt) {
  const { cat, input, camera, colliders, audio, state } = ctx;
  const keys = input.keys;
  const player = cat.mesh;
  const playerVel = cat.vel;

  let inputForward = 0;
  let inputRight = 0;

  if (keys['KeyW'] || keys['ArrowUp']) inputForward += 1;
  if (keys['KeyS'] || keys['ArrowDown']) inputForward -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) inputRight += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) inputRight -= 1;

  // Vektor gerakan relatif terhadap kamera pada bidang XZ
  camera.getWorldDirection(camForward);
  camForward.y = 0;
  if (camForward.lengthSq() < 0.0001) camForward.set(0, 0, -1);
  camForward.normalize();
  camRight.crossVectors(camForward, worldUp).normalize();

  let moveX = camForward.x * inputForward + camRight.x * inputRight;
  let moveZ = camForward.z * inputForward + camRight.z * inputRight;
  const moveLen = Math.hypot(moveX, moveZ);

  if (moveLen > 0) {
    moveX /= moveLen;
    moveZ /= moveLen;

    playerVel.x += moveX * PLAYER.ACCELERATION * dt;
    playerVel.z += moveZ * PLAYER.ACCELERATION * dt;

    const horizSpeed = Math.hypot(playerVel.x, playerVel.z);
    if (horizSpeed > PLAYER.MAX_MOVE_SPEED) {
      const scale = PLAYER.MAX_MOVE_SPEED / horizSpeed;
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

  // Lompat dengan Spasi
  if (keys['Space'] && cat.isGrounded) {
    playerVel.y = PLAYER.JUMP_FORCE;
    cat.isGrounded = false;
    audio.playJump();
  }

  playerVel.y += PHYSICS.GRAVITY * dt;

  const prevY = player.position.y;
  player.position.x += playerVel.x * dt;
  player.position.z += playerVel.z * dt;
  player.position.y += playerVel.y * dt;

  resolveRoomCollisions(player.position, playerVel, colliders);

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
    }
  } else {
    cat.isGrounded = false;
  }

  animateCat(cat, dt);

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
  const speedRatio = Math.min(horizSpeed / PLAYER.MAX_MOVE_SPEED, 1);

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

    p.bodyPivot.position.y = Math.sin(cat.animClock * A.IDLE_BREATH_FREQ) * A.IDLE_BREATH_AMP;
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
}
