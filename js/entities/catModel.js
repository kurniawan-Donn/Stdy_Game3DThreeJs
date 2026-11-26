// Model kucing prosedural berparameter tampilan (warna, pola, chonky) dan
// aksesoris satu slot. Dipakai kucing pemain (entities/cat.js) dan preview
// di lobi (world/lobby.js). Semua dari bentuk dasar, tanpa aset.
import * as THREE from 'three';
import { MATERIALS, REAL_SCALE, CUSTOMIZATION } from '../config.js';

export function catVariant(id) {
  return CUSTOMIZATION.CATS.find((c) => c.id === id) || CUSTOMIZATION.CATS[0];
}

export function accessoryItem(id) {
  return CUSTOMIZATION.ACCESSORIES.find((a) => a.id === id) || null;
}

// look = { cat: id, accessory: id | null }
// Mengembalikan { bodyPivot, parts, look }. bodyPivot ditambahkan ke grup
// kucing (pivot di tanah, kucing menghadap +Z lokal).
export function buildCatModel(look) {
  const v = catVariant(look.cat);
  const fur = (color) => new THREE.MeshStandardMaterial({ ...MATERIALS.catFurMain, color });
  const furMain = fur(v.fur);
  const furLight = fur(v.light);
  const pinkMat = new THREE.MeshStandardMaterial({ ...MATERIALS.catPink });
  const eyeMat = new THREE.MeshStandardMaterial({ ...MATERIALS.catEye, color: v.eye });
  const patMat = v.patternColor !== undefined ? fur(v.patternColor) : null;
  const patMat2 = v.patternColor2 !== undefined ? fur(v.patternColor2) : null;

  const CH = CUSTOMIZATION.CHONKY;
  const wide = v.chonky ? CH.BODY_WIDTH : 1;
  const tall = v.chonky ? CH.BODY_HEIGHT : 1;

  // Proporsi nyata (REAL_SCALE.cat): bahu 0,25 m, ujung telinga 0,35 m,
  // badan hidung→pantat 0,45 m, ekor 0,30 m.
  const LEG_TOP = 0.14; // tinggi sendi bahu/pinggul
  const bodyPivot = new THREE.Group();

  const box = (w, h, d, mat, x, y, z, parent, shadow = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (shadow) m.castShadow = true;
    parent.add(m);
    return m;
  };

  // Badan (punggung = tinggi bahu); chonky lebih lebar & bulat
  const torsoW = 0.13 * wide;
  const torsoH = 0.12 * tall;
  const torsoY = REAL_SCALE.cat.SHOULDER - 0.06 - (v.chonky ? CH.BELLY_DROP : 0);
  const torso = box(torsoW, torsoH, 0.32, furMain, 0, torsoY, -0.01, bodyPivot, true);
  torso.receiveShadow = true;
  if (v.chonky) {
    // Sisi perut membulat
    box(torsoW * 0.86, torsoH * 0.5, 0.26, furMain, 0, torsoY - torsoH * 0.45, -0.01, bodyPivot, true);
  }
  box(0.1 * wide, 0.04, 0.27, furLight, 0, torsoY - torsoH / 2 + 0.005, -0.01, bodyPivot);

  // Kepala (menghadap +Z lokal)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.27, 0.19);
  const headW = v.chonky ? 0.135 : 0.12;
  box(headW, 0.1, 0.11, furMain, 0, 0, 0, headGroup, true);
  if (v.chonky) {
    // Pipi tembam
    for (const s of [-1, 1]) box(0.03, 0.05, 0.07, furMain, s * (headW / 2 + 0.01), -0.02, 0.01, headGroup);
  }
  box(0.065, 0.04, 0.035, furLight, 0, -0.018, 0.065, headGroup);
  box(0.022, 0.016, 0.012, pinkMat, 0, -0.006, 0.084, headGroup);
  const eyeL = box(0.018, 0.024, 0.012, eyeMat, -0.03, 0.012, 0.055, headGroup);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.03;
  headGroup.add(eyeR);

  const earH = 0.055;
  const earY = REAL_SCALE.cat.EAR_TIP - headGroup.position.y - earH / 2;
  const ears = [];
  for (const side of [-1, 1]) {
    const earMat = v.pattern === 'calico' && side < 0 ? patMat : furMain;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.028, earH, 4), earMat);
    ear.position.set(side * 0.037, earY, 0.005);
    ear.rotation.y = Math.PI / 4;
    ear.rotation.z = -side * 0.14;
    ear.castShadow = true;
    headGroup.add(ear);
    ears.push(ear);
  }
  bodyPivot.add(headGroup);

  // 4 kaki dengan pivot di bahu/pinggul
  const legX = 0.04 * (v.chonky ? 1.12 : 1);
  function makeLeg(x, z, mat = furMain) {
    const pivot = new THREE.Group();
    pivot.position.set(x, LEG_TOP, z);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, LEG_TOP - 0.015, 0.035), mat);
    leg.position.y = -(LEG_TOP - 0.015) / 2;
    leg.castShadow = true;
    pivot.add(leg);
    box(0.04, 0.018, 0.045, furLight, 0, -LEG_TOP + 0.009, 0.006, pivot);
    bodyPivot.add(pivot);
    return pivot;
  }
  const calicoLeg = v.pattern === 'calico' ? patMat2 : furMain;
  const legFL = makeLeg(-legX, 0.1);
  const legFR = makeLeg(legX, 0.1);
  const legBL = makeLeg(-legX, -0.12, calicoLeg);
  const legBR = makeLeg(legX, -0.12);

  // Ekor
  const tailLen = REAL_SCALE.cat.TAIL;
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.22, -0.17);
  const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.028 * (v.chonky ? 1.2 : 1), tailLen * 0.85, 0.028 * (v.chonky ? 1.2 : 1)), furMain);
  tailMesh.position.set(0, tailLen * 0.39, -tailLen * 0.17);
  tailMesh.rotation.x = -0.45;
  tailMesh.castShadow = true;
  tailPivot.add(tailMesh);
  const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.032, tailLen * 0.15, 0.032), v.pattern === 'tabby' ? patMat : furLight);
  tailTip.position.set(0, tailLen * 0.8, -tailLen * 0.36);
  tailTip.rotation.x = -0.45;
  tailPivot.add(tailTip);
  bodyPivot.add(tailPivot);

  // --- Pola bulu ---
  const top = torsoY + torsoH / 2;
  if (v.pattern === 'tabby') {
    // Belang melintang di punggung, dahi, dan ekor
    for (const z of [-0.12, -0.05, 0.02, 0.09]) {
      box(torsoW + 0.004, 0.006, 0.022, patMat, 0, top + 0.001, z, bodyPivot);
      for (const s of [-1, 1]) box(0.006, torsoH * 0.6, 0.022, patMat, s * (torsoW / 2 + 0.001), top - torsoH * 0.3, z, bodyPivot);
    }
    for (const x of [-0.022, 0, 0.022]) box(0.008, 0.006, 0.05, patMat, x, 0.051, -0.005, headGroup);
    for (const f of [0.25, 0.5]) {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.032), patMat);
      const d = tailLen * 0.85 * f; // jarak dari pangkal di sepanjang sumbu ekor
      ring.position.set(0, d * Math.cos(0.45), -d * Math.sin(0.45));
      ring.rotation.x = -0.45;
      tailPivot.add(ring);
    }
  } else if (v.pattern === 'calico') {
    // Bercak oranye & hitam di punggung dan kepala
    box(torsoW * 0.62, 0.006, 0.12, patMat, -torsoW * 0.2, top + 0.001, 0.06, bodyPivot);
    box(torsoW * 0.55, 0.006, 0.1, patMat2, torsoW * 0.22, top + 0.002, -0.09, bodyPivot);
    box(0.006, torsoH * 0.7, 0.1, patMat2, torsoW / 2 + 0.001, torsoY, -0.09, bodyPivot);
    box(0.006, torsoH * 0.7, 0.12, patMat, -torsoW / 2 - 0.001, torsoY, 0.06, bodyPivot);
    box(0.05, 0.006, 0.06, patMat, -0.03, 0.051, 0, headGroup);
    tailMesh.material = patMat2;
  }

  const parts = { bodyPivot, headGroup, legFL, legFR, legBL, legBR, tailPivot, eyeMat }; // eyeMat: kilau mata (senter)

  // --- Aksesoris (satu slot) ---
  const acc = accessoryItem(look.accessory);
  if (acc) buildAccessory(acc, parts, { torsoW, torsoY, torsoH, headW });

  return { bodyPivot, parts, look: { cat: v.id, accessory: acc ? acc.id : null }, variant: v, accessory: acc };
}

