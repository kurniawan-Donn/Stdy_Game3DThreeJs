// Suasana Minggu pagi (Level Bonus): jendela terbuka dengan tirai tipis
// berkibar, tirai kamar tidur ditarik ke samping, speaker kecil di rak TV
// yang memutar musik santai (core/audio.js → music). Aktif di level dengan
// blok CLEANING; objeknya dibuang & tirai dipulihkan saat ganti level.
import * as THREE from 'three';
import { SUNDAY_FX as F, MUSIC } from '../config.js';
import { currentLevel } from '../core/state.js';
import { removeAndDispose } from '../core/dispose.js';

function restoreCurtains(ctx) {
  for (const w of ctx.windows || []) {
    if (!w.curtainMesh) continue;
    w.curtainMesh.scale.x = 1;
    w.curtainMesh.position.copy(w.curtainHome);
  }
}

function buildSpeaker() {
  const S = MUSIC.SPEAKER;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(S.W, S.H, S.D), new THREE.MeshStandardMaterial({ color: S.COLOR, roughness: 0.6 }));
  body.position.y = S.H / 2;
  body.castShadow = true;
  g.add(body);
  const grillMat = new THREE.MeshStandardMaterial({ color: S.GRILL, roughness: 0.9 });
  for (const [y, r] of [[S.H * 0.62, S.W * 0.32], [S.H * 0.25, S.W * 0.2]]) {
    const grill = new THREE.Mesh(new THREE.CircleGeometry(r, 16), grillMat);
    grill.position.set(0, y, S.D / 2 + 0.001);
    g.add(grill);
  }
  const ledMat = new THREE.MeshBasicMaterial({ color: S.LED });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), ledMat);
  led.position.set(S.W * 0.35, S.H * 0.92, S.D / 2);
  g.add(led);
  return { g, led };
}

export function resetSunday(ctx) {
  if (ctx.sunday) removeAndDispose(ctx.sunday.group);
  restoreCurtains(ctx);
  ctx.sunday = null;
  const C = currentLevel(ctx.state).CLEANING;
  if (!C) return;
  const group = new THREE.Group();
  ctx.scene.add(group);

  // Speaker musik
  const { g: speaker, led } = buildSpeaker();
  speaker.position.set(C.SPEAKER.x, C.SPEAKER.y, C.SPEAKER.z);
  speaker.rotation.y = C.SPEAKER.yaw || 0;
  group.add(speaker);

  // Tirai tipis di jendela terbuka (dua panel tiap jendela, berkibar dari atas)
  const sheerMat = new THREE.MeshStandardMaterial({ color: F.SHEER_COLOR, transparent: true, opacity: F.SHEER_OPACITY, side: THREE.DoubleSide, depthWrite: false });
  const sheers = [];
  for (const w of ctx.windows || []) {
    if (w.type === 'curtain') {
      // Tirai kamar tidur ditarik ke samping: kamar tidur terang
      if (w.curtainMesh) {
        w.curtainMesh.scale.x = F.OPEN_CURTAIN_SCALE;
        const shift = (w.len / 2) * (1 - F.OPEN_CURTAIN_SCALE);
        if (w.axis === 'z') w.curtainMesh.position.z += shift;
        else w.curtainMesh.position.x += shift;
      }
      continue;
    }
    const pw = w.len * 0.32;
    const ph = w.h + 0.25;
    const geo = new THREE.PlaneGeometry(pw, ph);
    geo.translate(0, -ph / 2, 0); // pivot di tepi atas
    const [cx, cy, cz] = w.center;
    const inX = w.axis === 'z' ? -w.outward[0] : 0;
    const inZ = w.axis === 'x' ? -w.outward[2] : 0;
    for (const side of [-1, 1]) {
      const along = side * (w.len / 2 - pw / 2);
      const pivot = new THREE.Group();
      pivot.position.set(cx + inX * 0.14 + (w.axis === 'x' ? along : 0), cy + w.h / 2 + 0.12, cz + inZ * 0.14 + (w.axis === 'z' ? along : 0));
      pivot.rotation.y = w.faceIn;
      const panel = new THREE.Mesh(geo, sheerMat);
      panel.renderOrder = 1;
      pivot.add(panel);
      group.add(pivot);
      sheers.push({ pivot, phase: Math.random() * Math.PI * 2 });
    }
  }
  ctx.sunday = { group, speaker, led, sheers, clock: 0 };
}

export function updateSunday(ctx, dt) {
  const s = ctx.sunday;
  if (!s) return;
  s.clock += dt;
  for (const sh of s.sheers) {
    // Angin pagi: tirai mengayun ke dalam rumah
    sh.pivot.children[0].rotation.x = -Math.abs(Math.sin(s.clock * F.SWAY_FREQ + sh.phase)) * F.SWAY_AMP - 0.03;
  }
  s.led.visible = Math.sin(s.clock * (MUSIC.BPM / 60) * Math.PI * 2) > -0.2;
}

// Volume musik di posisi kucing (sedikit lebih keras di dekat speaker)
export function musicLevelAt(ctx) {
  const s = ctx.sunday;
  if (!s) return 0;
  const p = ctx.cat.mesh.position;
  const sp = s.speaker.position;
  const d = Math.hypot(p.x - sp.x, p.z - sp.z);
  const k = Math.max(0, Math.min(1, (MUSIC.FAR_DIST - d) / (MUSIC.FAR_DIST - MUSIC.NEAR_DIST)));
  return MUSIC.BASE_LEVEL + (MUSIC.NEAR_LEVEL - MUSIC.BASE_LEVEL) * k;
}
