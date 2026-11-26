// Perabotan ruang tamu dari bentuk dasar + collider AABB-nya.
// Posisi, ukuran & collider diambil dari FURNITURE_LAYOUT / REAL_SCALE
// (config.js); model dibangun dari dimensi collider sehingga visual dan
// tabrakan selalu cocok. Detail kecil (kaki, bantal, buku) tetap di sini.
import * as THREE from 'three';
import { FURNITURE_LAYOUT, MATERIALS, REAL_SCALE } from '../config.js';
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

// Daftarkan objek perabot yang bisa memudar saat menghalangi kamera
// (systems/cameraOcclusion.js). Material digandakan per perabot agar
// memudarkan satu perabot tidak ikut memudarkan perabot lain.
function registerFadeable(refs, objects, colliders) {
  const materials = [];
  for (const obj of objects) {
    obj.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      materials.push({ material: m.material, baseOpacity: m.material.opacity, baseTransparent: m.material.transparent });
    });
  }
  refs.fadeables.push({ colliders, materials, fade: 1 });
}

function shadowed(mesh, receive = true) {
  mesh.castShadow = true;
  mesh.receiveShadow = receive;
  return mesh;
}

// Membangun semua perabot ke dalam scene.
// Mengembalikan { colliders, refs }; refs berisi mesh/collider yang dipakai
// objek kenakalan (layar TV, collider sofa & kursi, tanaman, kursi kerja).
export function createFurniture(scene) {
  const colliders = [];
  const refs = { plants: [], fadeables: [] };
  const L = FURNITURE_LAYOUT;

  const woodDark = new THREE.MeshStandardMaterial({ ...MATERIALS.woodDark });
  const woodWarm = new THREE.MeshStandardMaterial({ ...MATERIALS.woodWarm });
  const fabricSofa = new THREE.MeshStandardMaterial({ ...MATERIALS.fabricSofa });
  const cushionMat = new THREE.MeshStandardMaterial({ ...MATERIALS.cushion });
  const metalDark = new THREE.MeshStandardMaterial({ ...MATERIALS.metalDark });
  const metalBrass = new THREE.MeshStandardMaterial({ ...MATERIALS.metalBrass });

  // 1. KARPET (datar di lantai, bukan penghalang)
  const rugMesh = new THREE.Mesh(
    new THREE.BoxGeometry(L.rug.width, 0.01, L.rug.depth),
    new THREE.MeshStandardMaterial({ map: createRugTexture(), ...MATERIALS.rug })
  );
  rugMesh.position.set(L.rug.x, 0.005, L.rug.z);
  rugMesh.receiveShadow = true;
  scene.add(rugMesh);

  // 2. SOFA: dudukan menghadap -Z, sandaran di sisi +Z
  {
    const [seatC, backC] = L.sofa.colliders;
    const g = new THREE.Group();
    g.position.set(L.sofa.x, 0, L.sofa.z);
    const W = seatC.width;
    const LEG = 0.08;
    const seatZ = seatC.z - L.sofa.z;
    const backZ = backC.z - L.sofa.z;
    const frontEdge = seatZ - seatC.depth / 2;
    const backEdge = backZ + backC.depth / 2;


    const base = shadowed(new THREE.Mesh(new THREE.BoxGeometry(W, seatC.topHeight - LEG, seatC.depth), fabricSofa));
    base.position.set(0, LEG + (seatC.topHeight - LEG) / 2, seatZ);
    g.add(base);

    const backH = backC.topHeight - LEG;
    const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(W, backH, backC.depth), fabricSofa));
    back.position.set(0, LEG + backH / 2, backZ);
    g.add(back);

    const armW = 0.14;
    for (const side of [-1, 1]) {
      const arm = shadowed(new THREE.Mesh(new THREE.BoxGeometry(armW, 0.16, seatC.depth), fabricSofa));
      arm.position.set(side * (W / 2 - armW / 2), seatC.topHeight + 0.08, seatZ);
      g.add(arm);

      const pillow = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.09), cushionMat), false);
      pillow.position.set(side * 0.58, seatC.topHeight + 0.13, backZ - backC.depth / 2 - 0.05);
      pillow.rotation.set(-0.2, side * 0.18, side * 0.08);
      g.add(pillow);

      for (const edge of [frontEdge + 0.08, backEdge - 0.08]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, LEG, 8), woodDark);
        leg.position.set(side * (W / 2 - 0.08), LEG / 2, edge);
        g.add(leg);
      }
    }
    scene.add(g);
    const sofaColliders = addColliders(colliders, L.sofa.colliders);
    refs.sofaSeat = sofaColliders[0];
    registerFadeable(refs, [g], sofaColliders);
  }

  // 3. MEJA KOPI
  {
    const c = L.coffeeTable.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.coffeeTable.x, 0, L.coffeeTable.z);
    const TOP = 0.04;
    const top = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width, TOP, c.depth), woodWarm));
    top.position.y = c.topHeight - TOP / 2;
    g.add(top);
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        const leg = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.04, c.topHeight - TOP, 0.04), woodDark), false);
        leg.position.set(lx * (c.width / 2 - 0.05), (c.topHeight - TOP) / 2, lz * (c.depth / 2 - 0.05));
        g.add(leg);
      }
    }
    // Dekorasi kecil di atas meja
    const mug = shadowed(new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.034, 0.09, 12),
      new THREE.MeshStandardMaterial({ ...MATERIALS.mug })
    ), false);
    mug.position.set(-0.3, c.topHeight + 0.045, 0.12);
    g.add(mug);
    scene.add(g);
    registerFadeable(refs, [g], addColliders(colliders, L.coffeeTable.colliders));
  }

  // 4. RAK TV + TV DI DINDING UTARA
  {
    const c = L.tvUnit.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.tvUnit.x, 0, L.tvUnit.z);
    const cabinet = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width, c.topHeight, c.depth), woodDark));
    cabinet.position.y = c.topHeight / 2;
    g.add(cabinet);

    const wallZ = -c.depth / 2 + 0.03; // TV menempel dinding
    const tvFrame = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.05), metalDark), false);
    tvFrame.position.set(0, 1.2, wallZ);
    g.add(tvFrame);

    const tvScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.12, 0.63),
      new THREE.MeshStandardMaterial({ ...MATERIALS.tvScreen })
    );
    tvScreen.position.set(0, 1.2, wallZ + 0.027);
    g.add(tvScreen);
    refs.tvScreen = tvScreen;

    scene.add(g);
    registerFadeable(refs, [g], addColliders(colliders, L.tvUnit.colliders));
  }

  // 5. RAK BUKU TINGGI (dinding timur; tempat tinggi, atasnya bisa dinaiki)
  {
    const c = L.tallShelf.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.tallShelf.x, 0, L.tallShelf.z);
    // c.width = sumbu X (dalam rak), c.depth = sumbu Z (lebar rak)
    const body = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width, c.topHeight, c.depth), woodDark));
    body.position.y = c.topHeight / 2;
    g.add(body);

    const bookColors = MATERIALS.bookColors;
    const front = -c.width / 2; // sisi rak yang menghadap ruangan (-X)
    for (let levelY = 0.3; levelY <= c.topHeight - 0.3; levelY += 0.36) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(c.width * 0.9, 0.02, c.depth * 0.94), woodWarm);
      plank.position.set(front + c.width * 0.45 - 0.01, levelY, 0);
      g.add(plank);

      // Deretan buku
      for (let bz = -c.depth / 2 + 0.06; bz <= c.depth / 2 - 0.06; bz += 0.065) {
        const bh = 0.18 + Math.abs(Math.sin(bz * 17 + levelY * 3)) * 0.08;
        const bookMat = new THREE.MeshStandardMaterial({
          color: bookColors[Math.floor(Math.abs(bz * 40 + levelY * 7)) % bookColors.length],
          ...MATERIALS.book
        });
        const book = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width * 0.6, bh, 0.05), bookMat), false);
        book.position.set(front + c.width * 0.32, levelY + 0.01 + bh / 2, bz);
        g.add(book);
      }
    }
    scene.add(g);
    registerFadeable(refs, [g], addColliders(colliders, L.tallShelf.colliders));
  }

  // 5b. RAK RENDAH (batu loncatan ke rak buku tinggi)
  {
    const c = L.lowShelf.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.lowShelf.x, 0, L.lowShelf.z);
    const body = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width - 0.02, c.topHeight - 0.03, c.depth - 0.02), woodWarm));
    body.position.y = (c.topHeight - 0.03) / 2;
    g.add(body);
    const top = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width, 0.03, c.depth), woodDark));
    top.position.y = c.topHeight - 0.015;
    g.add(top);
    scene.add(g);
    registerFadeable(refs, [g], addColliders(colliders, L.lowShelf.colliders));
  }

  // 5c. KURSI
  {
    const c = L.chair.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.chair.x, 0, L.chair.z);
    const seat = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width, 0.08, c.depth), fabricSofa));
    seat.position.y = c.topHeight - 0.04;
    g.add(seat);
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        const leg = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, c.topHeight - 0.08, 8), woodDark), false);
        leg.position.set(lx * (c.width / 2 - 0.05), (c.topHeight - 0.08) / 2, lz * (c.depth / 2 - 0.05));
        g.add(leg);
      }
    }
    scene.add(g);
    refs.chair = addColliders(colliders, L.chair.colliders)[0];
    registerFadeable(refs, [g], [refs.chair]);
  }

  // 6. LAMPU BERDIRI
  {
    const c = L.floorLamp.colliders[0];
    const g = new THREE.Group();
    g.position.set(L.floorLamp.x, 0, L.floorLamp.z);
    const lampBase = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16), metalBrass), false);
    lampBase.position.y = 0.02;
    g.add(lampBase);
    const poleH = c.topHeight - 0.22;
    const lampPole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, poleH, 8), metalBrass), false);
    lampPole.position.y = poleH / 2 + 0.04;
    g.add(lampPole);
    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.2, 0.24, 16, 1, true),
      new THREE.MeshStandardMaterial({ ...MATERIALS.lampShade, side: THREE.DoubleSide })
    );
    lampShade.position.y = c.topHeight - 0.12;
    g.add(lampShade);
    scene.add(g);
    registerFadeable(refs, [g], addColliders(colliders, L.floorLamp.colliders));
  }

  // 7. TANAMAN POT (dua sudut ruangan)
  for (const p of L.plants.positions) {
    const plant = createPottedPlant(scene, colliders, p.x, p.z);
    refs.plants.push(plant);
    registerFadeable(refs, [plant.group], [plant.collider]);
  }

  // 8. POJOK DAPUR: konter (lompat tinggi) + kulkas (tempat tinggi)
  createKitchen(scene, colliders, refs);

  // 9. POS KERJA PEMILIK: meja, kursi, laptop
  createWorkstation(scene, colliders, refs);

  return { colliders, refs };
}

