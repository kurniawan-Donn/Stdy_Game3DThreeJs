// Perabotan ruang tamu dari bentuk dasar + collider AABB-nya.
// Posisi & collider diambil dari FURNITURE_LAYOUT (config.js);
// dimensi detail mesh adalah data model dan tetap di sini.
import * as THREE from 'three';
import { FURNITURE_LAYOUT, MATERIALS } from '../config.js';
import { createRugTexture } from './textures.js';

// Collider AABB: { minX, maxX, minZ, maxZ, topHeight, climbable, occludes, navBlocks }
// occludes: menghalangi pandangan pemilik (default true)
// navBlocks: menghalangi jalur pemilik (default true)
function addFurnitureCollider(colliders, c) {
  colliders.push({
    minX: c.x - c.width / 2,
    maxX: c.x + c.width / 2,
    minZ: c.z - c.depth / 2,
    maxZ: c.z + c.depth / 2,
    topHeight: c.topHeight,
    climbable: c.climbable === true,
    occludes: c.occludes !== false,
    navBlocks: c.navBlocks !== false
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

// Membangun semua perabot ke dalam scene.
// Mengembalikan { colliders, refs }; refs berisi mesh/collider yang dipakai
// objek kenakalan (layar TV, collider sofa & kursi, tanaman).
export function createFurniture(scene) {
  const colliders = [];
  const refs = { plants: [] };
  const L = FURNITURE_LAYOUT;

  const woodDark = new THREE.MeshStandardMaterial({ ...MATERIALS.woodDark });
  const woodWarm = new THREE.MeshStandardMaterial({ ...MATERIALS.woodWarm });
  const fabricSofa = new THREE.MeshStandardMaterial({ ...MATERIALS.fabricSofa });
  const cushionMat = new THREE.MeshStandardMaterial({ ...MATERIALS.cushion });
  const metalDark = new THREE.MeshStandardMaterial({ ...MATERIALS.metalDark });
  const metalBrass = new THREE.MeshStandardMaterial({ ...MATERIALS.metalBrass });

  // 1. KARPET (datar di lantai, bukan penghalang)
  const rugMesh = new THREE.Mesh(
    new THREE.BoxGeometry(L.rug.width, 0.03, L.rug.depth),
    new THREE.MeshStandardMaterial({ map: createRugTexture(), ...MATERIALS.rug })
  );
  rugMesh.position.set(L.rug.x, 0.015, L.rug.z);
  rugMesh.receiveShadow = true;
  scene.add(rugMesh);

  // 2. SOFA
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(L.sofa.x, 0, L.sofa.z);

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.55, 1.9), fabricSofa);
  sofaBase.position.y = 0.42;
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  sofaGroup.add(sofaBase);

  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.05, 0.42), fabricSofa);
  sofaBack.position.set(0, 1.15, 0.74);
  sofaBack.castShadow = true;
  sofaBack.receiveShadow = true;
  sofaGroup.add(sofaBack);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 1.9), fabricSofa);
  armL.position.set(-2.39, 0.72, 0);
  armL.castShadow = true;
  sofaGroup.add(armL);

  const armR = armL.clone();
  armR.position.x = 2.39;
  sofaGroup.add(armR);

  // Bantal aksen
  const pil1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.25), cushionMat);
  pil1.position.set(-1.65, 0.95, 0.38);
  pil1.rotation.set(-0.2, 0.18, 0.08);
  pil1.castShadow = true;
  sofaGroup.add(pil1);

  const pil2 = pil1.clone();
  pil2.position.set(1.65, 0.95, 0.38);
  pil2.rotation.set(-0.2, -0.18, -0.08);
  sofaGroup.add(pil2);

  // Kaki sofa
  for (const lx of [-2.3, 2.3]) {
    for (const lz of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.16, 8), woodDark);
      leg.position.set(lx, 0.08, lz);
      sofaGroup.add(leg);
    }
  }
  scene.add(sofaGroup);
  refs.sofaSeat = addColliders(colliders, L.sofa.colliders)[0];

  // 3. MEJA KOPI
  const tableGroup = new THREE.Group();
  tableGroup.position.set(L.coffeeTable.x, 0, L.coffeeTable.z);

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.45), woodWarm);
  tableTop.position.y = 0.62;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableGroup.add(tableTop);

  for (const tx of [-1.2, 1.2]) {
    for (const tz of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.56, 0.1), woodDark);
      leg.position.set(tx, 0.28, tz);
      leg.castShadow = true;
      tableGroup.add(leg);
    }
  }
  // Dekorasi kecil di atas meja
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.09, 0.18, 12),
    new THREE.MeshStandardMaterial({ ...MATERIALS.mug })
  );
  mug.position.set(0.55, 0.77, 0.15);
  mug.castShadow = true;
  tableGroup.add(mug);

  scene.add(tableGroup);
  addColliders(colliders, L.coffeeTable.colliders);

  // 4. TV DI DINDING + KABINET TV
  const tvUnit = new THREE.Group();
  tvUnit.position.set(L.tvUnit.x, 0, L.tvUnit.z);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.72, 1.0), woodDark);
  cabinet.position.y = 0.36;
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  tvUnit.add(cabinet);

  // Layar TV menempel di dinding utara
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.1, 0.12), metalDark);
  tvFrame.position.set(0, 2.45, -0.62);
  tvFrame.castShadow = true;
  tvUnit.add(tvFrame);

  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.56, 1.88),
    new THREE.MeshStandardMaterial({ ...MATERIALS.tvScreen })
  );
  tvScreen.position.set(0, 2.45, -0.55);
  tvUnit.add(tvScreen);
  refs.tvScreen = tvScreen;

  scene.add(tvUnit);
  addColliders(colliders, L.tvUnit.colliders);

  // 5. RAK BUKU TINGGI (dinding timur)
  const shelfGroup = new THREE.Group();
  shelfGroup.position.set(L.tallShelf.x, 0, L.tallShelf.z);

  const shelfBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.2, 3.4), woodDark);
  shelfBody.position.set(0.2, 2.1, 0);
  shelfBody.castShadow = true;
  shelfBody.receiveShadow = true;
  shelfGroup.add(shelfBody);

  const bookColors = MATERIALS.bookColors;
  for (let levelY = 0.75; levelY <= 3.55; levelY += 0.92) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.08, 3.25), woodWarm);
    plank.position.set(0.14, levelY, 0);
    shelfGroup.add(plank);

    // Deretan buku
    for (let bz = -1.2; bz <= 1.2; bz += 0.34) {
      const bh = 0.45 + ((Math.abs(Math.sin(bz * 5 + levelY)) * 0.25));
      const bookMat = new THREE.MeshStandardMaterial({
        color: bookColors[Math.floor(Math.abs(bz * 10 + levelY)) % bookColors.length],
        ...MATERIALS.book
      });
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.65, bh, 0.22), bookMat);
      book.position.set(-0.08, levelY + 0.04 + bh / 2, bz);
      book.castShadow = true;
      shelfGroup.add(book);
    }
  }
  scene.add(shelfGroup);
  addColliders(colliders, L.tallShelf.colliders);

  // 5b. RAK BUKU RENDAH (bisa dinaiki)
  const lowShelfGroup = new THREE.Group();
  lowShelfGroup.position.set(L.lowShelf.x, 0, L.lowShelf.z);

  const lowShelfBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.84, 2.2), woodWarm);
  lowShelfBody.position.y = 0.42;
  lowShelfBody.castShadow = true;
  lowShelfBody.receiveShadow = true;
  lowShelfGroup.add(lowShelfBody);

  const lowShelfTop = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.08, 2.28), woodDark);
  lowShelfTop.position.y = 0.82;
  lowShelfTop.castShadow = true;
  lowShelfTop.receiveShadow = true;
  lowShelfGroup.add(lowShelfTop);

  scene.add(lowShelfGroup);
  addColliders(colliders, L.lowShelf.colliders);

  // 5c. KURSI (bisa dinaiki)
  const chairGroup = new THREE.Group();
  chairGroup.position.set(L.chair.x, 0, L.chair.z);

  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 1.35), fabricSofa);
  chairSeat.position.y = 0.47;
  chairSeat.castShadow = true;
  chairSeat.receiveShadow = true;
  chairGroup.add(chairSeat);

  for (const cx of [-0.52, 0.52]) {
    for (const cz of [-0.52, 0.52]) {
      const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.36, 8), woodDark);
      cLeg.position.set(cx, 0.18, cz);
      cLeg.castShadow = true;
      chairGroup.add(cLeg);
    }
  }
  scene.add(chairGroup);
  refs.chair = addColliders(colliders, L.chair.colliders)[0];

  // 6. LAMPU BERDIRI
  const lampGroup = new THREE.Group();
  lampGroup.position.set(L.floorLamp.x, 0, L.floorLamp.z);

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 16), metalBrass);
  lampBase.position.y = 0.05;
  lampBase.castShadow = true;
  lampGroup.add(lampBase);

  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 10), metalBrass);
  lampPole.position.y = 1.75;
  lampPole.castShadow = true;
  lampGroup.add(lampPole);

  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.56, 0.65, 16, 1, true),
    new THREE.MeshStandardMaterial({ ...MATERIALS.lampShade, side: THREE.DoubleSide })
  );
  lampShade.position.y = 3.55;
  lampGroup.add(lampShade);

  scene.add(lampGroup);
  addColliders(colliders, L.floorLamp.colliders);

  // 7. TANAMAN POT (dua sudut ruangan)
  for (const p of L.plants.positions) {
    refs.plants.push(createPottedPlant(scene, colliders, p.x, p.z));
  }

  // 8. POJOK DAPUR: meja dapur (bisa dinaiki) + kulkas
  createKitchen(scene, colliders);

  // 9. POS KERJA PEMILIK: meja, kursi, laptop
  createWorkstation(scene, colliders, refs);

  return { colliders, refs };
}

