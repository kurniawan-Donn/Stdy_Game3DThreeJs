// Kemoceng (Level Bonus): pemilik meletakkannya di lantai setelah mengelap
// debu, lalu menyapu. Kucing bisa menggigit & menyeretnya (E), lalu
// melepasnya (E). Dilepas ≥ DROP_MIN_DIST dari tempatnya = Chaos.
// Pemilik yang melihat kucing membawa kemoceng = kepergok (owner/index.js).
// State: 'owner' (di tangan pemilik) | 'placed' | 'carried' | 'dropped'.
// Rutinitas pemilik (owner/cleaning.js) memakai place / pickUp / state.
import * as THREE from 'three';
import { DUSTER_PROP as P } from '../../config.js';
import { registerInteractable } from '../../systems/interaction.js';
import { scoreMischief } from '../../systems/chaos.js';
import { emitNoise } from '../../systems/noise.js';
import { createDusterMesh } from '../owner/model.js';
import { removeAndDispose } from '../../core/dispose.js';
import { currentLevel } from '../../core/state.js';

export function createDuster(ctx) {
  const mesh = createDusterMesh();
  mesh.visible = false;
  ctx.mischief.group.add(mesh);

  const inst = {
    type: 'duster',
    mesh,
    state: 'owner',
    home: null, // { x, z } tempat pemilik meletakkannya
    roomIndex: -1,
    scoredHere: false, // sudah mendapat Chaos sejak terakhir diletakkan
    dragT: 0,
    done: false
  };
  const pos = new THREE.Vector3();

  function layOnFloor(x, z, yaw) {
    if (mesh.parent !== ctx.mischief.group) ctx.mischief.group.add(mesh);
    mesh.visible = true;
    mesh.scale.setScalar(1);
    mesh.position.set(x, P.FLOOR_Y, z);
    mesh.rotation.set(0, yaw, Math.PI / 2); // tergeletak
    pos.set(x, 0, z);
  }

  inst.place = (spot, roomIndex) => {
    inst.state = 'placed';
    inst.home = { x: spot.x, z: spot.z };
    inst.roomIndex = roomIndex;
    inst.scoredHere = false;
    layOnFloor(spot.x, spot.z, 0.4);
  };

  inst.pickUp = () => {
    inst.state = 'owner';
    mesh.visible = false;
    if (ctx.cat.carrying === inst) ctx.cat.carrying = null;
  };

  // Dibereskan pemilik (systems/cleaning.js tidyMess): diambil kembali
  inst.onTidy = () => inst.pickUp();
  inst.messPoint = () => ({ x: mesh.position.x, y: 0, z: mesh.position.z });

  function bite(c) {
    inst.state = 'carried';
    inst.startedAt = c.time;
    c.cat.carrying = inst;
    const head = c.cat.parts.headGroup;
    head.add(mesh);
    mesh.position.set(0, P.MOUTH_OFFSET.y, P.MOUTH_OFFSET.z);
    mesh.rotation.set(0, 0, Math.PI / 2);
    mesh.scale.setScalar(P.MOUTH_SCALE);
    c.audio.play('duster');
  }

  // forced = terlepas karena tertangkap / masuk kardus (tanpa Chaos)
  function drop(c, forced = false) {
    const cp = c.cat.mesh.position;
    const yaw = c.cat.yaw;
    c.cat.carrying = null;
    inst.state = 'dropped';
    layOnFloor(cp.x + Math.sin(yaw) * 0.15, cp.z + Math.cos(yaw) * 0.15, yaw);
    c.audio.play('duster');
    const C = currentLevel(c.state).CLEANING;
    const maxRedo = C ? C.MAX_REDO : 0;
    const far = inst.home && Math.hypot(pos.x - inst.home.x, pos.z - inst.home.z) >= P.DROP_MIN_DIST;
    if (!forced && far && !inst.scoredHere && !inst.mess && (inst.tidyCount || 0) <= maxRedo) {
      inst.scoredHere = true;
      inst.messReady = true;
      scoreMischief(c, 'duster', new THREE.Vector3(pos.x, 0.3, pos.z));
    }
  }

  const unregBite = registerInteractable(ctx.interaction, {
    label: 'Gigit kemoceng',
    position: pos,
    surfaceY: 0,
    maxDist: P.BITE_DIST,
    markerHeight: P.MARKER_HEIGHT,
    isEnabled: (c) => (inst.state === 'placed' || inst.state === 'dropped') && !c.cat.carrying,
    onInteract: (c) => bite(c)
  });
  const unregDrop = registerInteractable(ctx.interaction, {
    label: 'Lepas kemoceng',
    position: pos,
    markerHeight: P.MARKER_HEIGHT,
    track: (c) => pos.copy(c.cat.mesh.position),
    isEnabled: (c) => inst.state === 'carried' && c.cat.carrying === inst,
    onInteract: (c) => drop(c)
  });
  inst.unregister = () => {
    unregBite();
    unregDrop();
  };

  inst.update = (c, dt) => {
    if (inst.state !== 'carried') return;
    const cat = c.cat;
    if (c.capture.active || cat.inBox || cat.riding || cat.sleeping || cat.carrying !== inst) {
      drop(c, true);
      return;
    }
    pos.copy(cat.mesh.position);
    // Suara seret saat bergerak
    if (Math.hypot(cat.vel.x, cat.vel.z) > 0.3) {
      inst.dragT -= dt;
      if (inst.dragT <= 0) {
        inst.dragT = P.DRAG_NOISE_EVERY;
        emitNoise(c, { x: pos.x, z: pos.z, radius: P.DRAG_NOISE_RADIUS, source: 'step-drag' });
        c.audio.play('drag');
      }
    }
  };

  inst.dispose = (c) => {
    if (c && c.cat.carrying === inst) c.cat.carrying = null;
    removeAndDispose(mesh);
  };

  return inst;
}
