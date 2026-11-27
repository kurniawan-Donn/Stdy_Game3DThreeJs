// Malam (Level 4 "Malam Hari"). Aturan dari file level (NIGHT):
// - Meter TERBANGUN: suara yang "sampai ke kamar" (jarak ≤ HEAR_MULT ×
//   radius) mengisi meter = GAIN × radius × (1 − jarak / (HEAR_MULT × radius))
//   × pengali; meter turun DECAY/detik. Tiap kali pemilik terbangun, pengali
//   ×SPEEDUP. Siklus tidur/bangun pemilik ada di owner/index.js.
// - Ikon HUD "Zzz" memudar menjadi mata terbuka.
// - Suara malam: detak jam & jangkrik samar.
// - Matahari terbit di akhir level (cahaya hangat bertahap), lalu layar hasil.
// - Maksimal satu lampu berbayangan: senter (kualitas Tinggi) atau bulan (Sedang).
// Hanya aktif di level yang punya blok NIGHT.
import { effectiveQuality } from '../core/settings.js';
import * as THREE from 'three';
import { NIGHT_FX as F, SETTINGS, LIGHT_ZONES } from '../config.js';
import { removeAndDispose } from '../core/dispose.js';
import { currentLevel } from '../core/state.js';

export function nightConfig(ctx) {
  return currentLevel(ctx.state).NIGHT || null;
}

function rand([a, b]) {
  return a + Math.random() * (b - a);
}

export function resetNight(ctx) {
  const N = nightConfig(ctx);
  if (ctx.night && ctx.night.fridgeLight) {
    ctx.scene.remove(ctx.night.fridgeLight);
    ctx.night.fridgeLight.dispose && ctx.night.fridgeLight.dispose();
  }
  if (ctx.night && ctx.night.moonPatches) removeAndDispose(ctx.night.moonPatches);
  if (ctx.hud.setWake) ctx.hud.setWake(null);
  // Bayangan bulan/matahari kembali mengikuti pengaturan kualitas
  if (ctx.lights && ctx.lights.sun) {
    const q = SETTINGS.QUALITY[effectiveQuality(ctx)];
    ctx.lights.sun.castShadow = q.shadows;
  }
  if (!N) {
    ctx.night = null;
    return;
  }
  const L = F.FRIDGE_LIGHT;
  const fridgeLight = new THREE.PointLight(L.COLOR, 0, L.DISTANCE, L.DECAY);
  fridgeLight.position.set(...L.POSITION);
  fridgeLight.castShadow = false;
  ctx.scene.add(fridgeLight);
  const moonPatches = createMoonPatches();
  ctx.scene.add(moonPatches);
  ctx.night = {
    N,
    wake: 0,
    mult: 1,
    wakeCount: 0,
    lastNoise: null, // titik suara terakhir yang mengisi meter
    snackDone: false,
    dawn: null, // { t } saat matahari terbit
    dawnDone: false,
    tickT: F.CLOCK_TICK_INTERVAL,
    cricketT: rand(F.CRICKET_INTERVAL),
    fridgeLight,
    moonPatches,
    base: ctx.lights ? { sunColor: ctx.lights.sun.color.getHex(), sun: ctx.lights.sun.intensity, hemi: ctx.lights.hemi.intensity } : null
  };
}

// Berkas cahaya bulan di lantai: satu tambalan bercahaya lembut per zona
// terang (LIGHT_ZONES), dengan bayang-bayang palang jendela
function createMoonPatches() {
  const P = F.MOON_PATCH;
  const group = new THREE.Group();
  let map = null;
  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      canvas.width = canvas.height = P.TEXTURE_SIZE;
      const g = canvas.getContext('2d');
      const S = P.TEXTURE_SIZE;
      const e = S * P.SOFT_EDGE;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const d = Math.min(x, y, S - 1 - x, S - 1 - y);
          let a = Math.min(1, d / e);
          // palang jendela (silang) membayang di berkas cahaya
          const m = S * P.MULLION_SHADOW / 2;
          if (Math.abs(x - S / 2) < m || Math.abs(y - S / 2) < m) a *= 0.35;
          g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
          g.fillRect(x, y, 1, 1);
        }
      }
      map = new THREE.CanvasTexture(canvas);
    }
  }
  for (const z of LIGHT_ZONES) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(z.width, z.depth),
      new THREE.MeshBasicMaterial({ color: P.COLOR, map, transparent: true, opacity: P.OPACITY, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(z.x, P.LIFT, z.z);
    group.add(m);
  }
  return group;
}

