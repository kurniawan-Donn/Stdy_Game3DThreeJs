// Overlay debug khusus developer (tombol F3, default mati; bukan fitur game).
// Menampilkan lingkaran radius noise di lantai, jangkauan interaksi di sekitar
// kucing, dan panel teks status gerak/stamina/meong.
import * as THREE from 'three';
import { DEBUG, INTERACT, NOISE, PLAYER, STAMINA, MEOW } from '../config.js';
import { isExhausted } from '../systems/stamina.js';
import { recentMeowCount, isAnnoying } from '../systems/meow.js';
import { comboTimeLeft } from '../systems/chaos.js';
import { remainingMischief } from '../entities/mischief/index.js';

const RING_Y = 0.03;

export function createDebugOverlay(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Ring satuan (radius 1) yang di-scale sesuai radius
  const ringGeo = new THREE.RingGeometry(0.96, 1, 48);
  ringGeo.rotateX(-Math.PI / 2);

  const interactRing = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: DEBUG.INTERACT_RING_COLOR,
      transparent: true,
      opacity: DEBUG.INTERACT_RING_OPACITY,
      depthWrite: false,
      fog: false
    })
  );
  interactRing.scale.setScalar(INTERACT.RADIUS);
  group.add(interactRing);

  const overlay = {
    enabled: DEBUG.ENABLED_AT_START,
    group,
    ringGeo,
    interactRing,
    noiseRings: [],
    panel: document.getElementById('debug-panel')
  };
  applyEnabled(overlay);
  return overlay;
}

function applyEnabled(overlay) {
  overlay.group.visible = overlay.enabled;
  overlay.panel.classList.toggle('active', overlay.enabled);
}

function getNoiseRing(overlay, i) {
  while (overlay.noiseRings.length <= i) {
    const mesh = new THREE.Mesh(
      overlay.ringGeo,
      new THREE.MeshBasicMaterial({
        color: DEBUG.NOISE_RING_COLOR,
        transparent: true,
        opacity: DEBUG.NOISE_RING_OPACITY,
        depthWrite: false,
        fog: false
      })
    );
    overlay.group.add(mesh);
    overlay.noiseRings.push(mesh);
  }
  return overlay.noiseRings[i];
}

export function updateDebugOverlay(ctx) {
  const overlay = ctx.debug;
  if (ctx.input.pressed[DEBUG.TOGGLE_KEY]) {
    overlay.enabled = !overlay.enabled;
    applyEnabled(overlay);
  }
  if (!overlay.enabled) return;

  const { cat, noise, stamina, meow, interaction } = ctx;
  const p = cat.mesh.position;
  overlay.interactRing.position.set(p.x, p.y + RING_Y, p.z);

  // Lingkaran noise yang memudar
  const events = noise.events;
  for (let i = 0; i < Math.max(events.length, overlay.noiseRings.length); i++) {
    const ring = getNoiseRing(overlay, i);
    const ev = events[i];
    if (!ev) {
      ring.visible = false;
      continue;
    }
    ring.visible = true;
    ring.position.set(ev.x, RING_Y, ev.z);
    ring.scale.setScalar(ev.radius);
    ring.material.opacity = DEBUG.NOISE_RING_OPACITY * (1 - ev.age / NOISE.EVENT_LIFETIME);
  }

  const speed = Math.hypot(cat.vel.x, cat.vel.z);
  const lastNoise = events.length ? events[events.length - 1] : null;
  overlay.panel.textContent = [
    'DEBUG (F3)',
    `mode      : ${cat.moveMode}${cat.isGrounded ? '' : ' (udara)'}`,
    `kecepatan : ${speed.toFixed(2)} m/s`,
    `profil    : ${cat.profile.toFixed(2)} (normal ${PLAYER.NORMAL_PROFILE})`,
    `stamina   : ${stamina.value.toFixed(1)} / ${STAMINA.MAX}${isExhausted(stamina) ? '  TERENGAH ' + stamina.exhaustedTimer.toFixed(1) + 's' : ''}`,
    `meong     : cooldown ${meow.cooldown.toFixed(1)}s, ${recentMeowCount(meow)}x/${MEOW.ANNOY_WINDOW}s${isAnnoying(meow) ? ' JENGKEL' : ''}`,
    `noise     : ${events.length} aktif${lastNoise ? `, terakhir ${lastNoise.source} r=${lastNoise.radius}m` : ''}`,
    `interaksi : ${interaction.items.length} objek, ${interaction.current ? interaction.current.label : '-'}`,
    `chaos     : ${ctx.state.chaos}, kenakalan tersisa ${remainingMischief(ctx)}, combo ${comboTimeLeft(ctx).toFixed(1)}s`,
    `aksi      : ${cat.action ? cat.action.type + ' ' + cat.action.t.toFixed(2) + 's' : '-'}`,
    `fisika    : ${ctx.physics.bodies.length} benda, waktu ${ctx.state.timeLeft.toFixed(1)}s`
  ].join('\n');
}
