// Partikel debu cahaya halus di berkas sinar jendela.
import * as THREE from 'three';
import { DUST } from '../config.js';

export function createDust(scene) {
  const count = DUST.COUNT;
  const positions = new Float32Array(count * 3);
  const velocities = [];
  const S = DUST.SPAWN;
  const V = DUST.VELOCITY;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = S.X_MIN + Math.random() * S.X_RANGE;
    positions[i * 3 + 1] = S.Y_MIN + Math.random() * S.Y_RANGE;
    positions[i * 3 + 2] = S.Z_MIN + Math.random() * S.Z_RANGE;
    velocities.push({
      vx: (Math.random() - V.X_BIAS) * V.X_SCALE,
      vy: (Math.random() - 0.5) * V.Y_SCALE,
      vz: (Math.random() - 0.5) * V.Z_SCALE
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: DUST.COLOR,
    size: DUST.SIZE,
    transparent: true,
    opacity: DUST.OPACITY,
    depthWrite: false
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return { points, velocities };
}

export function updateDust(dust, dt) {
  if (!dust || !dust.points) return;
  const posAttr = dust.points.geometry.attributes.position;
  const arr = posAttr.array;
  const W = DUST.WRAP;

  for (let i = 0; i < dust.velocities.length; i++) {
    const v = dust.velocities[i];
    arr[i * 3] += v.vx * dt;
    arr[i * 3 + 1] += v.vy * dt;
    arr[i * 3 + 2] += v.vz * dt;

    if (arr[i * 3] > W.X_MAX) arr[i * 3] = W.X_MAX_RESET;
    if (arr[i * 3] < W.X_MIN) arr[i * 3] = W.X_MIN_RESET;
    if (arr[i * 3 + 1] > W.Y_MAX) arr[i * 3 + 1] = W.Y_MAX_RESET;
    if (arr[i * 3 + 1] < W.Y_MIN) arr[i * 3 + 1] = W.Y_MIN_RESET;
    if (arr[i * 3 + 2] > W.Z_MAX) arr[i * 3 + 2] = W.Z_MAX_RESET;
    if (arr[i * 3 + 2] < W.Z_MIN) arr[i * 3 + 2] = W.Z_MIN_RESET;
  }
  posAttr.needsUpdate = true;
}
