// Pemilik rumah (GDD §8–9): rutinitas waypoint, persepsi, meter curiga,
// dan state machine RUTINITAS → CURIGA (?) → MENYELIDIKI → MENGEJAR (!).
// Saat menangkap kucing, kendali diserahkan ke systems/capture.js.
import { OWNER, OWNER_ROUTINE as R, SUSPICION as S, CHASE, NAV, DOOR, OWNER_ANIM } from '../../config.js';
import { createOwnerMesh } from './model.js';
import { animateOwner, isSittingPose } from './animation.js';
import { findPath } from '../../systems/navGrid.js';
import { senseCat } from '../../systems/perception.js';
import { isAnnoying } from '../../systems/meow.js';
import { setDoorOpen, isDoorOpen } from '../../world/house.js';
import { startCapture } from '../../systems/capture.js';

const HEAD_MAX = (OWNER.HEAD_MAX_YAW_DEG * Math.PI) / 180;

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function createOwner(scene) {
  const { root, parts } = createOwnerMesh();
  scene.add(root);
  return {
    mesh: root,
    parts,
    yaw: 0,
    headYaw: 0,
    pose: 'type',
    walkPhase: 0,
    clock: 0,
    // Persepsi
    eye: { x: 0, y: 0, z: 0 },
    lookYaw: 0,
    sense: null,
    seen: false,
    // State machine
    state: 'routine', // routine | curious | investigate | chase | capture
    meter: 0,
    stateT: 0,
    lostT: 0,
    waitHighT: 0,
    attention: null, // {x, z} titik yang sedang diperhatikan
    // Navigasi
    path: null,
    pathGoal: null,
    replanT: 0,
    // Rutinitas
    activity: 'work',
    phase: 'do',
    activityT: 0,
    glanceIn: 0,
    glanceT: 0,
    stretchAt: -1,
    stretchT: 0,
    toiletUsed: false,
    away: false
  };
}

export function resetOwner(ctx) {
  const o = ctx.owner;
  const spot = R.SPOTS.desk;
  o.mesh.visible = true;
  o.away = false;
  o.mesh.position.set(spot.x, 0, spot.z);
  o.yaw = spot.yaw;
  o.mesh.rotation.y = o.yaw;
  o.headYaw = 0;
  o.state = 'routine';
  o.meter = 0;
  o.attention = null;
  o.path = null;
  o.toiletUsed = false;
  o.seen = false;
  o.sense = null;
  startWork(o);
  o.phase = 'do'; // mulai sudah duduk di meja
  o.pose = 'type';
  o.parts.hips.position.y = R.SIT_HEIGHT;
}

// --- Gerak & navigasi ---------------------------------------------------

function turnTowards(o, targetYaw, dt) {
  const diff = wrapAngle(targetYaw - o.yaw);
  o.yaw += diff * Math.min(1, OWNER.TURN_SPEED * dt);
  o.mesh.rotation.y = o.yaw;
}

function yawTo(o, x, z) {
  return Math.atan2(x - o.mesh.position.x, z - o.mesh.position.z);
}

function clearPath(o) {
  o.path = null;
  o.pathGoal = null;
}

// Berjalan mengikuti jalur A* ke target. Mengembalikan true jika sudah sampai.
function walkTo(ctx, o, target, speed, dt, replan = false) {
  const pos = o.mesh.position;
  o.replanT -= dt;
  const goalMoved = !o.pathGoal || Math.hypot(o.pathGoal.x - target.x, o.pathGoal.z - target.z) > 0.3;
  if (!o.path || (goalMoved && (!replan || o.replanT <= 0))) {
    o.path = findPath(ctx.nav, pos.x, pos.z, target.x, target.z) || [];
    o.pathGoal = { x: target.x, z: target.z };
    o.replanT = NAV.REPLAN_INTERVAL;
  }
  return followPath(o, speed, dt);
}

function followPath(o, speed, dt) {
  const pos = o.mesh.position;
  let step = speed * dt;
  while (o.path.length && step > 0) {
    const wp = o.path[0];
    const dx = wp.x - pos.x;
    const dz = wp.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= NAV.ARRIVE_DIST) {
      o.path.shift();
      continue;
    }
    const move = Math.min(step, d);
    pos.x += (dx / d) * move;
    pos.z += (dz / d) * move;
    o.walkPhase += move * OWNER_ANIM.WALK_STRIDE;
    step -= move;
    turnTowards(o, Math.atan2(dx, dz), dt);
    o.pose = speed > OWNER.INVESTIGATE_SPEED ? 'run' : 'walk';
    break;
  }
  return o.path.length === 0;
}

