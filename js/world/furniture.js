// Perabotan seluruh rumah dari bentuk dasar + collider AABB-nya.
// Posisi, ukuran & collider diambil dari FURNITURE_LAYOUT / REAL_SCALE
// (config.js); model dibangun dari dimensi collider sehingga visual dan
// tabrakan selalu cocok. Detail kecil (kaki, bantal, buku) tetap di sini.
// Setiap perabot digabung per material (core/mergeStatic.js) lalu
// didaftarkan sebagai "fadeable" (memudar bila menghalangi kamera).
import * as THREE from 'three';
import { FURNITURE_LAYOUT, MATERIALS, REAL_SCALE } from '../config.js';
import { createRugTexture } from './textures.js';
import { mergeStaticGroup } from '../core/mergeStatic.js';

// Collider AABB: { minX, maxX, minZ, maxZ, topHeight, climbable, occludes, navBlocks, crawlHeight }
// occludes: menghalangi pandangan pemilik (default true)
// navBlocks: menghalangi jalur pemilik (default true)
// crawlHeight: tinggi kolong; kucing yang cukup pendek bisa lewat di bawahnya
function addFurnitureCollider(colliders, c) {
  colliders.push({
    minX: c.x - c.width / 2,
    maxX: c.x + c.width / 2,
    minZ: c.z - c.depth / 2,
    maxZ: c.z + c.depth / 2,
    topHeight: c.topHeight,
    climbable: c.climbable === true,
    occludes: c.occludes !== false,
    navBlocks: c.navBlocks !== false,
    crawlHeight: c.crawlHeight || 0,
    hideSpot: c.hideSpot === true // kolong tempat sembunyi (kucing merendah = tak terlihat)
  });
}

// Mendaftarkan collider dan mengembalikan objek collider yang dibuat.
function addColliders(colliders, list) {
  const added = [];
  for (const c of list) {
    addFurnitureCollider(colliders, c);
    added.push(colliders[colliders.length - 1]);
  }
  return added;
}

function shadowed(m, receive = true) {
  m.castShadow = true;
  m.receiveShadow = receive;
  return m;
}

function mesh(geo, mat, x, y, z, receive = true) {
  const m = shadowed(new THREE.Mesh(geo, mat), receive);
  m.position.set(x, y, z);
  return m;
}

// Gabungkan geometri perabot, tambahkan ke scene, daftarkan collider &
// fadeable. Material digandakan per perabot agar memudarkan satu perabot
// tidak ikut memudarkan perabot lain.
function finish(ctx, group, colliderList) {
  const stats = mergeStaticGroup(group);
  ctx.stats.before += stats.before;
  ctx.stats.after += stats.after;
  ctx.scene.add(group);
  const added = colliderList ? addColliders(ctx.colliders, colliderList) : [];
  const materials = [];
  group.traverse((m) => {
    if (!m.isMesh) return;
    m.material = m.material.clone();
    materials.push({ material: m.material, baseOpacity: m.material.opacity, baseTransparent: m.material.transparent });
  });
  if (added.length) ctx.refs.fadeables.push({ colliders: added, materials, fade: 1 });
  return added;
}

