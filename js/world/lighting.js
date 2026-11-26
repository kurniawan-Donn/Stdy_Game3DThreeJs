// Pencahayaan rumah. Hanya matahari (directional) yang memakai bayangan;
// lampu ruangan adalah point light tanpa bayangan agar tetap ringan.
import * as THREE from 'three';
import { LIGHTS, ROOM } from '../config.js';

export function setupLights(scene) {
  const h = LIGHTS.hemi;
  const hemiLight = new THREE.HemisphereLight(h.skyColor, h.groundColor, h.intensity);
  hemiLight.position.set(0, ROOM.HEIGHT, 0);
  scene.add(hemiLight);

  // Matahari dari luar jendela ruang tamu (barat)
  const s = LIGHTS.sun;
  const sunLight = new THREE.DirectionalLight(s.color, s.intensity);
  sunLight.position.set(...s.position);
  sunLight.target.position.set(...s.target);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = s.shadowMapSize;
  sunLight.shadow.mapSize.height = s.shadowMapSize;
  const sc = s.shadowCamera;
  Object.assign(sunLight.shadow.camera, { near: sc.near, far: sc.far, left: sc.left, right: sc.right, top: sc.top, bottom: sc.bottom });
  sunLight.shadow.bias = s.shadowBias;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Lampu ruangan tanpa bayangan
  const lights = { sun: sunLight, hemi: hemiLight };
  for (const p of LIGHTS.points) {
    const light = new THREE.PointLight(p.color, p.intensity, p.distance, p.decay);
    light.position.set(...p.position);
    light.castShadow = false;
    scene.add(light);
    lights[p.name] = light;
  }
  return lights;
}