// Jalan lurus tanpa A* (melewati pintu ke luar/masuk ruangan)
function walkStraight(o, x, z, speed, dt) {
  const pos = o.mesh.position;
  const dx = x - pos.x;
  const dz = z - pos.z;
  const d = Math.hypot(dx, dz);
  if (d <= NAV.ARRIVE_DIST) return true;
  const move = Math.min(speed * dt, d);
  pos.x += (dx / d) * move;
  pos.z += (dz / d) * move;
  o.walkPhase += move * OWNER_ANIM.WALK_STRIDE;
  turnTowards(o, Math.atan2(dx, dz), dt);
  o.pose = 'walk';
  return false;
}

// --- Rutinitas ----------------------------------------------------------

function startWork(o) {
  o.activity = 'work';
  o.phase = 'goto';
  o.activityT = rand(R.WORK_MIN, R.WORK_MAX);
  o.glanceIn = rand(R.GLANCE_INTERVAL_MIN, R.GLANCE_INTERVAL_MAX);
  o.glanceT = 0;
  o.stretchT = 0;
  o.stretchAt = Math.random() < R.STRETCH_CHANCE ? o.activityT * rand(0.3, 0.7) : -1;
  clearPath(o);
}

function pickNextActivity(o) {
  const options = R.ACTIVITIES.filter((a) => !(a.id === 'toilet' && o.toiletUsed));
  const total = options.reduce((sum, a) => sum + a.weight, 0);
  let r = Math.random() * total;
  for (const a of options) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return options[options.length - 1];
}

function startActivity(o, act) {
  o.activity = act.id;
  o.phase = act.id === 'toilet' ? 'gotoDoor' : 'goto';
  o.activityT = act.duration || 0;
  if (act.id === 'toilet') o.toiletUsed = true;
  clearPath(o);
}

function updateRoutine(ctx, o, dt) {
  const spots = R.SPOTS;
  o.headYaw += (0 - o.headYaw) * Math.min(1, OWNER.HEAD_TURN_SPEED * dt);

  switch (o.activity) {
    case 'work': {
      if (o.phase === 'goto') {
        if (walkTo(ctx, o, spots.desk, OWNER.WALK_SPEED, dt)) o.phase = 'do';
        return;
      }
      // Duduk bekerja; sesekali menoleh ke belakang (kursi berputar) atau meregang
      o.activityT -= dt;
      if (o.stretchAt > 0 && o.activityT <= o.stretchAt) {
        o.stretchT = R.STRETCH_DURATION;
        o.stretchAt = -1;
      }
      if (o.stretchT > 0) o.stretchT -= dt;
      if (o.glanceT > 0) {
        o.glanceT -= dt;
      } else {
        o.glanceIn -= dt;
        if (o.glanceIn <= 0) {
          o.glanceT = R.GLANCE_DURATION;
          o.glanceIn = rand(R.GLANCE_INTERVAL_MIN, R.GLANCE_INTERVAL_MAX);
        }
      }
      const glancing = o.glanceT > 0;
      turnTowards(o, glancing ? spots.desk.yaw + Math.PI : spots.desk.yaw, dt);
      o.pose = o.stretchT > 0 ? 'stretch' : glancing ? 'glance' : 'type';
      if (o.activityT <= 0) startActivity(o, pickNextActivity(o));
      return;
    }
    case 'drink':
    case 'window': {
      const spot = o.activity === 'drink' ? spots.kitchen : spots.window;
      if (o.phase === 'goto') {
        if (walkTo(ctx, o, spot, OWNER.WALK_SPEED, dt)) o.phase = 'do';
        return;
      }
      turnTowards(o, spot.yaw, dt);
      o.pose = o.activity;
      o.activityT -= dt;
      if (o.activityT <= 0) startWork(o);
      return;
    }
    case 'toilet':
      updateToilet(ctx, o, dt);
      return;
    default:
      startWork(o);
  }
}

// Toilet: jalan ke pintu → buka → keluar → hilang 20 detik → masuk → tutup
function updateToilet(ctx, o, dt) {
  const door = R.SPOTS.door;
  switch (o.phase) {
    case 'gotoDoor':
      if (walkTo(ctx, o, door, OWNER.WALK_SPEED, dt)) {
        o.phase = 'open';
        setDoorOpen(ctx.door, true);
        ctx.audio.play('door');
      }
      break;
    case 'open':
      o.pose = 'stand';
      turnTowards(o, door.yaw, dt);
      if (isDoorOpen(ctx.door)) o.phase = 'exit';
      break;
    case 'exit':
      if (walkStraight(o, DOOR.OUTSIDE_X, door.z, OWNER.WALK_SPEED, dt)) {
        o.mesh.visible = false;
        o.away = true;
        o.phase = 'away';
        o.activityT = OWNER.TOILET_DURATION;
        setDoorOpen(ctx.door, false);
      }
      break;
    case 'away':
      o.activityT -= dt;
      if (o.activityT <= 0) {
        setDoorOpen(ctx.door, true);
        ctx.audio.play('flush');
        o.phase = 'return';
      }
      break;
    case 'return':
      if (isDoorOpen(ctx.door)) {
        o.mesh.visible = true;
        o.away = false;
        o.phase = 'enter';
      }
      break;
    case 'enter':
      if (walkStraight(o, door.x, door.z, OWNER.WALK_SPEED, dt)) {
        setDoorOpen(ctx.door, false);
        ctx.audio.play('door');
        startWork(o);
      }
      break;
    default:
      startWork(o);
  }
}

