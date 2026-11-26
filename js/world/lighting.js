// Pencahayaan hangat ruang tamu (maksimal 2 shadow caster aktif).
import * as THREE from 'three';
import { LIGHTS, ROOM } from '../config.js';

export function setupLights(scene) {
  // 1. HemisphereLight hangat
  const h = LIGHTS.hemi;
  const hemiLight = new THREE.HemisphereLight(h.skyColor, h.groundColor, h.intensity);
  hemiLight.position.set(0, ROOM.HEIGHT, 0);
  scene.add(hemiLight);

  // 2. DirectionalLight sinar matahari dari jendela di dinding barat (-X)
  const s = LIGHTS.sun;
  const sunLight = new THREE.DirectionalLight(s.color, s.intensity);
  sunLight.position.set(...s.position);
  sunLight.target.position.set(...s.target);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = s.shadowMapSize;
  sunLight.shadow.mapSize.height = s.shadowMapSize;
  sunLight.shadow.camera.near = s.shadowCamera.near;
  sunLight.shadow.camera.far = s.shadowCamera.far;
  sunLight.shadow.camera.left = s.shadowCamera.left;
  sunLight.shadow.camera.right = s.shadowCamera.right;
  sunLight.shadow.camera.top = s.shadowCamera.top;
  sunLight.shadow.camera.bottom = s.shadowCamera.bottom;
  sunLight.shadow.bias = s.shadowBias;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // 3. PointLight lembut dari lampu berdiri di sudut sofa (shadow caster ke-2)
  const l = LIGHTS.lamp;
  const lampLight = new THREE.PointLight(l.color, l.intensity, l.distance, l.decay);
  lampLight.position.set(...l.position);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.width = l.shadowMapSize;
  lampLight.shadow.mapSize.height = l.shadowMapSize;
  lampLight.shadow.bias = l.shadowBias;
  scene.add(lampLight);

  // 4. PointLight pengisi lembut di dekat TV (tanpa shadow)
  const f = LIGHTS.fill;
  const fillLight = new THREE.PointLight(f.color, f.intensity, f.distance, f.decay);
  fillLight.position.set(...f.position);
  scene.add(fillLight);
}
