// Partikel kubus kecil yang memercik saat koin diambil.
import * as THREE from 'three';
import { COIN_PARTICLES as P, PHYSICS } from '../config.js';

export function createParticleSystem() {
  return {
    geo: new THREE.BoxGeometry(P.SIZE, P.SIZE, P.SIZE),
    mat: new THREE.MeshBasicMaterial({ color: P.COLOR }),
    list: []
  };
}

export function spawnCoinParticles(sys, scene, pos) {
  for (let i = 0; i < P.COUNT; i++) {
    const mesh = new THREE.Mesh(sys.geo, sys.mat);
    mesh.position.copy(pos);
    scene.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = P.SPEED_MIN + Math.random() * P.SPEED_RANGE;
    sys.list.push({
      mesh,
      vel: new THREE.Vector3(
        Math.cos(angle) * speed,
        P.UP_MIN + Math.random() * P.UP_RANGE,
        Math.sin(angle) * speed
      ),
      life: P.LIFE,
      maxLife: P.LIFE
    });
  }
}

export function updateParticles(sys, scene, dt) {
  const particles = sys.list;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }
    p.vel.y += PHYSICS.GRAVITY * P.GRAVITY_SCALE * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += P.SPIN_SPEED * dt;
    p.mesh.rotation.y += P.SPIN_SPEED * dt;
    p.mesh.scale.setScalar(Math.max(p.life / p.maxLife, P.MIN_SCALE));
  }
}

export function clearParticles(sys, scene) {
  for (const p of sys.list) {
    scene.remove(p.mesh);
  }
  sys.list.length = 0;
}
