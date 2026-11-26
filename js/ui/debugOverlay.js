// Overlay debug khusus developer (tombol F3, default mati; bukan fitur game).
// Menampilkan lingkaran radius noise di lantai, jangkauan interaksi di sekitar
// kucing, kerucut pandang pemilik, garis line-of-sight (hijau = terlihat,
// merah = terhalang), jalur A* pemilik, dan panel teks status.
// State & meter pemilik di atas kepalanya ditampilkan oleh ui/ownerIndicator.js.
import * as THREE from 'three';
import { DEBUG, INTERACT, NOISE, PLAYER, STAMINA, MEOW, OWNER, HOUSE, DARK_ZONES } from '../config.js';
import { isInDarkZone } from '../world/house.js';
import { isExhausted } from '../systems/stamina.js';
import { recentMeowCount, isAnnoying } from '../systems/meow.js';
import { comboTimeLeft } from '../systems/chaos.js';
import { hideStatus } from '../systems/hiding.js';
import { remainingMischief } from '../entities/mischief/index.js';

const RING_Y = 0.03;

function roomAt(p) {
  for (const [name, r] of Object.entries(HOUSE.rooms)) {
    if (p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ) return name;
  }
  return '-';
}
const CONE_SEGMENTS = 16;
const MAX_PATH_POINTS = 64;

function makeLine(maxPoints, color, segments) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, fog: false, vertexColors: color === null });
  const line = segments ? new THREE.LineSegments(geo, mat) : new THREE.Line(geo, mat);
  line.frustumCulled = false;
  line.renderOrder = 999;
  return line;
}

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

  // Kerucut pandang pemilik (kipas di lantai)
  const cone = makeLine(CONE_SEGMENTS + 3, DEBUG.CONE_COLOR, false);
  group.add(cone);
  // Garis line-of-sight ke titik tubuh kucing (warna per verteks)
  const los = makeLine(16, null, true);
  los.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
  group.add(los);
  // Jalur A* pemilik
  const path = makeLine(MAX_PATH_POINTS + 1, DEBUG.PATH_COLOR, false);
  group.add(path);
  // Batas area gelap di lantai (pita tipis; garis WebGL hanya 1 px)
  const darkMat = new THREE.MeshBasicMaterial({ color: DEBUG.DARK_ZONE_COLOR, transparent: true, opacity: DEBUG.DARK_ZONE_OPACITY, depthTest: false, depthWrite: false, fog: false });
  const darkEdges = new THREE.Group();
  const bw = DEBUG.DARK_ZONE_BORDER;
  for (const z of DARK_ZONES) {
    const x0 = z.x - z.width / 2 + bw / 2, x1 = z.x + z.width / 2 - bw / 2;
    const z0 = z.z - z.depth / 2 + bw / 2, z1 = z.z + z.depth / 2 - bw / 2;
    for (const [cx, cz, w, d] of [[z.x, z0, z.width, bw], [z.x, z1, z.width, bw], [x0, z.z, bw, z.depth], [x1, z.z, bw, z.depth]]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, d), darkMat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(cx, RING_Y, cz);
      strip.renderOrder = 998;
      darkEdges.add(strip);
    }
  }
  darkEdges.name = 'darkZoneBorders';
  group.add(darkEdges);

  const overlay = {
    cone,
    los,
    path,
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

  updateOwnerDebug(ctx, overlay);

  const speed = Math.hypot(cat.vel.x, cat.vel.z);
  const lastNoise = events.length ? events[events.length - 1] : null;
  overlay.panel.textContent = [
    `DEBUG (F3)   FPS ${ctx.fps.toFixed(0)}   mesh statis ${ctx.mergeStats ? ctx.mergeStats.before + '→' + ctx.mergeStats.after : '-'}`,
    `mode      : ${cat.moveMode}${cat.isGrounded ? '' : ' (udara)'}`,
    `kecepatan : ${speed.toFixed(2)} m/s`,
    `profil    : ${cat.profile.toFixed(2)} (normal ${PLAYER.NORMAL_PROFILE})`,
    `stamina   : ${stamina.value.toFixed(1)} / ${STAMINA.MAX}${isExhausted(stamina) ? '  TERENGAH ' + stamina.exhaustedTimer.toFixed(1) + 's' : ''}`,
    `meong     : cooldown ${meow.cooldown.toFixed(1)}s, ${recentMeowCount(meow)}x/${MEOW.ANNOY_WINDOW}s${isAnnoying(meow) ? ' JENGKEL' : ''}`,
    `noise     : ${events.length} aktif${lastNoise ? `, terakhir ${lastNoise.source} r=${lastNoise.radius}m` : ''}`,
    `interaksi : ${interaction.items.length} objek, ${interaction.current ? interaction.current.label : '-'}`,
    `chaos     : ${ctx.state.chaos}, kenakalan tersisa ${remainingMischief(ctx)}, combo ${comboTimeLeft(ctx).toFixed(1)}s`,
    `aksi      : ${cat.action ? cat.action.type + ' ' + cat.action.t.toFixed(2) + 's' : '-'}`,
    `fisika    : ${ctx.physics.bodies.length} benda, waktu ${ctx.state.timeLeft.toFixed(1)}s`,
    `ruangan   : ${roomAt(ctx.cat.mesh.position)}${cat.underCrawl ? ' (di kolong)' : ''}${isInDarkZone(p.x, p.z) ? ' · AREA GELAP' : ''}`,
    `sembunyi  : ${hideDebugText(ctx)}`,
    `kamera    : yaw ${(ctx.camRig.yaw * 57.3).toFixed(0)}° pitch ${(ctx.camRig.pitch * 57.3).toFixed(0)}° lengan ${ctx.camRig.arm.toFixed(2)}/${ctx.camRig.zoom.toFixed(2)} m, pudar ${ctx.cameraFading}${ctx.input.pointerLocked ? ', mouse terkunci' : ''}`
  ].join('\n');
}

