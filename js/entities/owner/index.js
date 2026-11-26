// Pemilik rumah (GDD §8–9): rutinitas waypoint, persepsi, meter curiga,
// dan state machine RUTINITAS → CURIGA (?) → MENYELIDIKI → MENGEJAR (!).
// Saat menangkap kucing, kendali diserahkan ke systems/capture.js.
import { OWNER, OWNER_ROUTINE as R, SUSPICION as S, CHASE, NAV, OWNER_ANIM, HIDE_BOX, HIDE_SPOT, RIDE } from '../../config.js';
import { createOwnerMesh } from './model.js';
import { animateOwner, isSittingPose } from './animation.js';
import { findPath } from '../../systems/navGrid.js';
import { senseCat } from '../../systems/perception.js';
import { isAnnoying } from '../../systems/meow.js';
import { setDoorOpen, isDoorOpen, isDoorClosed } from '../../world/house.js';
import { startCapture } from '../../systems/capture.js';
import { hideSpotOf, recentChaosNear } from '../../systems/hiding.js';
import { resetMeetings, updateMeeting, endMeeting, dueMeeting, isLoudDuringMeeting } from './meeting.js';
import { isNoiseMasked, weatherConfig } from '../../systems/weather.js';

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
    away: false,
    // Rapat video (Level 2, owner/meeting.js)
    meetings: [],
    inMeeting: null,
    meetingT: 0
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
  resetMeetings(ctx);
}

// --- Naskah (tutorial) ---------------------------------------------------
// Pemilik keluar layar: tidak terlihat, tidak melihat & tidak mendengar.
export function ownerGoOffstage(ctx) {
  const o = ctx.owner;
  setState(ctx, o, 'routine');
  o.meter = 0;
  o.attention = null;
  o.activity = 'offstage';
  o.phase = 'do';
  o.away = true;
  o.seen = false;
  o.mesh.visible = false;
}

// Patroli: muncul di `start`, berjalan melewati titik-titik
// [{ x, z, look }] (look = detik menoleh ke sekeliling), lalu keluar layar.
// Persepsi & curiga berjalan normal selama patroli.
export function ownerStartPatrol(ctx, start, points) {
  const o = ctx.owner;
  setState(ctx, o, 'routine');
  o.meter = 0;
  o.away = false;
  o.mesh.visible = true;
  o.mesh.position.set(start.x, 0, start.z);
  o.pose = 'stand';
  o.activity = 'patrol';
  o.phase = 'goto';
  o.patrol = { points, i: 0 };
  clearPath(o);
}

function updatePatrol(ctx, o, dt) {
  const pt = o.patrol.points[o.patrol.i];
  if (o.phase === 'goto') {
    if (walkTo(ctx, o, pt, OWNER.WALK_SPEED, dt)) {
      o.phase = 'look';
      o.activityT = pt.look || 0;
    }
    return;
  }
  o.pose = 'stand';
  o.activityT -= dt;
  if (o.activityT > 0) {
    o.headYaw = Math.sin(o.clock * OWNER_ANIM.LOOK_AROUND_SPEED) * OWNER_ANIM.LOOK_AROUND_YAW;
    return;
  }
  o.patrol.i++;
  if (o.patrol.i >= o.patrol.points.length) ownerGoOffstage(ctx);
  else o.phase = 'goto';
}

// Jejak kaki basah terlihat (entities/footprints.js): curiga naik, lalu
// menyelidiki ke jejak terbaru. Seperti suara, tidak bisa langsung "!".
export function ownerNoticeTrail(ctx, point, gain) {
  const o = ctx.owner;
  if (o.away || o.state === 'chase' || o.state === 'capture') return;
  o.meter = Math.min(o.meter + gain * suspicionGain(ctx, o), Math.max(o.meter, S.NOISE_CAP));
  o.attention = { x: point.x, z: point.z };
  setState(ctx, o, 'investigate');
}

