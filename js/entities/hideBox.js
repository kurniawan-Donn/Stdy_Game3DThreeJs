// Kardus untuk bersembunyi (GDD §12):
// - E di dekat kardus = masuk; kucing tak terlihat, hanya mata mengintip dari lubang
// - di dalam: kecepatan mengendap, tak bisa lompat; kardus ikut bergerak
// - kardus DIAM = tidak dicurigai; kardus BERGERAK dalam pandangan = curiga naik cepat
// - masuk di depan mata pemilik ("terbongkar") tidak menyelamatkan: pemilik
//   tetap mengejar lalu mengangkat & melempar kardusnya saat menangkap
// - E lagi = keluar
// Kardus yang tidak ditempati adalah collider (bisa dinaiki & memblokir jalur);
// grid navigasi dibangun ulang saat kardus berpindah.
import * as THREE from 'three';
import { HIDE_BOX, MATERIALS } from '../config.js';
import { registerInteractable } from '../systems/interaction.js';
import { addBody } from '../systems/physics.js';
import { createNavGrid } from '../systems/navGrid.js';

function buildBoxMesh() {
  const S = HIDE_BOX.SIZE;
  const H = HIDE_BOX.HEIGHT;
  const group = new THREE.Group();
  const card = new THREE.MeshStandardMaterial({ ...MATERIALS.cardboard });
  const dark = new THREE.MeshStandardMaterial({ ...MATERIALS.cardboardDark });
  const T = 0.012;
  const wall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), card);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  };
  // Dinding belakang & samping
  wall(S, H, T, 0, H / 2, -S / 2 + T / 2);
  wall(T, H, S, -S / 2 + T / 2, H / 2, 0);
  wall(T, H, S, S / 2 - T / 2, H / 2, 0);
  // Dinding depan dengan lubang intip (di sekitar lubang)
  const hw = HIDE_BOX.HOLE_WIDTH;
  const hh = HIDE_BOX.HOLE_HEIGHT;
  const hy = HIDE_BOX.EYE_HEIGHT;
  const side = (S - hw) / 2;
  wall(side, H, T, -(hw / 2 + side / 2), H / 2, S / 2 - T / 2);
  wall(side, H, T, hw / 2 + side / 2, H / 2, S / 2 - T / 2);
  wall(hw, hy - hh / 2, T, 0, (hy - hh / 2) / 2, S / 2 - T / 2);
  wall(hw, H - (hy + hh / 2), T, 0, (H + hy + hh / 2) / 2, S / 2 - T / 2);
  // Tutup atas (dua daun sedikit terbuka) + bagian dalam gelap di lubang
  const flap = (sign) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(S, T, S / 2), card);
    m.position.set(0, H, sign * S / 4);
    m.rotation.x = sign * 0.06;
    m.castShadow = true;
    group.add(m);
  };
  flap(-1);
  flap(1);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(hw, hh), dark);
  inner.position.set(0, hy, S / 2 - T - 0.002);
  group.add(inner);

  // Mata kucing yang mengintip (hanya terlihat saat ditempati)
  const eyes = new THREE.Group();
  const eyeMat = new THREE.MeshBasicMaterial({ ...MATERIALS.catEyeGlow });
  for (const sgn of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(HIDE_BOX.EYE_SIZE, 8, 6), eyeMat);
    e.position.set(sgn * HIDE_BOX.EYE_SPACING / 2, hy, S / 2 - T - 0.004);
    e.scale.z = 0.4;
    eyes.add(e);
  }
  eyes.visible = false;
  group.add(eyes);
  return { group, eyes };
}

function setColliderAt(box, x, z, solid) {
  const h = HIDE_BOX.SIZE / 2;
  const c = box.collider;
  c.minX = x - h;
  c.maxX = x + h;
  c.minZ = z - h;
  c.maxZ = z + h;
  c.topHeight = solid ? HIDE_BOX.HEIGHT : 0;
  c.occludes = solid;
  c.navBlocks = solid;
}

function rebuildNav(ctx) {
  ctx.nav = createNavGrid(ctx.colliders);
}

export function createHideBoxes(ctx) {
  const boxes = [];
  for (const spec of HIDE_BOX.POSITIONS) {
    const { group, eyes } = buildBoxMesh();
    group.position.set(spec.x, 0, spec.z);
    group.rotation.y = spec.yaw;
    ctx.scene.add(group);
    const collider = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, topHeight: 0, climbable: true, occludes: true, navBlocks: true, crawlHeight: 0, hideBox: true };
    const box = { mesh: group, eyes, collider, occupied: false, compromised: false, body: null, tossed: false, unregister: [] };
    setColliderAt(box, spec.x, spec.z, true);
    ctx.colliders.push(collider);

    box.unregister.push(registerInteractable(ctx.interaction, {
      label: 'Masuk kardus',
      position: group.position,
      surfaceY: 0,
      markerHeight: HIDE_BOX.MARKER_HEIGHT,
      maxDist: HIDE_BOX.ENTER_DIST,
      isEnabled: (c) => !box.occupied && !box.tossed && !c.cat.inBox,
      onInteract: (c) => enterBox(c, box)
    }));
    box.unregister.push(registerInteractable(ctx.interaction, {
      label: 'Keluar kardus',
      position: group.position,
      inBoxOnly: true,
      markerHeight: HIDE_BOX.MARKER_HEIGHT,
      isEnabled: (c) => c.cat.inBox === box,
      onInteract: (c) => exitBox(c)
    }));
    boxes.push(box);
  }
  return boxes;
}

