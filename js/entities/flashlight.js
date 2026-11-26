// Senter pemilik (Level 4): SpotLight + kerucut cahaya semi-transparan +
// senter di tangan kanan. Menyala saat pemilik terjaga di malam hari.
// Mata kucing berkilau saat terkena sorotan (ctx.flashlight.glint), yang
// sedikit menaikkan curiga (owner/index.js). Aturan pandang senter ada di
// systems/perception.js. Hanya dibuat di level yang punya blok NIGHT.
import * as THREE from 'three';
import { NIGHT_FX } from '../config.js';
import { removeAndDispose } from '../core/dispose.js';
import { hasLineOfSight } from '../systems/perception.js';
import { hideSpotOf } from '../systems/hiding.js';
import { nightConfig } from '../systems/night.js';

const tmpDir = new THREE.Vector3();
const tmpHead = new THREE.Vector3();

export function resetFlashlight(ctx) {
  const prev = ctx.flashlight;
  if (prev) {
    ctx.scene.remove(prev.spot, prev.spot.target);
    if (prev.spot.shadow && prev.spot.shadow.map) prev.spot.shadow.map.dispose();
    removeAndDispose(prev.beam);
    removeAndDispose(prev.prop);
    setEyeGlint(ctx, false);
  }
  const N = nightConfig(ctx);
  if (!N) {
    ctx.flashlight = null;
    return;
  }
  const F = NIGHT_FX.FLASHLIGHT;
  const half = THREE.MathUtils.degToRad(N.FLASHLIGHT.ANGLE_DEG / 2);
  const spot = new THREE.SpotLight(F.COLOR, 0, N.FLASHLIGHT.RANGE + 1, half, F.PENUMBRA, F.DECAY);
  spot.shadow.mapSize.set(F.SHADOW_MAP, F.SHADOW_MAP);
  spot.shadow.camera.near = 0.1;
  ctx.scene.add(spot, spot.target);

  // Kerucut cahaya: puncak di senter, terbuka ke depan (+Z lokal)
  const radius = Math.tan(half) * F.BEAM_LENGTH;
  const geo = new THREE.ConeGeometry(radius, F.BEAM_LENGTH, 24, 1, true);
  geo.translate(0, -F.BEAM_LENGTH / 2, 0);
  geo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: F.COLOR, transparent: true, opacity: F.BEAM_OPACITY, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  }));
  beam.visible = false;
  ctx.scene.add(beam);

  // Senter di tangan kanan
  const prop = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 10), new THREE.MeshStandardMaterial({ color: F.BODY_COLOR, roughness: 0.5 }));
  body.rotation.x = Math.PI / 2;
  prop.add(body);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), new THREE.MeshBasicMaterial({ color: F.LENS_COLOR }));
  lens.position.z = 0.081;
  prop.add(lens);
  prop.position.set(0, -0.08, 0.06);
  prop.visible = false;
  ctx.owner.parts.armR.hand.add(prop);

  ctx.flashlight = { spot, beam, prop, half, range: N.FLASHLIGHT.RANGE, glint: false, pos: new THREE.Vector3(), dir: new THREE.Vector3() };
}

function setEyeGlint(ctx, on) {
  const m = ctx.cat && ctx.cat.parts && ctx.cat.parts.eyeMat;
  if (!m) return;
  const G = NIGHT_FX.EYE_GLINT;
  m.emissive.setHex(on ? G.COLOR : 0x000000);
  m.emissiveIntensity = on ? G.INTENSITY : 1;
}

export function updateFlashlight(ctx) {
  const fl = ctx.flashlight;
  if (!fl) return;
  const o = ctx.owner;
  const F = NIGHT_FX.FLASHLIGHT;
  const on = !!o.flashlightOn && !o.asleep;
  fl.spot.intensity = on ? F.INTENSITY : 0;
  fl.beam.visible = on;
  fl.prop.visible = on;
  fl.glint = false;
  if (!on) {
    setEyeGlint(ctx, false);
    return;
  }
  // Posisi & arah sorotan: dari tangan, ke arah pandang pemilik, sedikit menunduk
  const yaw = o.lookYaw !== undefined ? o.lookYaw : o.yaw;
  const p = o.mesh.position;
  fl.dir.set(Math.sin(yaw) * Math.cos(F.PITCH), Math.sin(F.PITCH), Math.cos(yaw) * Math.cos(F.PITCH));
  fl.pos.set(p.x + Math.sin(yaw) * F.FORWARD, F.HAND_HEIGHT, p.z + Math.cos(yaw) * F.FORWARD);
  fl.spot.position.copy(fl.pos);
  fl.spot.target.position.copy(fl.pos).addScaledVector(fl.dir, 5);
  fl.spot.target.updateMatrixWorld();
  fl.beam.position.copy(fl.pos);
  fl.beam.lookAt(fl.spot.target.position);

  // Kilau mata: kepala kucing di sorotan, tidak terhalang, kucing menghadap pemilik
  const cat = ctx.cat;
  const N = nightConfig(ctx);
  const c = cat.mesh.position;
  tmpHead.set(c.x, c.y + 0.27, c.z);
  tmpDir.subVectors(tmpHead, fl.pos);
  const dist = tmpDir.length();
  let glint = false;
  if (dist <= fl.range && !cat.inBox && !hideSpotOf(cat) && cat.mesh.visible) {
    const ang = tmpDir.angleTo(fl.dir);
    if (ang <= fl.half) {
      const toOwnerYaw = Math.atan2(p.x - c.x, p.z - c.z);
      let d = toOwnerYaw - cat.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) <= THREE.MathUtils.degToRad(N.GLINT.FACING_DEG / 2)) {
        glint = hasLineOfSight(ctx.colliders, fl.pos, tmpHead, null);
      }
    }
  }
  fl.glint = glint;
  setEyeGlint(ctx, glint);
}
