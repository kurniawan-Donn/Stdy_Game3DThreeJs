// Model pemilik rumah low-poly prosedural (~1,7 m), satu THREE.Group.
// Menghadap +Z lokal. Sendi memakai pivot Group agar mudah dianimasikan:
// hips → (legL/legR: hip → knee), torso → (armL/armR: shoulder → elbow → hand), head.
import * as THREE from 'three';
import { MATERIALS } from '../../config.js';

const HIP_Y = 0.89; // kaki menapak di y = 0; puncak kepala ±1,74 m

function box(w, h, d, mat, y = 0, x = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function createOwnerMesh() {
  const skin = new THREE.MeshStandardMaterial({ ...MATERIALS.ownerSkin });
  const hair = new THREE.MeshStandardMaterial({ ...MATERIALS.ownerHair });
  const shirt = new THREE.MeshStandardMaterial({ ...MATERIALS.ownerShirt });
  const pants = new THREE.MeshStandardMaterial({ ...MATERIALS.ownerPants });
  const shoes = new THREE.MeshStandardMaterial({ ...MATERIALS.ownerShoes });
  const eyeMat = new THREE.MeshStandardMaterial({ ...MATERIALS.catEye });

  const root = new THREE.Group();

  // Pinggul (pivot untuk naik-turun saat duduk)
  const hips = new THREE.Group();
  hips.position.y = HIP_Y;
  root.add(hips);
  hips.add(box(0.36, 0.16, 0.22, pants, 0));

  // Kaki: pivot pinggul → paha → pivot lutut → betis + sepatu
  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, -0.05, 0);
    hip.add(box(0.15, 0.42, 0.17, pants, -0.21));
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    knee.add(box(0.13, 0.37, 0.15, pants, -0.185));
    knee.add(box(0.14, 0.07, 0.26, shoes, -0.38, 0, 0.05));
    hip.add(knee);
    hips.add(hip);
    return { hip, knee };
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // Badan
  const torso = new THREE.Group();
  torso.position.y = 0.05;
  hips.add(torso);
  torso.add(box(0.42, 0.46, 0.23, shirt, 0.24));

  // Lengan: pivot bahu → lengan atas (lengan kaos + kulit) → pivot siku → lengan bawah + tangan
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.27, 0.43, 0);
    shoulder.add(box(0.12, 0.16, 0.13, shirt, -0.06));
    shoulder.add(box(0.1, 0.16, 0.1, skin, -0.21));
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    elbow.add(box(0.09, 0.25, 0.09, skin, -0.12));
    const hand = new THREE.Group();
    hand.position.y = -0.27;
    hand.add(box(0.09, 0.09, 0.07, skin, -0.03));
    elbow.add(hand);
    shoulder.add(elbow);
    torso.add(shoulder);
    return { shoulder, elbow, hand };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Gelas minum di tangan kanan (hanya terlihat saat minum)
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.04, 0.11, 10),
    new THREE.MeshStandardMaterial({ ...MATERIALS.ownerMug })
  );
  mug.position.set(0, -0.08, 0.06);
  mug.visible = false;
  armR.hand.add(mug);

  // Leher & kepala (pivot di leher untuk menoleh)
  torso.add(box(0.1, 0.07, 0.1, skin, 0.5));
  const head = new THREE.Group();
  head.position.y = 0.52;
  torso.add(head);
  head.add(box(0.21, 0.22, 0.23, skin, 0.12));
  head.add(box(0.23, 0.06, 0.25, hair, 0.25)); // atas
  head.add(box(0.23, 0.15, 0.05, hair, 0.17, 0, -0.11)); // belakang
  head.add(box(0.04, 0.05, 0.03, skin, 0.1, 0, 0.125)); // hidung
  for (const side of [-1, 1]) {
    head.add(box(0.035, 0.035, 0.02, eyeMat, 0.15, side * 0.055, 0.118));
  }

  return {
    root,
    parts: { hips, torso, head, legL, legR, armL, armR, mug }
  };
}

export { HIP_Y };
