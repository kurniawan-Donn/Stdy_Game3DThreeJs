// Helper bersama untuk objek kenakalan: pendaftaran interaksi, pose kucing,
// dan partikel serpihan berfisika.
import * as THREE from 'three';
import { registerInteractable } from '../../systems/interaction.js';
import { addBody } from '../../systems/physics.js';
import { CAT_ANIM, BODY_PHYSICS } from '../../config.js';

// Mendaftarkan objek kenakalan sebagai interaktif. Objek otomatis nonaktif
// begitu inst.done = true (tiap kenakalan hanya sekali per level).
export function registerMischief(ctx, inst, item) {
  inst.done = false;
  inst.unregister = registerInteractable(ctx.interaction, {
    ...item,
    isEnabled: (c) => !inst.done && (item.isEnabled ? item.isEnabled(c) : true)
  });
}

// Arah horizontal ternormalisasi dari kucing ke titik p.
export function dirFromCat(ctx, p) {
  const c = ctx.cat.mesh.position;
  const d = new THREE.Vector3(p.x - c.x, 0, p.z - c.z);
  if (d.lengthSq() < 1e-6) d.set(0, 0, 1);
  return d.normalize();
}

export function smoothstep(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

// Pose: satu kaki depan menyapu/menepuk objek, puncaknya di hitAt.
export function swipePose(hitAt) {
  const A = CAT_ANIM;
  return (p, t) => {
    const k = t < hitAt ? smoothstep(t / hitAt) : Math.max(0, 1 - (t - hitAt) / A.SWIPE_RETRACT);
    p.legFR.rotation.x = -A.SWIPE_REACH * k;
    p.bodyPivot.rotation.x = A.SWIPE_LEAN * k;
  };
}

// Serpihan kecil berfisika yang memudar (kain, tanah, dll.).
export function spawnDebris(ctx, {
  position, count, size, material, life, fade, speedMin, speedRange, upMin, upRange, spin,
  restitution = BODY_PHYSICS.DEBRIS_RESTITUTION, friction = BODY_PHYSICS.DEBRIS_FRICTION
}) {
  const geo = new THREE.BoxGeometry(size, size, size);
  for (let i = 0; i < count; i++) {
    const mat = material.clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * speedRange;
    const body = addBody(ctx, {
      mesh,
      material: mat,
      radius: size,
      bottomOffset: size / 2,
      restitution,
      friction,
      life: life + fade,
      fade
    });
    body.vel.set(Math.cos(angle) * speed, upMin + Math.random() * upRange, Math.sin(angle) * speed);
    body.angVel.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin);
  }
}