// Pemilik muncul di `start` dan langsung mengejar kucing ("!")
export function ownerStartChase(ctx, start) {
  const o = ctx.owner;
  o.away = false;
  o.mesh.visible = true;
  if (start) o.mesh.position.set(start.x, 0, start.z);
  o.pose = 'stand';
  o.activity = 'work';
  o.meter = S.MAX;
  o.attention = { x: ctx.cat.mesh.position.x, z: ctx.cat.mesh.position.z };
  o.lastSeenAt = ctx.time;
  setState(ctx, o, 'chase');
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

function pickNextActivity(ctx, o) {
  // Level hujan: sekali per level, kegiatan pertama setelah WINDOW_FIX_AFTER
  // detik adalah menutup jendela bocor & menaruh ember
  const W = weatherConfig(ctx);
  // (jika sempat terputus, misalnya karena mengejar, dicoba lagi nanti)
  if (W && ctx.weather && !ctx.weather.windowFixed && ctx.time >= W.WINDOW_FIX_AFTER) {
    return { id: 'closeWindow', duration: W.WINDOW_FIX_DURATION };
  }
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
  o.phase = 'goto';
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
      // Rapat video: duduk diam menghadap laptop, tidak menoleh
      if (updateMeeting(ctx, dt)) {
        o.glanceT = 0;
        turnTowards(o, spots.desk.yaw, dt);
        o.pose = 'type';
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
      if (o.activityT <= 0) startActivity(o, pickNextActivity(ctx, o));
      return;
    }
    case 'drink':
    case 'tea': // Level hujan: membuat teh (menggantikan ambil minum)
    case 'window':
    case 'closeWindow': // Level hujan: menutup jendela bocor & menaruh ember
    case 'bedroom': {
      const a = o.activity;
      const spot = a === 'drink' || a === 'tea' ? spots.kitchen : a === 'window' || a === 'closeWindow' ? spots.window : spots.bedroom;
      if (o.phase === 'goto') {
        if (walkTo(ctx, o, spot, OWNER.WALK_SPEED, dt)) {
          o.phase = 'do';
          if (a === 'tea') ctx.audio.play('kettle');
        }
        return;
      }
      turnTowards(o, spot.yaw, dt);
      o.pose = a === 'bedroom' || a === 'closeWindow' ? 'window' : a === 'tea' ? 'drink' : a;
      o.activityT -= dt;
      if (a === 'closeWindow' && o.activityT <= 0 && ctx.weather) {
        ctx.weather.windowFixed = true;
        ctx.audio.play('windowClose');
      }
      // Jadwal rapat tiba: kegiatan dipersingkat, kembali ke meja
      if (o.activityT <= 0 || dueMeeting(ctx)) startWork(o);
      return;
    }
    case 'toilet':
      updateToilet(ctx, o, dt);
      return;
    case 'offstage':
      // Naskah tutorial: pemilik di luar layar (tidak melihat/mendengar)
      o.away = true;
      o.mesh.visible = false;
      return;
    case 'patrol':
      updatePatrol(ctx, o, dt);
      return;
    default:
      startWork(o);
  }
}

// Toilet: jalan ke kamar mandi → pintu menutup → di dalam 20 detik (tidak
// melihat/mendengar) → siraman → pintu membuka → kembali bekerja.
// Status pintu dihitung tiap frame di updateOwner (bathDoorShouldClose).
function updateToilet(ctx, o, dt) {
  const spot = R.SPOTS.toilet;
  switch (o.phase) {
    case 'goto':
      if (walkTo(ctx, o, spot, OWNER.WALK_SPEED, dt)) {
        o.phase = 'close';
        ctx.audio.play('door');
      }
      break;
    case 'close':
      o.pose = 'stand';
      turnTowards(o, spot.yaw, dt);
      if (isDoorClosed(ctx.door)) {
        o.phase = 'away';
        o.away = true;
        o.activityT = OWNER.TOILET_DURATION;
      }
      break;
    case 'away':
      o.activityT -= dt;
      if (o.activityT <= 0) {
        o.away = false;
        o.phase = 'open';
        ctx.audio.play('flush');
      }
      break;
    case 'open':
      if (isDoorOpen(ctx.door)) {
        ctx.audio.play('door');
        startWork(o);
      }
      break;
    default:
      startWork(o);
  }
}

// Pintu kamar mandi tertutup hanya saat pemilik sedang di dalam
function bathDoorShouldClose(o) {
  return o.state === 'routine' && o.activity === 'toilet' && (o.phase === 'close' || o.phase === 'away');
}

// --- State curiga -------------------------------------------------------

