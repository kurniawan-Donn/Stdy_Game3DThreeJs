// Remote: kucing menginjak remote di sofa → TV menyala dengan layar statis
// berwarna dan tetap menyala. Noise dipancarkan dari TV.
import * as THREE from 'three';
import { REMOTE, CAT_ANIM, MATERIALS } from '../../config.js';
import { startCatAction, yawTowards } from '../cat.js';
import { scoreMischief } from '../../systems/chaos.js';
import { registerMischief, smoothstep } from './common.js';

function stompPose(p, t) {
  const A = CAT_ANIM;
  const hit = REMOTE.STOMP_AT;
  const k = t < hit ? smoothstep(t / hit) : Math.max(0, 1 - (t - hit) / (REMOTE.ACTION_DURATION - hit));
  p.legFL.rotation.x = -A.STOMP_REACH * k;
  p.legFR.rotation.x = -A.STOMP_REACH * k;
  p.bodyPivot.position.y += A.STOMP_HOP * Math.sin(Math.PI * Math.min(1, t / hit));
}

// Gambar layar statis: balok warna + bintik noise
function drawStatic(canvas) {
  const g = canvas.getContext('2d');
  const size = canvas.width;
  const colors = REMOTE.TV_BAR_COLORS;
  const barW = size / colors.length;
  for (let i = 0; i < colors.length; i++) {
    g.fillStyle = colors[i];
    g.fillRect(i * barW, 0, barW + 1, size);
  }
  for (let i = 0; i < size * 4; i++) {
    const v = Math.floor(Math.random() * 255);
    g.fillStyle = `rgba(${v},${v},${v},0.55)`;
    g.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
}

export function createRemote(ctx, spec) {
  const remote = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.05, 0.09),
    new THREE.MeshStandardMaterial({ ...MATERIALS.remote })
  );
  body.castShadow = true;
  remote.add(body);
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.03),
    new THREE.MeshStandardMaterial({ ...MATERIALS.remoteButton })
  );
  button.position.set(0.08, 0.03, 0);
  remote.add(button);
  remote.position.set(spec.x, spec.y + 0.025, spec.z);
  remote.rotation.y = 0.4;
  ctx.mischief.group.add(remote);

  const tvScreen = ctx.furnitureRefs.tvScreen;
  const originalMaterial = tvScreen.material;
  const inst = { type: 'remote', tvOn: false, refreshT: 0, canvas: null, texture: null };

  function turnTvOn() {
    const canvas = document.createElement('canvas');
    canvas.width = REMOTE.TV_TEXTURE_SIZE;
    canvas.height = REMOTE.TV_TEXTURE_SIZE;
    drawStatic(canvas);
    const texture = new THREE.CanvasTexture(canvas);
    tvScreen.material = new THREE.MeshStandardMaterial({
      ...MATERIALS.tvOn,
      map: texture,
      emissive: 0xffffff,
      emissiveMap: texture
    });
    inst.canvas = canvas;
    inst.texture = texture;
    inst.tvOn = true;

    // Remote tergencet
    button.visible = false;
    remote.rotation.z = 0.15;

    const tv = REMOTE.TV_NOISE_POSITION;
    const tvPos = new THREE.Vector3(tv.x, 0, tv.z);
    ctx.audio.play('tvOn');
    scoreMischief(ctx, 'remote', remote.position, tvPos);
  }

  registerMischief(ctx, inst, {
    label: 'Injak remote',
    position: remote.position,
    surfaceY: spec.y,
    markerHeight: 0.3,
    onInteract: (c) => {
      inst.done = true;
      startCatAction(c.cat, {
        type: 'stomp',
        duration: REMOTE.ACTION_DURATION,
        faceYaw: yawTowards(c.cat, remote.position.x, remote.position.z),
        pose: stompPose,
        events: [{ at: REMOTE.STOMP_AT, fn: turnTvOn }]
      });
    }
  });

  inst.update = (c, dt) => {
    if (!inst.tvOn) return;
    inst.refreshT += dt;
    if (inst.refreshT >= 1 / REMOTE.TV_REFRESH_RATE) {
      inst.refreshT = 0;
      drawStatic(inst.canvas);
      inst.texture.needsUpdate = true;
    }
  };

  inst.dispose = () => {
    if (inst.tvOn) {
      tvScreen.material.dispose();
      inst.texture.dispose();
      tvScreen.material = originalMaterial;
    }
    if (remote.parent) remote.parent.remove(remote);
  };

  return inst;
}
