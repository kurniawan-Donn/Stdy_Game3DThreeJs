// Model ikan low-poly prosedural (dipakai ikan camilan & ikan dapur).
// Ikan menghadap +X lokal.
import * as THREE from 'three';
import { MATERIALS } from '../config.js';

export function createFishMesh(scale = 1) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ ...MATERIALS.fishBody });
  const finMat = new THREE.MeshStandardMaterial({ ...MATERIALS.fishFin });
  const eyeMat = new THREE.MeshStandardMaterial({ ...MATERIALS.fishEye });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), bodyMat);
  body.scale.set(2.2, 1, 0.55);
  body.castShadow = true;
  group.add(body);

  // Ekor: kerucut dengan ujung menempel ke badan
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.15, 4), finMat);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -0.27;
  tail.castShadow = true;
  group.add(tail);

  // Sirip punggung
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.015), finMat);
  fin.position.set(-0.02, 0.1, 0);
  fin.rotation.z = -0.25;
  group.add(fin);

  // Mata
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat);
    eye.position.set(0.15, 0.025, side * 0.045);
    group.add(eye);
  }

  group.scale.setScalar(scale);
  return group;
}
