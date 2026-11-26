// Animasi pemilik: pose target per kegiatan, diinterpolasi halus ke sendi.
// Pose: stand, walk, run, sit, type, stretch, glance, drink, window, lookAround, lift, sleep (berbaring: rotasi badan di owner/index.js)
// Level 5 (juga tamu): sitTalk, sitDrink, sitLaugh, laugh, crouch, pet, wave
import * as THREE from 'three';
import { OWNER_ANIM as A, OWNER_ROUTINE } from '../../config.js';
import { HIP_Y } from './model.js';

const SIT_POSES = new Set(['sit', 'type', 'stretch', 'glance', 'sitTalk', 'sitDrink', 'sitLaugh']);

export function isSittingPose(pose) {
  return SIT_POSES.has(pose);
}

function baseTargets() {
  return {
    hipsY: HIP_Y,
    torsoX: 0,
    legL: [0, 0],
    legR: [0, 0],
    armL: [0, -0.08, 0], // [bahu X, bahu Z, siku X]
    armR: [0, 0.08, 0],
    headX: 0
  };
}

function targetsFor(owner, t) {
  const T = baseTargets();
  const pose = owner.pose;

  if (SIT_POSES.has(pose)) {
    T.hipsY = OWNER_ROUTINE.SIT_HEIGHT;
    T.legL = [-1.5, 1.5];
    T.legR = [-1.5, 1.5];
    T.armL = [-0.4, -0.08, -0.6];
    T.armR = [-0.4, 0.08, -0.6];
  }

  switch (pose) {
    case 'walk':
    case 'run': {
      const run = pose === 'run';
      const s = Math.sin(owner.walkPhase);
      const legSwing = A.WALK_LEG_SWING * (run ? 1.3 : 1);
      const armSwing = run ? A.RUN_ARM_SWING : A.WALK_ARM_SWING;
      T.legL = [s * legSwing, Math.max(0, -s) * 0.8];
      T.legR = [-s * legSwing, Math.max(0, s) * 0.8];
      T.armL = [-s * armSwing, -0.08, run ? -1.2 : -0.15];
      T.armR = [s * armSwing, 0.08, run ? -1.2 : -0.15];
      T.torsoX = run ? 0.18 : 0.03;
      break;
    }
    case 'type': {
      const bobL = Math.sin(t * A.TYPE_FREQ) * A.TYPE_AMP;
      const bobR = Math.sin(t * A.TYPE_FREQ + 2.1) * A.TYPE_AMP;
      T.armL = [-0.75 + bobL, -0.05, -0.85];
      T.armR = [-0.75 + bobR, 0.05, -0.85];
      T.headX = 0.2;
      break;
    }
    case 'stretch':
      T.armL = [-3.0, -0.25, -0.2];
      T.armR = [-3.0, 0.25, -0.2];
      T.torsoX = -0.12;
      T.headX = -0.25;
      break;
    case 'drink':
      T.armR = [-1.25, 0.1, -1.9];
      T.headX = -0.3;
      break;
    case 'window':
      T.armL = [0.35, -0.1, -0.9];
      T.armR = [0.35, 0.1, -0.9];
      break;
    case 'kneel':
      // Membungkuk mengecek kolong perabot
      T.hipsY = HIP_Y * 0.5;
      T.legL = [-1.3, 2.1];
      T.legR = [-0.6, 1.4];
      T.torsoX = 0.75;
      T.headX = 0.5;
      T.armL = [-0.9, -0.1, -0.3];
      T.armR = [-0.6, 0.1, -0.5];
      break;
    case 'sitTalk': {
      // Mengobrol sambil duduk: tangan sesekali bergerak
      const g = Math.sin(t * A.TALK_FREQ) * A.TALK_AMP;
      T.armR = [-0.6 + g, 0.12, -1.0];
      T.headX = 0.05 + Math.sin(t * A.TALK_FREQ * 0.5) * 0.05;
      break;
    }
    case 'sitDrink':
      T.armR = [-1.25, 0.1, -1.9];
      T.headX = -0.3;
      break;
    case 'sitLaugh':
    case 'laugh': {
      // Tertawa: badan sedikit ke belakang & berguncang
      const shake = Math.sin(t * A.LAUGH_FREQ) * A.LAUGH_AMP;
      T.torsoX = -0.18 + shake;
      T.headX = -0.35 + shake;
      T.armL = [-0.5, -0.2, -1.2];
      T.armR = [-0.5, 0.2, -1.2];
      break;
    }
    case 'crouch':
    case 'pet': {
      // Berjongkok (dan mengelus: tangan kanan mengusap maju-mundur)
      T.hipsY = HIP_Y * A.CROUCH_HIP;
      T.legL = [-1.6, 2.3];
      T.legR = [-1.6, 2.3];
      T.torsoX = 0.55;
      T.headX = 0.45;
      const stroke = pose === 'pet' ? Math.sin(t * A.PET_FREQ) * A.PET_AMP : 0;
      T.armR = [-0.9 + stroke, 0.1, -0.2];
      T.armL = [-0.3, -0.1, -0.4];
      break;
    }
    case 'wave': {
      // Melambai: lengan kanan terangkat, bergoyang
      T.armR = [-2.7, 0.35 + Math.sin(t * A.WAVE_FREQ) * A.WAVE_AMP, -0.3];
      T.headX = -0.05;
      break;
    }
    case 'lift':
      T.armL = [-1.35, -0.1, -0.25];
      T.armR = [-1.35, 0.1, -0.25];
      T.torsoX = -0.06;
      T.headX = 0.25;
      break;
    default:
      break;
  }
  return T;
}

export function animateOwner(owner, dt, t) {
  const p = owner.parts;
  const T = targetsFor(owner, t);
  const instant = owner.pose === 'walk' || owner.pose === 'run';
  const k = instant ? 1 : Math.min(1, A.POSE_LERP * dt);
  const lerp = THREE.MathUtils.lerp;

  p.hips.position.y = lerp(p.hips.position.y, T.hipsY, Math.min(1, A.POSE_LERP * dt));
  p.torso.rotation.x = lerp(p.torso.rotation.x, T.torsoX, k);
  p.legL.hip.rotation.x = lerp(p.legL.hip.rotation.x, T.legL[0], k);
  p.legL.knee.rotation.x = lerp(p.legL.knee.rotation.x, T.legL[1], k);
  p.legR.hip.rotation.x = lerp(p.legR.hip.rotation.x, T.legR[0], k);
  p.legR.knee.rotation.x = lerp(p.legR.knee.rotation.x, T.legR[1], k);
  p.armL.shoulder.rotation.x = lerp(p.armL.shoulder.rotation.x, T.armL[0], k);
  p.armL.shoulder.rotation.z = lerp(p.armL.shoulder.rotation.z, T.armL[1], k);
  p.armL.elbow.rotation.x = lerp(p.armL.elbow.rotation.x, T.armL[2], k);
  p.armR.shoulder.rotation.x = lerp(p.armR.shoulder.rotation.x, T.armR[0], k);
  p.armR.shoulder.rotation.z = lerp(p.armR.shoulder.rotation.z, T.armR[1], k);
  p.armR.elbow.rotation.x = lerp(p.armR.elbow.rotation.x, T.armR[2], k);
  p.head.rotation.x = lerp(p.head.rotation.x, T.headX, k);
  p.head.rotation.y = owner.headYaw;
  p.mug.visible = owner.pose === 'drink' || owner.pose === 'sitDrink';
}