function createKitchen(scene, colliders) {
  const L = FURNITURE_LAYOUT;
  const c = L.kitchenCounter.colliders[0];
  // Sisi depan menghadap ke tengah ruangan
  const front = -Math.sign(L.kitchenCounter.z) || 1;

  const counterGroup = new THREE.Group();
  counterGroup.position.set(L.kitchenCounter.x, 0, L.kitchenCounter.z);

  const bodyH = c.topHeight - 0.06;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(c.width - 0.1, bodyH, c.depth - 0.1),
    new THREE.MeshStandardMaterial({ ...MATERIALS.counterBody })
  );
  body.position.y = bodyH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  counterGroup.add(body);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(c.width, 0.06, c.depth),
    new THREE.MeshStandardMaterial({ ...MATERIALS.counterTop })
  );
  top.position.y = c.topHeight - 0.03;
  top.castShadow = true;
  top.receiveShadow = true;
  counterGroup.add(top);

  // Garis pintu lemari
  const doorMat = new THREE.MeshStandardMaterial({ ...MATERIALS.counterTop });
  for (let i = -1; i <= 1; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, bodyH * 0.8, 0.01), doorMat);
    seam.position.set(i * 1.0, bodyH / 2, front * ((c.depth - 0.1) / 2 + 0.005));
    counterGroup.add(seam);
  }

  scene.add(counterGroup);
  addColliders(colliders, L.kitchenCounter.colliders);

  // Kulkas
  const f = L.fridge.colliders[0];
  const fridgeMat = new THREE.MeshStandardMaterial({ ...MATERIALS.fridge });
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(f.width, f.topHeight, f.depth), fridgeMat);
  fridge.position.set(L.fridge.x, f.topHeight / 2, L.fridge.z);
  fridge.castShadow = true;
  fridge.receiveShadow = true;
  scene.add(fridge);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.6, 0.05),
    new THREE.MeshStandardMaterial({ ...MATERIALS.metalDark })
  );
  handle.position.set(L.fridge.x + f.width / 2 - 0.15, 1.2, L.fridge.z + front * (f.depth / 2 + 0.03));
  scene.add(handle);

  addColliders(colliders, L.fridge.colliders);
}