function buildAccessory(acc, parts, dims) {
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  const m1 = mat(acc.color);
  const m2 = acc.color2 !== undefined ? mat(acc.color2, acc.id === 'bell' ? { metalness: 0.7, roughness: 0.3 } : {}) : null;
  const neck = new THREE.Group();
  // Leher: antara badan depan & kepala
  neck.position.set(0, dims.torsoY + dims.torsoH * 0.35, 0.155);
  parts.bodyPivot.add(neck);
  const add = (geo, m, x, y, z, parent = neck) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const collar = (m, r = dims.torsoW * 0.46, tube = 0.008) => {
    const t = add(new THREE.TorusGeometry(r, tube, 6, 16), m, 0, 0, 0);
    t.rotation.x = Math.PI / 2 - 0.5;
    return t;
  };
  if (acc.id === 'bowtie') {
    for (const s of [-1, 1]) {
      const wing = add(new THREE.ConeGeometry(0.018, 0.03, 4), m1, s * 0.017, -0.01, 0.045);
      wing.rotation.z = s * Math.PI / 2;
    }
    add(new THREE.BoxGeometry(0.012, 0.014, 0.012), m1, 0, -0.01, 0.047);
  } else if (acc.id === 'scarf') {
    collar(m1, dims.torsoW * 0.48, 0.014);
    const tail = add(new THREE.BoxGeometry(0.026, 0.07, 0.01), m1, 0.025, -0.045, 0.04);
    tail.rotation.z = 0.25;
    add(new THREE.BoxGeometry(0.027, 0.01, 0.011), m2, 0.03, -0.07, 0.04).rotation.z = 0.25;
  } else if (acc.id === 'hat') {
    const h = parts.headGroup;
    add(new THREE.CylinderGeometry(0.048, 0.048, 0.008, 14), m1, 0, 0.054, 0, h);
    add(new THREE.CylinderGeometry(0.03, 0.032, 0.04, 14), m1, 0, 0.078, 0, h);
    add(new THREE.CylinderGeometry(0.0325, 0.0325, 0.008, 14), m2, 0, 0.064, 0, h);
    neck.parent.remove(neck);
  } else if (acc.id === 'bell') {
    collar(m1);
    add(new THREE.SphereGeometry(0.014, 10, 8), m2, 0, -0.022, 0.05);
  }
}

// Lepas semua geometri & material model (saat ganti tampilan)
export function disposeCatModel(bodyPivot) {
  bodyPivot.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  if (bodyPivot.parent) bodyPivot.parent.remove(bodyPivot);
}