const LOS_CLEAR = new THREE.Color(DEBUG.LOS_CLEAR_COLOR);
const LOS_BLOCKED = new THREE.Color(DEBUG.LOS_BLOCKED_COLOR);

function updateOwnerDebug(ctx, overlay) {
  const o = ctx.owner;
  const show = o && !o.away;
  overlay.cone.visible = show;
  overlay.los.visible = show;
  overlay.path.visible = show && !!(o.path && o.path.length);
  if (!show) return;

  // Kerucut pandang: mata → busur sejauh jangkauan efektif → mata
  const range = o.sense ? o.sense.range : OWNER.VISION_RANGE;
  const half = THREE.MathUtils.degToRad(OWNER.VISION_ANGLE_DEG / 2);
  const cp = overlay.cone.geometry.attributes.position;
  const y = RING_Y + 0.01;
  let n = 0;
  cp.setXYZ(n++, o.eye.x, y, o.eye.z);
  for (let i = 0; i <= CONE_SEGMENTS; i++) {
    const a = o.lookYaw - half + (2 * half * i) / CONE_SEGMENTS;
    cp.setXYZ(n++, o.eye.x + Math.sin(a) * range, y, o.eye.z + Math.cos(a) * range);
  }
  cp.setXYZ(n++, o.eye.x, y, o.eye.z);
  cp.needsUpdate = true;
  overlay.cone.geometry.setDrawRange(0, n);
  overlay.cone.material.color.set(o.seen ? DEBUG.CONE_SEEN_COLOR : DEBUG.CONE_COLOR);

  // Line-of-sight
  const lp = overlay.los.geometry.attributes.position;
  const lc = overlay.los.geometry.attributes.color;
  let m = 0;
  for (const ray of (o.sense && o.sense.rays) || []) {
    const col = ray.clear ? LOS_CLEAR : LOS_BLOCKED;
    lp.setXYZ(m, o.eye.x, o.eye.y, o.eye.z);
    lc.setXYZ(m++, col.r, col.g, col.b);
    lp.setXYZ(m, ray.to.x, ray.to.y, ray.to.z);
    lc.setXYZ(m++, col.r, col.g, col.b);
  }
  lp.needsUpdate = true;
  lc.needsUpdate = true;
  overlay.los.geometry.setDrawRange(0, m);

  // Jalur A*
  if (o.path && o.path.length) {
    const pp = overlay.path.geometry.attributes.position;
    let k = 0;
    pp.setXYZ(k++, o.mesh.position.x, y, o.mesh.position.z);
    for (const wp of o.path) {
      if (k > MAX_PATH_POINTS) break;
      pp.setXYZ(k++, wp.x, y, wp.z);
    }
    pp.needsUpdate = true;
    overlay.path.geometry.setDrawRange(0, k);
  }
}

function hideDebugText(ctx) {
  const h = hideStatus(ctx);
  const cat = ctx.cat;
  const names = { box: 'kardus diam', boxMoving: 'kardus BERGERAK', spot: 'kolong', ride: 'menumpang robot', sleep: 'tidur', loaf: 'loaf' };
  const parts = [];
  parts.push(h.kind ? names[h.kind] : '-');
  if (h.compromised) parts.push('TERBONGKAR');
  parts.push(h.hidden ? 'tersembunyi' : 'tidak tersembunyi');
  if (cat.zoomiesT > 0) parts.push(`zoomies ${cat.zoomiesT.toFixed(1)}s`);
  if (cat.idleAnim) parts.push(`idle:${cat.idleAnim.type}`);
  const o = ctx.owner;
  if (o && o.checkingSpot) parts.push('pemilik membungkuk');
  if (o && o.sense && o.sense.ignoredSleep) parts.push('tidur diabaikan');
  return parts.join(', ');
}