function createPottedPlant(scene, colliders, x, z) {
  const plantGroup = new THREE.Group();
  plantGroup.position.set(x, 0, z);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.36, 0.78, 14),
    new THREE.MeshStandardMaterial({ ...MATERIALS.pot })
  );
  pot.position.y = 0.39;
  pot.castShadow = true;
  pot.receiveShadow = true;
  plantGroup.add(pot);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.08, 12),
    new THREE.MeshStandardMaterial({ ...MATERIALS.soil })
  );
  soil.position.y = 0.76;
  plantGroup.add(soil);

  const leafMat = new THREE.MeshStandardMaterial({ ...MATERIALS.leaf });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.15, 6), leafMat);
    leaf.position.set(Math.cos(angle) * 0.24, 1.25, Math.sin(angle) * 0.24);
    leaf.rotation.z = -Math.cos(angle) * 0.48;
    leaf.rotation.x = Math.sin(angle) * 0.48;
    leaf.castShadow = true;
    plantGroup.add(leaf);
  }

  const topLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.25, 6), leafMat);
  topLeaf.position.y = 1.4;
  topLeaf.castShadow = true;
  plantGroup.add(topLeaf);

  scene.add(plantGroup);
  const collider = addColliders(colliders, [{ x, z, ...FURNITURE_LAYOUT.plants.collider }])[0];
  return { group: plantGroup, collider };
}