function createKitchen(scene, colliders, refs) {
  const L = FURNITURE_LAYOUT;
  const c = L.kitchenCounter.colliders[0];
  // Sisi depan menghadap ke tengah ruangan
  const front = -Math.sign(L.kitchenCounter.z) || 1;

  const counterGroup = new THREE.Group();
  counterGroup.position.set(L.kitchenCounter.x, 0, L.kitchenCounter.z);

  const bodyH = c.topHeight - 0.04;
  const body = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(c.width - 0.04, bodyH, c.depth - 0.04),
    new THREE.MeshStandardMaterial({ ...MATERIALS.counterBody })
  ));
  body.position.y = bodyH / 2;
  counterGroup.add(body);

  const top = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(c.width, 0.04, c.depth),
    new THREE.MeshStandardMaterial({ ...MATERIALS.counterTop })
  ));
  top.position.y = c.topHeight - 0.02;
  counterGroup.add(top);

  // Garis pintu lemari
  const doorMat = new THREE.MeshStandardMaterial({ ...MATERIALS.counterTop });
  for (let i = -1; i <= 1; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, bodyH * 0.8, 0.006), doorMat);
    seam.position.set(i * (c.width / 3), bodyH / 2, front * ((c.depth - 0.04) / 2 + 0.003));
    counterGroup.add(seam);
  }

  scene.add(counterGroup);
  registerFadeable(refs, [counterGroup], addColliders(colliders, L.kitchenCounter.colliders));

  // Kulkas
  const f = L.fridge.colliders[0];
  const fridge = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(f.width, f.topHeight, f.depth),
    new THREE.MeshStandardMaterial({ ...MATERIALS.fridge })
  ));
  fridge.position.set(L.fridge.x, f.topHeight / 2, L.fridge.z);
  scene.add(fridge);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.4, 0.025),
    new THREE.MeshStandardMaterial({ ...MATERIALS.metalDark })
  );
  handle.position.set(L.fridge.x + f.width / 2 - 0.08, f.topHeight * 0.6, L.fridge.z + front * (f.depth / 2 + 0.015));
  scene.add(handle);

  registerFadeable(refs, [fridge, handle], addColliders(colliders, L.fridge.colliders));
}