// --- State curiga -------------------------------------------------------

function setState(ctx, o, state) {
  const prev = o.state;
  o.state = state;
  o.stateT = 0;
  o.lostT = 0;
  o.waitHighT = 0;
  clearPath(o);
  if (state === 'investigate') o.phase = 'goto';
  // Keluar dari rutinitas: pintu toilet ditutup jika sempat terbuka
  if (prev === 'routine' && state !== 'routine') setDoorOpen(ctx.door, false);
  if (state === 'chase' && prev !== 'chase') ctx.audio.play('alarm');
  if ((state === 'curious' || state === 'investigate') && prev === 'routine') ctx.audio.play('suspicious');
}

function backToRoutine(ctx, o, meter) {
  o.meter = meter;
  setState(ctx, o, 'routine');
  startWork(o);
}

function lookAt(o, point, dt, turnBody) {
  if (!point) return;
  const target = yawTo(o, point.x, point.z);
  if (turnBody) turnTowards(o, target, dt);
  const rel = Math.max(-HEAD_MAX, Math.min(HEAD_MAX, wrapAngle(target - o.yaw)));
  o.headYaw += (rel - o.headYaw) * Math.min(1, OWNER.HEAD_TURN_SPEED * dt);
}

function suspicionGain(ctx, o) {
  return isAnnoying(ctx.meow) ? S.ANNOYED_MULT : 1;
}

function updatePerception(ctx, o, dt) {
  const pos = o.mesh.position;
  const eyeY = isSittingPose(o.pose) ? OWNER.EYE_HEIGHT_SIT : OWNER.EYE_HEIGHT_STAND;
  o.eye = { x: pos.x, y: eyeY, z: pos.z };
  o.lookYaw = o.yaw + o.headYaw;
  o.sense = senseCat(ctx, o.eye, o.lookYaw);
  o.seen = o.sense.visibility > 0;

  const cat = ctx.cat;
  if (o.seen) {
    o.attention = { x: cat.mesh.position.x, z: cat.mesh.position.z };
    if (cat.action) {
      // Kepergok sedang berbuat nakal: langsung "!"
      o.meter = S.MAX;
    } else {
      const near = S.GAIN_NEAR_DIST;
      const far = Math.max(near + 0.01, o.sense.range);
      const f = Math.max(0, Math.min(1, (o.sense.distance - near) / (far - near)));
      const gain = S.GAIN_NEAR + (S.GAIN_FAR - S.GAIN_NEAR) * f;
      o.meter += gain * o.sense.visibility * suspicionGain(ctx, o) * dt;
    }
  } else if (o.state !== 'chase') {
    o.meter = Math.max(0, o.meter - S.DECAY * dt);
  }
  o.meter = Math.min(S.MAX, o.meter);
}

// Dipanggil sistem noise (systems/noise.js → onNoise)
export function ownerHearNoise(ctx, ev) {
  const o = ctx.owner;
  if (!o || o.away || o.state === 'capture' || o.state === 'chase' || ctx.state.isGameOver) return;
  const pos = o.mesh.position;
  if (Math.hypot(ev.x - pos.x, ev.z - pos.z) > ev.radius) return;

  const isStep = ev.source.startsWith('step-') || ev.source === 'land';
  let gain = ev.source === 'meow' ? S.MEOW_GAIN : ev.radius * S.NOISE_PER_METER * (isStep ? S.FOOTSTEP_MULT : 1);
  gain *= suspicionGain(ctx, o);
  // Suara saja tidak bisa memicu "!"
  o.meter = Math.min(o.meter + gain, Math.max(o.meter, S.NOISE_CAP));

  const point = { x: ev.x, z: ev.z };
  if (isStep) {
    if (o.state === 'routine') {
      o.attention = point;
      setState(ctx, o, 'curious');
    }
  } else {
    o.attention = point;
    setState(ctx, o, 'investigate');
  }
}