function createWorkstation(scene, colliders, refs) {
  const L = FURNITURE_LAYOUT;
  const d = L.workDesk.colliders[0];

  const desk = new THREE.Group();
  desk.position.set(L.workDesk.x, 0, L.workDesk.z);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(d.width, 0.05, d.depth),
    new THREE.MeshStandardMaterial({ ...MATERIALS.deskTop })
  );
  top.position.y = d.topHeight - 0.025;
  top.castShadow = true;
  top.receiveShadow = true;
  desk.add(top);

  const legMat = new THREE.MeshStandardMaterial({ ...MATERIALS.deskLeg });
  for (const lx of [-1, 1]) {
    for (const lz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, d.topHeight - 0.05, 0.05), legMat);
      leg.position.set(lx * (d.width / 2 - 0.06), (d.topHeight - 0.05) / 2, lz * (d.depth / 2 - 0.06));
      leg.castShadow = true;
      desk.add(leg);
    }
  }

  // Laptop: alas + layar menyala (menghadap kursi, +Z)
  const laptopMat = new THREE.MeshStandardMaterial({ ...MATERIALS.laptop });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.3), laptopMat);
  base.position.set(0, d.topHeight + 0.01, 0.12);
  desk.add(base);
  const lid = new THREE.Group();
  lid.position.set(0, d.topHeight + 0.02, -0.03);
  lid.rotation.x = -0.25;
  const lidBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.015), laptopMat);
  lidBack.position.y = 0.14;
  lid.add(lidBack);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.24),
    new THREE.MeshStandardMaterial({ ...MATERIALS.laptopScreen })
  );
  screen.position.set(0, 0.14, 0.009);
  lid.add(screen);
  desk.add(lid);

  scene.add(desk);
  addColliders(colliders, L.workDesk.colliders);

  // Kursi kerja
  const c = L.workChair.colliders[0];
  const chairMat = new THREE.MeshStandardMaterial({ ...MATERIALS.deskChair });
  const chair = new THREE.Group();
  chair.position.set(L.workChair.x, 0, L.workChair.z);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
  seat.position.y = c.topHeight - 0.04;
  seat.castShadow = true;
  chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.07), chairMat);
  back.position.set(0, c.topHeight + 0.3, 0.27);
  back.castShadow = true;
  chair.add(back);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, c.topHeight - 0.1, 8), legMat);
  post.position.y = (c.topHeight - 0.1) / 2 + 0.05;
  chair.add(post);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), legMat);
  foot.position.y = 0.03;
  chair.add(foot);
  scene.add(chair);
  addColliders(colliders, L.workChair.colliders);

  refs.workChair = chair;
}