// Membangun semua perabot. Mengembalikan { colliders, refs, mergeStats };
// refs berisi mesh/collider yang dipakai objek kenakalan & kamera.
export function createFurniture(scene) {
  const refs = { plants: [], fadeables: [] };
  const ctx = { scene, colliders: [], refs, stats: { before: 0, after: 0 } };
  const L = FURNITURE_LAYOUT;

  const M = {};
  for (const k of ['woodDark', 'woodWarm', 'fabricSofa', 'cushion', 'metalDark', 'metalBrass', 'counterBody', 'counterTop',
    'fridge', 'islandBody', 'bedFrame', 'mattress', 'pillow', 'wardrobe', 'mirror', 'porcelain', 'chrome', 'bathMat',
    'deskTop', 'deskLeg', 'deskChair', 'laptop', 'laptopScreen', 'pot', 'soil', 'leaf', 'mug', 'tvScreen']) {
    M[k] = new THREE.MeshStandardMaterial({ ...MATERIALS[k] });
  }
  M.lampShade = new THREE.MeshStandardMaterial({ ...MATERIALS.lampShade, side: THREE.DoubleSide });
  const bookMats = MATERIALS.bookColors.map((color) => new THREE.MeshStandardMaterial({ color, ...MATERIALS.book }));

  // ===================== RUANG TAMU =====================
  // Karpet (datar di lantai, bukan penghalang)
  {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(L.rug.width, 0.01, L.rug.depth),
      new THREE.MeshStandardMaterial({ map: createRugTexture(), ...MATERIALS.rug })
    );
    rug.position.set(L.rug.x, 0.005, L.rug.z);
    rug.receiveShadow = true;
    scene.add(rug);
  }

  // Sofa: dudukan menghadap -Z, sandaran di sisi +Z
  {
    const [seatC, backC] = L.sofa.colliders;
    const g = new THREE.Group();
    g.position.set(L.sofa.x, 0, L.sofa.z);
    const W = seatC.width;
    const LEG = seatC.crawlHeight; // kaki tinggi: kolong untuk kucing mengendap
    const BACK_BASE = 0.08; // sandaran sampai dekat lantai (sesuai collider padat)
    const seatZ = seatC.z - L.sofa.z;
    const backZ = backC.z - L.sofa.z;
    const frontEdge = seatZ - seatC.depth / 2;
    const backEdge = backZ + backC.depth / 2;
    g.add(mesh(new THREE.BoxGeometry(W, seatC.topHeight - LEG, seatC.depth), M.fabricSofa, 0, LEG + (seatC.topHeight - LEG) / 2, seatZ));
    const backH = backC.topHeight - BACK_BASE;
    g.add(mesh(new THREE.BoxGeometry(W, backH, backC.depth), M.fabricSofa, 0, BACK_BASE + backH / 2, backZ));
    const armW = 0.14;
    for (const side of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(armW, 0.16, seatC.depth), M.fabricSofa, side * (W / 2 - armW / 2), seatC.topHeight + 0.08, seatZ));
      const pillow = mesh(new THREE.BoxGeometry(0.3, 0.26, 0.09), M.cushion, side * 0.58, seatC.topHeight + 0.13, backZ - backC.depth / 2 - 0.05, false);
      pillow.rotation.set(-0.2, side * 0.18, side * 0.08);
      g.add(pillow);
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.018, LEG, 8), M.woodDark, side * (W / 2 - 0.08), LEG / 2, frontEdge + 0.08, false));
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.018, BACK_BASE, 8), M.woodDark, side * (W / 2 - 0.08), BACK_BASE / 2, backEdge - 0.08, false));
    }
    refs.sofaSeat = finish(ctx, g, L.sofa.colliders)[0];
  }

  // Meja kopi (kolongnya bisa dilewati kucing)
  {
    const c = L.coffeeTable.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.coffeeTable.x, 0, L.coffeeTable.z);
    const TOP = 0.04;
    g.add(mesh(new THREE.BoxGeometry(c.width, TOP, c.depth), M.woodWarm, 0, c.topHeight - TOP / 2, 0));
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        g.add(mesh(new THREE.BoxGeometry(0.04, c.topHeight - TOP, 0.04), M.woodDark, lx * (c.width / 2 - 0.05), (c.topHeight - TOP) / 2, lz * (c.depth / 2 - 0.05), false));
      }
    }
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.09, 12), M.mug, -0.3, c.topHeight + 0.045, 0.12, false));
    finish(ctx, g, L.coffeeTable.colliders);
  }

  // Rak TV + TV di dinding lorong
  {
    const c = L.tvUnit.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.tvUnit.x, 0, L.tvUnit.z);
    g.add(mesh(new THREE.BoxGeometry(c.width, c.topHeight, c.depth), M.woodDark, 0, c.topHeight / 2, 0));
    const wallZ = -c.depth / 2 + 0.03;
    g.add(mesh(new THREE.BoxGeometry(1.2, 0.7, 0.05), M.metalDark, 0, 1.2, wallZ, false));
    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.63), M.tvScreen);
    tvScreen.position.set(0, 1.2, wallZ + 0.027);
    tvScreen.userData.noMerge = true; // materialnya diganti saat TV menyala
    g.add(tvScreen);
    finish(ctx, g, L.tvUnit.colliders);
    refs.tvScreen = tvScreen;
  }

  // Kursi baca
  refs.chair = buildChair(ctx, M, L.chair.x, L.chair.z, L.chair.colliders[0], 0, false);

  // Lampu berdiri
  {
    const c = L.floorLamp.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.floorLamp.x, 0, L.floorLamp.z);
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16), M.metalBrass, 0, 0.02, 0, false));
    const poleH = c.topHeight - 0.22;
    g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, poleH, 8), M.metalBrass, 0, poleH / 2 + 0.04, 0, false));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.24, 16, 1, true), M.lampShade);
    shade.position.y = c.topHeight - 0.12;
    g.add(shade);
    finish(ctx, g, L.floorLamp.colliders);
  }

  // Rak rendah + rak buku tinggi (menghadap utara, -Z)
  {
    const c = L.lowShelf.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.lowShelf.x, 0, L.lowShelf.z);
    g.add(mesh(new THREE.BoxGeometry(c.width - 0.02, c.topHeight - 0.03, c.depth - 0.02), M.woodWarm, 0, (c.topHeight - 0.03) / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.03, c.depth), M.woodDark, 0, c.topHeight - 0.015, 0));
    finish(ctx, g, L.lowShelf.colliders);
  }
  {
    const c = L.tallShelf.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.tallShelf.x, 0, L.tallShelf.z);
    // c.width = sumbu X (lebar rak), c.depth = sumbu Z (dalam rak); sisi depan = -Z
    g.add(mesh(new THREE.BoxGeometry(c.width, c.topHeight, c.depth), M.woodDark, 0, c.topHeight / 2, 0));
    const front = -c.depth / 2;
    for (let levelY = 0.3; levelY <= c.topHeight - 0.3; levelY += 0.36) {
      g.add(mesh(new THREE.BoxGeometry(c.width * 0.94, 0.02, c.depth * 0.9), M.woodWarm, 0, levelY, front + c.depth * 0.45 - 0.01, false));
      for (let bx = -c.width / 2 + 0.06; bx <= c.width / 2 - 0.06; bx += 0.065) {
        const bh = 0.18 + Math.abs(Math.sin(bx * 17 + levelY * 3)) * 0.08;
        const mat = bookMats[Math.floor(Math.abs(bx * 40 + levelY * 7)) % bookMats.length];
        g.add(mesh(new THREE.BoxGeometry(0.05, bh, c.depth * 0.6), mat, bx, levelY + 0.01 + bh / 2, front + c.depth * 0.32, false));
      }
    }
    finish(ctx, g, L.tallShelf.colliders);
  }

  // Tanaman pot (ruang tamu & ruang makan)
  for (const p of L.plants.positions) {
    refs.plants.push(buildPlant(ctx, M, p.x, p.z));
  }

  // Konter bar pemisah ruang tamu–ruang makan
  {
    const c = L.barCounter.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.barCounter.x, 0, L.barCounter.z);
    g.add(mesh(new THREE.BoxGeometry(c.width - 0.04, c.topHeight - 0.04, c.depth - 0.04), M.counterBody, 0, (c.topHeight - 0.04) / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.04, c.depth), M.counterTop, 0, c.topHeight - 0.02, 0));
    finish(ctx, g, L.barCounter.colliders);
  }

  // ===================== DAPUR =====================
  {
    const c = L.kitchenCounter.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.kitchenCounter.x, 0, L.kitchenCounter.z);
    const bodyH = c.topHeight - 0.04;
    g.add(mesh(new THREE.BoxGeometry(c.width - 0.04, bodyH, c.depth - 0.04), M.counterBody, 0, bodyH / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.04, c.depth), M.counterTop, 0, c.topHeight - 0.02, 0));
    for (let i = 1; i < 4; i++) {
      g.add(mesh(new THREE.BoxGeometry(0.012, bodyH * 0.8, 0.006), M.counterTop, -c.width / 2 + (i * c.width) / 4, bodyH / 2, c.depth / 2 - 0.017, false));
    }
    finish(ctx, g, L.kitchenCounter.colliders);
  }
  {
    const f = L.fridge.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.fridge.x, 0, L.fridge.z);
    g.add(mesh(new THREE.BoxGeometry(f.width, f.topHeight, f.depth), M.fridge, 0, f.topHeight / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.025, 0.4, 0.025), M.metalDark, -f.width / 2 + 0.08, f.topHeight * 0.6, f.depth / 2 + 0.015, false));
    finish(ctx, g, L.fridge.colliders);
  }
  {
    const c = L.island.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.island.x, 0, L.island.z);
    g.add(mesh(new THREE.BoxGeometry(c.width - 0.06, c.topHeight - 0.04, c.depth - 0.06), M.islandBody, 0, (c.topHeight - 0.04) / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.04, c.depth), M.counterTop, 0, c.topHeight - 0.02, 0));
    finish(ctx, g, L.island.colliders);
  }

  // ===================== RUANG MAKAN =====================
  {
    const c = L.diningTable.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.diningTable.x, 0, L.diningTable.z);
    const TOP = c.topHeight - REAL_SCALE.diningTable.UNDERSIDE;
    g.add(mesh(new THREE.BoxGeometry(c.width, TOP, c.depth), M.woodWarm, 0, c.topHeight - TOP / 2, 0));
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        g.add(mesh(new THREE.BoxGeometry(0.05, c.topHeight - TOP, 0.05), M.woodDark, lx * (c.width / 2 - 0.06), (c.topHeight - TOP) / 2, lz * (c.depth / 2 - 0.06), false));
      }
    }
    finish(ctx, g, L.diningTable.colliders);
  }
  for (const p of L.diningChairs.positions) {
    buildChair(ctx, M, p.x, p.z, { ...L.diningChairs.collider, x: p.x, z: p.z }, p.yaw, true);
  }

  // ===================== RUANG KERJA =====================
  {
    const d = L.workDesk.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.workDesk.x, 0, L.workDesk.z);
    g.add(mesh(new THREE.BoxGeometry(d.width, 0.04, d.depth), M.deskTop, 0, d.topHeight - 0.02, 0));
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        g.add(mesh(new THREE.BoxGeometry(0.04, d.topHeight - 0.04, 0.04), M.deskLeg, lx * (d.width / 2 - 0.05), (d.topHeight - 0.04) / 2, lz * (d.depth / 2 - 0.05), false));
      }
    }
    // Laptop: alas + layar menyala (menghadap kursi, +Z)
    g.add(mesh(new THREE.BoxGeometry(0.32, 0.015, 0.22), M.laptop, 0, d.topHeight + 0.008, 0.1, false));
    const lid = new THREE.Group();
    lid.position.set(0, d.topHeight + 0.015, -0.01);
    lid.rotation.x = -0.25;
    lid.add(mesh(new THREE.BoxGeometry(0.32, 0.21, 0.01), M.laptop, 0, 0.105, 0, false));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.18), M.laptopScreen);
    screen.position.set(0, 0.105, 0.006);
    lid.add(screen);
    g.add(lid);
    finish(ctx, g, L.workDesk.colliders);
  }
  {
    // Kursi kerja (berputar mengikuti pemilik)
    const c = L.workChair.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.workChair.x, 0, L.workChair.z);
    g.add(mesh(new THREE.BoxGeometry(c.width * 0.9, 0.06, c.depth * 0.9), M.deskChair, 0, c.topHeight - 0.03, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width * 0.9, 0.5, 0.05), M.deskChair, 0, c.topHeight + 0.25, c.depth * 0.45, false));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, c.topHeight - 0.08, 8), M.deskLeg, 0, (c.topHeight - 0.08) / 2 + 0.04, 0, false));
    g.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 10), M.deskLeg, 0, 0.02, 0, false));
    finish(ctx, g, L.workChair.colliders);
    refs.workChair = g;
  }

  // ===================== KAMAR TIDUR =====================
  {
    // Kasur: rangka berkaki tinggi (kolong 0,28 m), kasur, bantal, papan kepala
    const c = L.bed.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.bed.x, 0, L.bed.z);
    const under = REAL_SCALE.bed.UNDERSIDE;
    const frameH = 0.08;
    g.add(mesh(new THREE.BoxGeometry(c.width, frameH, c.depth), M.bedFrame, 0, under + frameH / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width - 0.06, c.topHeight - under - frameH, c.depth - 0.06), M.mattress, 0, (under + frameH + c.topHeight) / 2, 0));
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        g.add(mesh(new THREE.BoxGeometry(0.06, under, 0.06), M.bedFrame, lx * (c.width / 2 - 0.04), under / 2, lz * (c.depth / 2 - 0.04), false));
      }
    }
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.6, 0.06), M.bedFrame, 0, c.topHeight + 0.2, -c.depth / 2 + 0.03)); // papan kepala (utara)
    for (const side of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(0.55, 0.1, 0.35), M.pillow, side * 0.38, c.topHeight + 0.05, -c.depth / 2 + 0.3, false));
    }
    finish(ctx, g, L.bed.colliders);
  }
  {
    const c = L.wardrobe.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.wardrobe.x, 0, L.wardrobe.z);
    g.add(mesh(new THREE.BoxGeometry(c.width, c.topHeight, c.depth), M.wardrobe, 0, c.topHeight / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.01, c.topHeight * 0.9, 0.01), M.woodDark, 0, c.topHeight / 2, c.depth / 2 + 0.005, false));
    for (const side of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(0.02, 0.25, 0.02), M.metalBrass, side * 0.06, c.topHeight * 0.55, c.depth / 2 + 0.015, false));
    }
    finish(ctx, g, L.wardrobe.colliders);
  }
  {
    // Meja rias menempel dinding lorong (sisi selatan kamar), cermin di dinding
    const c = L.dresser.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.dresser.x, 0, L.dresser.z);
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.04, c.depth), M.woodWarm, 0, c.topHeight - 0.02, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width - 0.04, 0.18, c.depth - 0.04), M.woodWarm, 0, c.topHeight - 0.13, 0));
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        g.add(mesh(new THREE.BoxGeometry(0.035, c.topHeight - 0.22, 0.035), M.woodDark, lx * (c.width / 2 - 0.05), (c.topHeight - 0.22) / 2, lz * (c.depth / 2 - 0.05), false));
      }
    }
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.7, 0.02), M.mirror, 0, c.topHeight + 0.5, c.depth / 2 - 0.01, false));
    finish(ctx, g, L.dresser.colliders);
  }

  // ===================== KAMAR MANDI =====================
  {
    const [bowl, tank] = L.toilet.colliders;
    const g = new THREE.Group();
    g.position.set(L.toilet.x, 0, L.toilet.z);
    g.add(mesh(new THREE.CylinderGeometry(0.19, 0.15, bowl.topHeight - 0.03, 16), M.porcelain, 0, (bowl.topHeight - 0.03) / 2, bowl.z - L.toilet.z));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), M.porcelain, 0, bowl.topHeight - 0.015, bowl.z - L.toilet.z));
    g.add(mesh(new THREE.BoxGeometry(tank.width, tank.topHeight - 0.35, tank.depth), M.porcelain, 0, 0.35 + (tank.topHeight - 0.35) / 2, tank.z - L.toilet.z));
    finish(ctx, g, L.toilet.colliders);
  }
  {
    const c = L.sink.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.sink.x, 0, L.sink.z);
    g.add(mesh(new THREE.BoxGeometry(c.width - 0.04, c.topHeight - 0.06, c.depth - 0.04), M.wardrobe, 0, (c.topHeight - 0.06) / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.06, c.depth), M.porcelain, 0, c.topHeight - 0.03, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), M.chrome, 0, c.topHeight + 0.1, -c.depth / 2 + 0.06, false));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.6, 0.02), M.mirror, 0, c.topHeight + 0.55, -c.depth / 2 + 0.01, false));
    finish(ctx, g, L.sink.colliders);
  }
  {
    // Keset kamar mandi (dekorasi, bukan penghalang)
    const bathMat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.01, 0.4), M.bathMat);
    bathMat.position.set(-1.5, 0.006, -3.4);
    bathMat.receiveShadow = true;
    scene.add(bathMat);
  }

  return { colliders: ctx.colliders, refs, mergeStats: ctx.stats };
}