// --- Update utama -------------------------------------------------------

export function updateOwner(ctx, dt) {
  const o = ctx.owner;
  o.clock += dt;

  if (o.state === 'capture') {
    animateOwner(o, dt, o.clock);
    return;
  }

  if (!o.away) updatePerception(ctx, o, dt);
  else o.seen = false;

  if (o.state !== 'chase' && o.meter >= S.MAX) setState(ctx, o, 'chase');

  switch (o.state) {
    case 'routine':
      if (o.seen && o.meter > 0 && !o.away) setState(ctx, o, 'curious');
      else updateRoutine(ctx, o, dt);
      break;

    case 'curious': {
      // Berhenti & menatap titik perhatian (kursi kerja bisa berputar)
      o.stateT += dt;
      if (!isSittingPose(o.pose)) o.pose = 'stand';
      lookAt(o, o.attention, dt, true);
      if (o.stateT >= S.CURIOUS_LOOK_TIME) {
        if (o.meter >= S.INVESTIGATE_AT) setState(ctx, o, 'investigate');
        else if (o.meter <= 0) backToRoutine(ctx, o, 0);
      }
      break;
    }

    case 'investigate': {
      if (o.phase !== 'search') {
        const arrived = walkTo(ctx, o, o.attention, OWNER.INVESTIGATE_SPEED, dt, true);
        lookAt(o, o.attention, dt, false);
        if (arrived) {
          o.phase = 'search';
          o.stateT = 0;
        }
      } else {
        // Menoleh ke sekeliling di titik penyelidikan
        o.stateT += dt;
        o.pose = 'stand';
        o.headYaw = Math.sin(o.clock * OWNER_ANIM.LOOK_AROUND_SPEED) * OWNER_ANIM.LOOK_AROUND_YAW;
        if (o.seen) {
          o.phase = 'goto';
          clearPath(o);
        } else if (o.stateT >= S.INVESTIGATE_LOOK_TIME) {
          backToRoutine(ctx, o, o.meter);
        }
      }
      break;
    }

    case 'chase':
      updateChase(ctx, o, dt);
      break;

    default:
      break;
  }

  // Kursi kerja ikut berputar saat pemilik duduk di meja
  const chair = ctx.furnitureRefs.workChair;
  if (chair) {
    const desk = R.SPOTS.desk;
    const atDesk = Math.hypot(o.mesh.position.x - desk.x, o.mesh.position.z - desk.z) < 0.2;
    chair.rotation.y = atDesk && isSittingPose(o.pose) ? o.yaw - desk.yaw : 0;
  }

  animateOwner(o, dt, o.clock);
}

function updateChase(ctx, o, dt) {
  const cat = ctx.cat.mesh.position;
  const pos = o.mesh.position;
  const hDist = Math.hypot(cat.x - pos.x, cat.z - pos.z);

  if (o.seen) o.lostT = 0;
  else o.lostT += dt;
  if (o.lostT >= S.LOSE_TRACK_TIME) {
    backToRoutine(ctx, o, S.AFTER_CHASE_LEVEL);
    return;
  }

  // Kucing di tempat tinggi: tunggu di bawah, lalu menyerah
  if (cat.y > CHASE.REACH_HEIGHT && hDist <= CHASE.UNDER_HIGH_DIST) {
    o.pose = 'stand';
    lookAt(o, { x: cat.x, z: cat.z }, dt, true);
    o.waitHighT += dt;
    if (o.waitHighT >= CHASE.WAIT_UNDER_HIGH) backToRoutine(ctx, o, S.AFTER_CHASE_LEVEL);
    return;
  }
  o.waitHighT = 0;

  // Raih kucing
  if (
    hDist <= CHASE.CATCH_RADIUS &&
    cat.y <= CHASE.REACH_HEIGHT &&
    ctx.state.invulnerableTimer <= 0 &&
    !ctx.capture.active
  ) {
    startCapture(ctx);
    return;
  }

  const arrived = walkTo(ctx, o, o.attention || { x: cat.x, z: cat.z }, OWNER.CHASE_SPEED, dt, true);
  if (arrived && !o.seen) {
    // Sampai di titik terakhir kucing terlihat: celingukan
    o.pose = 'stand';
    o.headYaw = Math.sin(o.clock * OWNER_ANIM.LOOK_AROUND_SPEED) * OWNER_ANIM.LOOK_AROUND_YAW;
  } else {
    lookAt(o, o.attention, dt, false);
  }
}

// Setelah kucing tertangkap & muncul di keranjang
export function ownerAfterCapture(ctx) {
  const o = ctx.owner;
  o.attention = null;
  backToRoutine(ctx, o, 0);
}
