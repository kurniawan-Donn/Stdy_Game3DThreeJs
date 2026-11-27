// Semua objek kenakalan di level: dibuat dari MISCHIEF_LAYOUT, di-update
// tiap frame, dan dibuat ulang saat level diulang (tiap objek sekali per level).
import * as THREE from 'three';
import { MISCHIEF_LAYOUT } from '../../config.js';
import { currentLevel } from '../../core/state.js';
import { createGlass, createTeacup } from './glass.js';
import { createTissue } from './tissue.js';
import { createScratch } from './scratch.js';
import { createRemote } from './remote.js';
import { createPot } from './pot.js';
import { createKitchenFish } from './kitchenFish.js';
import { createToiletPaper } from './toiletPaper.js';
import { createBlanket } from './blanket.js';
import { createKnead } from './knead.js';
import { createAlarmClock } from './alarmClock.js';
import { createCake } from './cake.js';
import { createGuestBag } from './guestBag.js';
import { createGuestChair } from './guestChair.js';
import { createLaundry } from './laundry.js';
import { createDuster } from './duster.js';

const FACTORIES = {
  glass: createGlass,
  tissue: createTissue,
  scratchSofa: createScratch,
  remote: createRemote,
  pot: createPot,
  kitchenFish: createKitchenFish,
  toiletPaper: createToiletPaper,
  blanket: createBlanket,
  knead: createKnead, // Level 4 (malam)
  alarmClock: createAlarmClock, // Level 4 (malam)
  cake: createCake, // Level 5 (tamu)
  teacup: createTeacup,
  guestBag: createGuestBag,
  guestChair: createGuestChair,
  laundry: createLaundry, // Level Bonus (bersih-bersih)
  duster: createDuster
};

export function createMischiefSystem(scene) {
  const group = new THREE.Group();
  scene.add(group);
  return { group, instances: [] };
}

// Hapus semua objek lama (kembalikan perabot ke kondisi awal) lalu buat baru.
export function resetMischief(ctx) {
  const m = ctx.mischief;
  for (const inst of m.instances) {
    if (inst.unregister) inst.unregister();
    if (inst.dispose) inst.dispose(ctx);
  }
  m.instances.length = 0;

  // Kenakalan aktif ditentukan file level (null = semua)
  const active = currentLevel(ctx.state).ACTIVE_MISCHIEF;
  for (const [type, specs] of Object.entries(MISCHIEF_LAYOUT)) {
    if (active && !active.includes(type)) continue;
    const factory = FACTORIES[type];
    for (const spec of specs) {
      const inst = factory(ctx, spec);
      inst.kind = type;
      inst.spec = spec;
      m.instances.push(inst);
    }
  }
}

// Buat ulang satu objek seperti semula (Level Bonus: pemilik membereskan).
// carry: data yang dibawa ke objek baru ({ tidyCount, lhoKokGiven, exhausted }).
// exhausted = objek tetap rapi tetapi tidak bisa dinakali lagi.
export function respawnMischief(ctx, inst, carry = {}) {
  const m = ctx.mischief;
  const i = m.instances.indexOf(inst);
  if (i < 0) return null;
  if (inst.unregister) inst.unregister();
  if (inst.dispose) inst.dispose(ctx);
  const fresh = FACTORIES[inst.kind](ctx, inst.spec);
  fresh.kind = inst.kind;
  fresh.spec = inst.spec;
  Object.assign(fresh, carry);
  if (carry.exhausted) fresh.done = true;
  m.instances[i] = fresh;
  return fresh;
}

export function updateMischief(ctx, dt) {
  for (const inst of ctx.mischief.instances) {
    if (inst.update) inst.update(ctx, dt);
  }
}

// Jumlah objek kenakalan yang masih tersedia (untuk debug/HUD)
export function remainingMischief(ctx) {
  return ctx.mischief.instances.filter((i) => !i.done).length;
}