// Kolong tempat sembunyi terdekat dari titik p (≤ HIDE_SPOT.CHECK_DIST), atau null
function hideSpotNear(ctx, p) {
  if (!p) return null;
  let best = null;
  let bestD = HIDE_SPOT.CHECK_DIST;
  for (const box of ctx.colliders) {
    if (!box.hideSpot) continue;
    const cx = Math.max(box.minX, Math.min(p.x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(p.z, box.maxZ));
    const d = Math.hypot(p.x - cx, p.z - cz);
    if (d <= bestD) {
      best = box;
      bestD = d;
    }
  }
  return best;
}

// Membungkuk mengecek kolong; jika kucing bersembunyi di sana → ditarik keluar
function updateKneel(ctx, o, dt) {
  const spot = o.checkingSpot;
  o.stateT += dt;
  o.pose = 'kneel';
  lookAt(o, { x: (spot.minX + spot.maxX) / 2, z: (spot.minZ + spot.maxZ) / 2 }, dt, true);
  if (o.stateT < HIDE_SPOT.KNEEL_DURATION) return;
  o.checkingSpot = null;
  if (hideSpotOf(ctx.cat) === spot && ctx.state.invulnerableTimer <= 0 && !ctx.capture.active) {
    o.meter = S.MAX;
    o.state = 'chase';
    ctx.audio.play('alarm');
    startCapture(ctx);
    return;
  }
  o.phase = 'search';
  o.stateT = 0;
}

function setState(ctx, o, state) {
  const prev = o.state;
  o.checkingSpot = null;
  if (state !== 'routine') endMeeting(ctx); // keluar rutinitas = rapat bubar
  o.state = state;
  o.stateT = 0;
  o.lostT = 0;
  o.waitHighT = 0;
  clearPath(o);
  if (state === 'investigate') o.phase = 'goto';
  // Keluar dari rutinitas: pintu toilet ditutup jika sempat terbuka
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
  // Kucing tidur di sinar matahari tidak dicurigai, kecuali ada kekacauan
  // baru di dekatnya
  if (o.seen && cat.sleeping && !recentChaosNear(ctx, cat.mesh.position.x, cat.mesh.position.z)) {
    o.seen = false;
    o.sense.ignoredSleep = true;
  }
  if (o.seen) o.lastSeenAt = ctx.time;
  if (o.seen) {
    o.attention = { x: cat.mesh.position.x, z: cat.mesh.position.z };
    if (cat.action) {
      // Kepergok sedang berbuat nakal: langsung "!"
      o.meter = S.MAX;
    } else {
      const near = S.GAIN_NEAR_DIST;
      const far = Math.max(near + 0.01, o.sense.range);
      const f = Math.max(0, Math.min(1, (o.sense.distance - near) / (far - near)));
      let gain = S.GAIN_NEAR + (S.GAIN_FAR - S.GAIN_NEAR) * f;
      if (o.sense.boxMoving) gain *= HIDE_BOX.MOVE_GAIN_MULT; // kardus bergerak: mencurigakan
      if (cat.riding) gain *= RIDE.SUSPICION_MULT; // kucing santai di atas robot
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

  // Level hujan: suara tertutup guntur / hujan
  if (isNoiseMasked(ctx, ev)) return;
  const isStep = ev.source.startsWith('step-') || ev.source === 'land';
  const point = { x: ev.x, z: ev.z };

  // Rapat video: suara keras = langsung "!" (malu di depan bos); suara
  // pelan hanya menambah curiga, pemilik tetap duduk di rapat.
  if (o.inMeeting) {
    if (isLoudDuringMeeting(ctx, ev)) {
      o.meter = S.MAX;
      o.attention = point;
      ctx.audio.play('meetingBusted');
      setState(ctx, o, 'chase');
    } else {
      const gain = ev.source === 'meow' ? S.MEOW_GAIN : ev.radius * S.NOISE_PER_METER * (isStep ? S.FOOTSTEP_MULT : 1);
      o.meter = Math.min(o.meter + gain * suspicionGain(ctx, o), Math.max(o.meter, S.NOISE_CAP));
    }
    return;
  }
  let gain = ev.source === 'meow' ? S.MEOW_GAIN : ev.radius * S.NOISE_PER_METER * (isStep ? S.FOOTSTEP_MULT : 1);
  gain *= suspicionGain(ctx, o);
  // Suara saja tidak bisa memicu "!"
  o.meter = Math.min(o.meter + gain, Math.max(o.meter, S.NOISE_CAP));

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
      // Saat rapat pemilik tetap duduk (meter tetap naik bila melihat kucing)
      if (o.seen && o.meter > 0 && !o.away && !o.inMeeting) setState(ctx, o, 'curious');
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
      if (o.phase === 'kneel') {
        updateKneel(ctx, o, dt);
      } else if (o.phase !== 'search') {
        const arrived = walkTo(ctx, o, o.attention, OWNER.INVESTIGATE_SPEED, dt, true);
        lookAt(o, o.attention, dt, false);
        if (arrived) {
          o.phase = 'search';
          o.stateT = 0;
          const spot = hideSpotNear(ctx, o.attention);
          if (spot && Math.random() < HIDE_SPOT.CHECK_CHANCE) {
            o.phase = 'kneel';
            o.checkingSpot = spot;
          }
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

  setDoorOpen(ctx.door, !bathDoorShouldClose(o));

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

  // Kucing di tempat tinggi atau di kolong perabot: tunggu di dekatnya, lalu menyerah
  const hidden = !!ctx.cat.underCrawl;
  if ((cat.y > CHASE.REACH_HEIGHT && hDist <= CHASE.UNDER_HIGH_DIST) || (hidden && hDist <= CHASE.HIDDEN_WAIT_DIST)) {
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
    !hidden &&
    !(ctx.cat.inBox && !ctx.cat.inBox.compromised) &&
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
