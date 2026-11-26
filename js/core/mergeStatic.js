// Menggabungkan mesh statis di dalam sebuah grup menjadi satu mesh per
// material (+ flag bayangan) untuk mengurangi draw call. Transformasi anak
// "dipanggang" ke geometri relatif terhadap grup, sehingga grup itu sendiri
// tetap bisa dipindah/diputar (mis. pot terguling, kursi kerja berputar).
// Mesh dengan userData.noMerge = true dibiarkan apa adanya (mis. layar TV).
import * as THREE from 'three';

const tmp = new THREE.Matrix4();
const inv = new THREE.Matrix4();

function mergeGeometries(geos) {
  const hasUv = geos.every((g) => g.attributes.uv);
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = hasUv ? new Float32Array(count * 2) : null;
  let o = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (uv) uv.set(g.attributes.uv.array, o * 2);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

// Mengembalikan jumlah mesh sebelum & sesudah (untuk debug/uji).
export function mergeStaticGroup(group) {
  group.updateMatrixWorld(true);
  inv.copy(group.matrixWorld).invert();
  const buckets = new Map();
  const meshes = [];

  group.traverse((m) => {
    if (!m.isMesh || m.userData.noMerge || Array.isArray(m.material)) return;
    meshes.push(m);
  });

  for (const m of meshes) {
    const key = `${m.material.uuid}|${m.castShadow}|${m.receiveShadow}`;
    let b = buckets.get(key);
    if (!b) {
      b = { material: m.material, cast: m.castShadow, receive: m.receiveShadow, geos: [] };
      buckets.set(key, b);
    }
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    tmp.multiplyMatrices(inv, m.matrixWorld);
    g.applyMatrix4(tmp);
    b.geos.push(g);
    m.parent.remove(m);
  }

  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(b.geos), b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    group.add(mesh);
    for (const g of b.geos) g.dispose();
  }
  return { before: meshes.length, after: buckets.size };
}