// Isi meter terbangun dari suara ev (pemilik di `ownerPos`). Dipanggil
// owner/index.js saat pemilik tidur. Mengembalikan isi yang ditambahkan.
export function wakeFromNoise(ctx, ev, ownerPos) {
  const n = ctx.night;
  if (!n) return 0;
  const W = n.N.WAKE;
  const reach = W.HEAR_MULT * ev.radius;
  const d = Math.hypot(ev.x - ownerPos.x, ev.z - ownerPos.z);
  if (reach <= 0 || d > reach) return 0;
  const gain = W.GAIN * ev.radius * (1 - d / reach) * n.mult;
  n.wake = Math.min(W.MAX, n.wake + gain);
  if (n.wake >= W.MAX) n.full = true;
  n.lastNoise = { x: ev.x, z: ev.z };
  return gain;
}

// Isi langsung (mis. kneading di atas pemilik)
export function addWake(ctx, amount, point) {
  const n = ctx.night;
  if (!n) return;
  n.wake = Math.min(n.N.WAKE.MAX, n.wake + amount * n.mult);
  if (n.wake >= n.N.WAKE.MAX) n.full = true;
  if (point) n.lastNoise = { x: point.x, z: point.z };
}

// Penanda "penuh" bertahan sampai pemilik bangun (meter bisa sudah meluruh
// sedikit di frame yang sama, mis. suara dari benda jatuh setelah update pemilik)
export function isWakeFull(ctx) {
  return !!ctx.night && (ctx.night.full || ctx.night.wake >= ctx.night.N.WAKE.MAX);
}

// Pemilik baru terbangun: meter berikutnya terisi lebih cepat
export function onOwnerWoke(ctx) {
  const n = ctx.night;
  n.full = false;
  n.wakeCount++;
  n.mult *= n.N.WAKE.SPEEDUP;
}

export function onOwnerSleep(ctx) {
  ctx.night.wake = 0;
  ctx.night.full = false;
}

// Waktu habis: mulai matahari terbit (level.js menunggu dawnDone)
export function startDawn(ctx) {
  if (ctx.night && !ctx.night.dawn) ctx.night.dawn = { t: 0 };
}

export function updateNight(ctx, dt) {
  const n = ctx.night;
  if (!n) return;
  const o = ctx.owner;

  // Meter turun perlahan saat pemilik tidur
  if (o.asleep && !n.full) n.wake = Math.max(0, n.wake - n.N.WAKE.DECAY * dt);

  // Suara malam
  n.tickT -= dt;
  if (n.tickT <= 0) {
    n.tickT += F.CLOCK_TICK_INTERVAL;
    ctx.audio.play('clockTick');
  }
  n.cricketT -= dt;
  if (n.cricketT <= 0) {
    n.cricketT = rand(F.CRICKET_INTERVAL);
    ctx.audio.play('cricket');
  }

  // Lampu kulkas saat camilan
  n.fridgeLight.intensity = o.activity === 'snack' && o.phase === 'do' ? F.FRIDGE_LIGHT.INTENSITY : 0;

  // Matahari terbit: bulan biru → matahari pagi hangat (debu berkilau muncul)
  if (n.dawn && ctx.dust && ctx.dust.points) ctx.dust.points.visible = true;
  if (n.dawn && n.base && ctx.lights) {
    n.dawn.t += dt;
    const k = Math.min(1, n.dawn.t / n.N.DAWN_DURATION);
    const e = k * k * (3 - 2 * k);
    const c0 = new THREE.Color(n.base.sunColor);
    ctx.lights.sun.color.copy(c0.lerp(new THREE.Color(F.DAWN.SUN_COLOR), e));
    ctx.lights.sun.intensity = n.base.sun + (F.DAWN.SUN_INTENSITY - n.base.sun) * e;
    ctx.lights.hemi.intensity = n.base.hemi + (F.DAWN.HEMI_INTENSITY - n.base.hemi) * e;
    if (k >= 1) n.dawnDone = true;
  }

  // Satu lampu berbayangan: Tinggi = senter, Sedang = bulan, Rendah = tidak ada
  // (saat matahari terbit senter mati, jadi matahari yang berbayangan)
  const quality = effectiveQuality(ctx);
  const dawn = !!n.dawn;
  if (ctx.lights) ctx.lights.sun.castShadow = dawn ? quality !== 'low' : quality === 'medium';
  if (ctx.flashlight) ctx.flashlight.spot.castShadow = !dawn && quality === 'high';

  // HUD: Zzz (tidur) memudar menjadi mata terbuka (terjaga)
  if (ctx.hud.setWake) {
    const frac = o.asleep ? n.wake / n.N.WAKE.MAX : 1;
    ctx.hud.setWake(Math.round(frac * F.WAKE_ICON_STEPS) / F.WAKE_ICON_STEPS);
  }
}
