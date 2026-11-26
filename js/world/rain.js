// Visual hujan (Level 3): garis hujan di luar jendela (satu InstancedMesh),
// tetesan mengalir di kaca (kanvas prosedural beranimasi), genangan bocor
// dengan riak, dan ember (muncul setelah pemilik menutup jendela).
import * as THREE from 'three';
import { RAIN_FX as F } from '../config.js';
import { removeAndDispose } from '../core/dispose.js';

const tmpObj = new THREE.Object3D();

function rand(a, b) {
  return a + Math.random() * (b - a);
}

// Arah sepanjang jendela (sumbu dinding)
function alongVec(win) {
  return win.axis === 'z' ? [0, 0, 1] : [1, 0, 0];
}

export function createRain(ctx, W) {
  const group = new THREE.Group();
  ctx.scene.add(group);
  const windows = (ctx.windows || []).filter((w) => w.type !== 'curtain');

  // --- Garis hujan ---
  const n = F.STREAKS_PER_WINDOW * windows.length;
  const streakGeo = new THREE.PlaneGeometry(F.STREAK_WIDTH, F.STREAK_LENGTH);
  const streakMat = new THREE.MeshBasicMaterial({ color: F.COLOR, transparent: true, opacity: F.OPACITY, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const streaks = new THREE.InstancedMesh(streakGeo, streakMat, Math.max(1, n));
  streaks.count = n;
  streaks.frustumCulled = false;
  // Digambar sebelum kaca jendela (kaca transparan menulis depth; tanpa ini
  // hujan di belakang kaca gagal uji kedalaman)
  streaks.renderOrder = -1;
  group.add(streaks);
  const drops = [];
  windows.forEach((win, wi) => {
    for (let i = 0; i < F.STREAKS_PER_WINDOW; i++) {
      drops.push({
        win: wi,
        u: rand(-win.len / 2 - F.SPAN_PAD, win.len / 2 + F.SPAN_PAD),
        d: rand(F.DEPTH_MIN, F.DEPTH_MAX),
        y: rand(-win.h / 2 - F.HEIGHT_PAD, win.h / 2 + F.HEIGHT_PAD)
      });
    }
  });

  // --- Tetesan di kaca ---
  const D = F.DROPS;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let glass = null;
  if (canvas && canvas.getContext && canvas.getContext('2d')) {
    canvas.width = D.SIZE;
    canvas.height = D.SIZE;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    const beads = [];
    for (let i = 0; i < D.COUNT; i++) beads.push(newBead(D, true));
    const planes = windows.map((win) => {
      const tex = texture.clone();
      tex.needsUpdate = true;
      tex.repeat.set(win.len / D.TILE_METERS, win.h / D.TILE_METERS);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(win.len, win.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      const inward = win.outward.map((v) => -v);
      m.position.set(win.glassPos[0] + inward[0] * D.OFFSET, win.glassPos[1], win.glassPos[2] + inward[2] * D.OFFSET);
      m.rotation.y = win.faceIn;
      group.add(m);
      return m;
    });
    glass = { canvas, texture, beads, planes, t: 0 };
    drawGlass(glass);
  }

  // --- Genangan & ember ---
  const P = W.PUDDLE;
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshStandardMaterial({ color: F.PUDDLE.COLOR, transparent: true, opacity: F.PUDDLE.OPACITY, roughness: F.PUDDLE.ROUGHNESS, metalness: 0.2, depthWrite: false })
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(P.x, F.PUDDLE.LIFT, P.z);
  puddle.scale.setScalar(P.RADIUS);
  puddle.receiveShadow = true;
  group.add(puddle);
  const ripple = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1, 28),
    new THREE.MeshBasicMaterial({ color: F.PUDDLE.RIPPLE_COLOR, transparent: true, opacity: 0, depthWrite: false })
  );
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.set(P.x, F.PUDDLE.LIFT + 0.001, P.z);
  group.add(ripple);
  const B = F.BUCKET;
  const bucket = new THREE.Group();
  const bucketMat = new THREE.MeshStandardMaterial({ color: B.COLOR, roughness: 0.5, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(B.RADIUS, B.RADIUS * 0.82, B.HEIGHT, 16, 1, true), bucketMat);
  wall.position.y = B.HEIGHT / 2;
  wall.castShadow = true;
  bucket.add(wall);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(B.RADIUS * 0.82, 16), bucketMat);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.01;
  bucket.add(bottom);
  bucket.position.set(P.x, 0, P.z);
  bucket.visible = false;
  group.add(bucket);

  return { group, windows, streaks, drops, glass, puddle, ripple, bucket, rippleT: 0, puddleRadius: P.RADIUS };
}

function newBead(D, anywhere) {
  return {
    x: Math.random() * D.SIZE,
    y: anywhere ? Math.random() * D.SIZE : -5,
    r: rand(D.RADIUS_MIN, D.RADIUS_MAX),
    v: rand(D.SPEED_MIN, D.SPEED_MAX), // piksel/detik
    stop: Math.random() * 1.5 // tetes kadang berhenti sejenak
  };
}

function drawGlass(glass) {
  const D = F.DROPS;
  const g = glass.canvas.getContext('2d');
  g.clearRect(0, 0, D.SIZE, D.SIZE);
  for (const b of glass.beads) {
    g.strokeStyle = D.TRAIL;
    g.lineWidth = b.r * 0.7;
    g.beginPath();
    g.moveTo(b.x, b.y - b.r * 4);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.fillStyle = D.COLOR;
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.fill();
  }
  for (const m of glass.planes) m.material.map.needsUpdate = true;
}

// Ember muncul & genangan mengecil (setelah pemilik menutup jendela)
export function setBucket(rain, radius) {
  rain.bucket.visible = true;
  rain.puddleRadius = radius;
  rain.puddle.scale.setScalar(radius);
}

export function updateRain(rain, dt) {
  // Garis hujan jatuh & berulang dari atas
  const fallDx = Math.sin(F.SLANT);
  for (let i = 0; i < rain.drops.length; i++) {
    const dr = rain.drops[i];
    const win = rain.windows[dr.win];
    dr.y -= F.SPEED * dt;
    dr.u += F.SPEED * dt * fallDx;
    const span = win.len / 2 + F.SPAN_PAD;
    if (dr.u > span) dr.u -= span * 2;
    if (dr.y < -win.h / 2 - F.HEIGHT_PAD) {
      dr.y = win.h / 2 + F.HEIGHT_PAD;
      dr.u = rand(-span, span);
    }
    const a = alongVec(win);
    tmpObj.position.set(
      win.center[0] + a[0] * dr.u + win.outward[0] * dr.d,
      win.center[1] + dr.y,
      win.center[2] + a[2] * dr.u + win.outward[2] * dr.d
    );
    tmpObj.rotation.set(0, win.faceIn, -F.SLANT);
    tmpObj.updateMatrix();
    rain.streaks.setMatrixAt(i, tmpObj.matrix);
  }
  rain.streaks.instanceMatrix.needsUpdate = true;

  // Tetesan di kaca (digambar ulang beberapa kali per detik)
  const gl = rain.glass;
  if (gl) {
    const D = F.DROPS;
    for (const b of gl.beads) {
      if (b.stop > 0) {
        b.stop -= dt;
        continue;
      }
      b.y += b.v * dt;
      if (Math.random() < dt * 0.4) b.stop = Math.random();
      if (b.y - b.r * 4 > D.SIZE) Object.assign(b, newBead(D, false));
    }
    gl.t += dt;
    if (gl.t >= 1 / D.FPS) {
      gl.t = 0;
      drawGlass(gl);
    }
  }

  // Riak tetesan bocor di genangan
  rain.rippleT = (rain.rippleT + dt) % F.PUDDLE.RIPPLE_PERIOD;
  const k = rain.rippleT / F.PUDDLE.RIPPLE_PERIOD;
  rain.ripple.scale.setScalar(rain.puddleRadius * (0.15 + 0.85 * k));
  rain.ripple.material.opacity = 0.5 * (1 - k);
}

export function disposeRain(rain) {
  if (!rain) return;
  if (rain.glass) rain.glass.texture.dispose();
  removeAndDispose(rain.group);
}