function createPottedPlant(scene, colliders, x, z) {
  const plantGroup = new THREE.Group();
  plantGroup.position.set(x, 0, z);
  const potH = REAL_SCALE.pot.HEIGHT;
  const plantH = REAL_SCALE.plant.HEIGHT;

  const pot = shadowed(new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.15, potH, 14),
    new THREE.MeshStandardMaterial({ ...MATERIALS.pot })
  ));
  pot.position.y = potH / 2;
  plantGroup.add(pot);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.185, 0.03, 12),
    new THREE.MeshStandardMaterial({ ...MATERIALS.soil })
  );
  soil.position.y = potH - 0.02;
  plantGroup.add(soil);

  const leafMat = new THREE.MeshStandardMaterial({ ...MATERIALS.leaf });
  const leafH = (plantH - potH) * 0.95;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, leafH, 6), leafMat);
    leaf.position.set(Math.cos(angle) * 0.09, potH + leafH / 2 - 0.02, Math.sin(angle) * 0.09);
    leaf.rotation.z = -Math.cos(angle) * 0.48;
    leaf.rotation.x = Math.sin(angle) * 0.48;
    leaf.castShadow = true;
    plantGroup.add(leaf);
  }

  const topLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.08, plantH - potH, 6), leafMat);
  topLeaf.position.y = potH + (plantH - potH) / 2;
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

  const top = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(d.width, 0.04, d.depth),
    new THREE.MeshStandardMaterial({ ...MATERIALS.deskTop })
  ));
  top.position.y = d.topHeight - 0.02;
  desk.add(top);

  const legMat = new THREE.MeshStandardMaterial({ ...MATERIALS.deskLeg });
  for (const lx of [-1, 1]) {
    for (const lz of [-1, 1]) {
      const leg = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.04, d.topHeight - 0.04, 0.04), legMat), false);
      leg.position.set(lx * (d.width / 2 - 0.05), (d.topHeight - 0.04) / 2, lz * (d.depth / 2 - 0.05));
      desk.add(leg);
    }
  }

  // Laptop: alas + layar menyala (menghadap kursi, +Z)
  const laptopMat = new THREE.MeshStandardMaterial({ ...MATERIALS.laptop });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.22), laptopMat);
  base.position.set(0, d.topHeight + 0.008, 0.1);
  desk.add(base);
  const lid = new THREE.Group();
  lid.position.set(0, d.topHeight + 0.015, -0.01);
  lid.rotation.x = -0.25;
  const lidBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.21, 0.01), laptopMat);
  lidBack.position.y = 0.105;
  lid.add(lidBack);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.29, 0.18),
    new THREE.MeshStandardMaterial({ ...MATERIALS.laptopScreen })
  );
  screen.position.set(0, 0.105, 0.006);
  lid.add(screen);
  desk.add(lid);

  scene.add(desk);
  registerFadeable(refs, [desk], addColliders(colliders, L.workDesk.colliders));

  // Kursi kerja (berputar mengikuti pemilik)
  const c = L.workChair.colliders[0];
  const chairMat = new THREE.MeshStandardMaterial({ ...MATERIALS.deskChair });
  const chair = new THREE.Group();
  chair.position.set(L.workChair.x, 0, L.workChair.z);
  const seat = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width * 0.9, 0.06, c.depth * 0.9), chairMat));
  seat.position.y = c.topHeight - 0.03;
  chair.add(seat);
  const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(c.width * 0.9, 0.5, 0.05), chairMat), false);
  back.position.set(0, c.topHeight + 0.25, c.depth * 0.45);
  chair.add(back);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, c.topHeight - 0.08, 8), legMat);
  post.position.y = (c.topHeight - 0.08) / 2 + 0.04;
  chair.add(post);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 10), legMat);
  foot.position.y = 0.02;
  chair.add(foot);
  scene.add(chair);
  registerFadeable(refs, [chair], addColliders(colliders, L.workChair.colliders));

  refs.workChair = chair;
}