// Kursi (kursi baca & kursi makan). yaw: arah hadap; sandaran di belakang.
function buildChair(ctx, M, x, z, c, yaw, withBack) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(mesh(new THREE.BoxGeometry(c.width, 0.06, c.depth), withBack ? M.woodWarm : M.fabricSofa, 0, c.topHeight - 0.03, 0));
  for (const lx of [-1, 1]) {
    for (const lz of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.016, c.topHeight - 0.06, 8), M.woodDark, lx * (c.width / 2 - 0.04), (c.topHeight - 0.06) / 2, lz * (c.depth / 2 - 0.04), false));
    }
  }
  if (withBack) {
    g.add(mesh(new THREE.BoxGeometry(c.width, 0.42, 0.04), M.woodWarm, 0, c.topHeight + 0.21, -c.depth / 2 + 0.02, false));
  }
  g.rotation.y = yaw; // sandaran (lokal -Z) di belakang arah hadap (+Z lokal)
  return finish(ctx, g, [{ ...c, x, z }])[0];
}

function buildPlant(ctx, M, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const potH = REAL_SCALE.pot.HEIGHT;
  const plantH = REAL_SCALE.plant.HEIGHT;
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.15, potH, 14), M.pot, 0, potH / 2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.03, 12), M.soil, 0, potH - 0.02, 0, false));
  const leafH = (plantH - potH) * 0.95;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = mesh(new THREE.ConeGeometry(0.09, leafH, 6), M.leaf, Math.cos(angle) * 0.09, potH + leafH / 2 - 0.02, Math.sin(angle) * 0.09, false);
    leaf.rotation.z = -Math.cos(angle) * 0.48;
    leaf.rotation.x = Math.sin(angle) * 0.48;
    g.add(leaf);
  }
  g.add(mesh(new THREE.ConeGeometry(0.08, plantH - potH, 6), M.leaf, 0, potH + (plantH - potH) / 2, 0, false));
  const collider = finish(ctx, g, [{ x, z, ...FURNITURE_LAYOUT.plants.collider }])[0];
  return { group: g, collider };
}
