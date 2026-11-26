// Melepas geometri, material, dan tekstur objek 3D yang tidak dipakai lagi
// (mencegah memory leak saat level diulang/diganti). Aman dipanggil pada
// sumber daya yang masih dipakai objek lain: three.js akan mengunggahnya
// ulang saat dirender, jadi tidak pernah merusak tampilan.
const TEXTURE_KEYS = ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap'];

function disposeMaterial(m) {
  for (const k of TEXTURE_KEYS) if (m[k] && m[k].dispose) m[k].dispose();
  m.dispose();
}

export function disposeObject3D(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.geometry && o.geometry.dispose) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach(disposeMaterial);
      else disposeMaterial(o.material);
    }
  });
}

// Keluarkan dari parent lalu lepas sumber dayanya
export function removeAndDispose(obj) {
  if (!obj) return;
  if (obj.parent) obj.parent.remove(obj);
  disposeObject3D(obj);
}