export function disposeHideBoxes(ctx) {
  for (const box of ctx.hideBoxes || []) {
    for (const u of box.unregister) u();
    if (box.mesh.parent) box.mesh.parent.remove(box.mesh);
    const i = ctx.colliders.indexOf(box.collider);
    if (i >= 0) ctx.colliders.splice(i, 1);
  }
  ctx.hideBoxes = [];
}

export function enterBox(ctx, box) {
  const { cat, owner } = ctx;
  box.occupied = true;
  // Pemilik melihat kucing masuk (atau baru saja melihatnya saat mengejar)?
  const seenNow = owner && !owner.away && owner.seen;
  const seenRecently = owner && owner.state === 'chase' && ctx.time - (owner.lastSeenAt ?? -Infinity) <= HIDE_BOX.ENTER_GRACE;
  box.compromised = !!(seenNow || seenRecently);
  cat.inBox = box;
  cat.mesh.position.set(box.mesh.position.x, 0, box.mesh.position.z);
  cat.vel.set(0, 0, 0);
  cat.yaw = box.mesh.rotation.y;
  cat.mesh.rotation.y = cat.yaw;
  cat.mesh.visible = false;
  box.eyes.visible = true;
  setColliderAt(box, box.mesh.position.x, box.mesh.position.z, false);
  ctx.audio.play('boxIn');
}

export function exitBox(ctx) {
  const cat = ctx.cat;
  const box = cat.inBox;
  if (!box) return;
  cat.inBox = null;
  box.occupied = false;
  box.compromised = false;
  box.eyes.visible = false;
  const p = box.mesh.position;
  setColliderAt(box, p.x, p.z, true);
  // Keluar lewat sisi depan (lubang)
  const yaw = box.mesh.rotation.y;
  cat.mesh.position.set(p.x + Math.sin(yaw) * HIDE_BOX.EXIT_OFFSET, 0, p.z + Math.cos(yaw) * HIDE_BOX.EXIT_OFFSET);
  cat.yaw = yaw;
  cat.mesh.rotation.y = yaw;
  cat.mesh.visible = true;
  rebuildNav(ctx);
  ctx.audio.play('boxOut');
}

// Tertangkap di dalam kardus: kardus diangkat & dilempar, kucing terlihat
export function tossBox(ctx) {
  const cat = ctx.cat;
  const box = cat.inBox;
  if (!box) return;
  cat.inBox = null;
  cat.mesh.visible = true;
  box.occupied = false;
  box.compromised = false;
  box.eyes.visible = false;
  box.tossed = true;
  setColliderAt(box, box.mesh.position.x, box.mesh.position.z, false);
  const o = ctx.owner.mesh.position;
  const dx = box.mesh.position.x - o.x;
  const dz = box.mesh.position.z - o.z;
  const d = Math.hypot(dx, dz) || 1;
  box.body = addBody(ctx, {
    mesh: box.mesh,
    radius: HIDE_BOX.SIZE / 2,
    bottomOffset: 0,
    restitution: HIDE_BOX.TOSS_RESTITUTION,
    friction: HIDE_BOX.TOSS_FRICTION
  });
  box.body.vel.set((dx / d) * HIDE_BOX.TOSS_SPEED, HIDE_BOX.TOSS_UP, (dz / d) * HIDE_BOX.TOSS_SPEED);
  box.body.angVel.set(HIDE_BOX.TOSS_SPIN, HIDE_BOX.TOSS_SPIN * 0.5, 0);
}

export function updateHideBoxes(ctx) {
  const cat = ctx.cat;
  for (const box of ctx.hideBoxes || []) {
    if (cat.inBox === box) {
      // Kardus ikut kucing
      box.mesh.position.set(cat.mesh.position.x, 0, cat.mesh.position.z);
      box.mesh.rotation.y = cat.yaw;
      setColliderAt(box, cat.mesh.position.x, cat.mesh.position.z, false);
      // "Terbongkar" berakhir saat pemilik berhenti mengejar
      const o = ctx.owner;
      if (box.compromised && o && o.state !== 'chase' && o.state !== 'capture') box.compromised = false;
    } else if (box.tossed && box.body && box.body.sleeping) {
      // Kardus yang dilempar sudah diam: tegakkan & jadikan collider lagi
      box.tossed = false;
      box.mesh.rotation.set(0, box.mesh.rotation.y, 0);
      box.mesh.position.y = 0;
      const i = ctx.physics.bodies.indexOf(box.body);
      if (i >= 0) ctx.physics.bodies.splice(i, 1);
      box.body = null;
      setColliderAt(box, box.mesh.position.x, box.mesh.position.z, true);
      rebuildNav(ctx);
    }
  }
}
