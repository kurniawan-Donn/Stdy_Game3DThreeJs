// Ruang tamu tertutup: lantai kayu, 4 dinding, plafon, jendela besar, baseboard.
import * as THREE from 'three';
import { ROOM, ROOM_HALF_W, ROOM_HALF_D, MATERIALS } from '../config.js';
import { createWoodFloorTexture } from './textures.js';

export function createLivingRoom(scene) {
  const ROOM_WIDTH = ROOM.WIDTH;
  const ROOM_DEPTH = ROOM.DEPTH;
  const ROOM_HEIGHT = ROOM.HEIGHT;

  // Lantai kayu
  const woodTex = createWoodFloorTexture();
  const floorMat = new THREE.MeshStandardMaterial({ map: woodTex, ...MATERIALS.floor });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Plafon
  const ceilingMat = new THREE.MeshStandardMaterial({ ...MATERIALS.ceiling });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  scene.add(ceiling);

  // Material dinding & lis kayu (baseboard)
  const wallMat = new THREE.MeshStandardMaterial({ ...MATERIALS.wall });
  const trimMat = new THREE.MeshStandardMaterial({ ...MATERIALS.trim });

  const wallThick = ROOM.WALL_THICKNESS;

  // Dinding Utara (-Z)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, wallThick), wallMat);
  northWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_HALF_D - wallThick / 2);
  northWall.receiveShadow = true;
  scene.add(northWall);

  // Dinding Selatan (+Z)
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, wallThick), wallMat);
  southWall.position.set(0, ROOM_HEIGHT / 2, ROOM_HALF_D + wallThick / 2);
  southWall.receiveShadow = true;
  scene.add(southWall);

  // Dinding Timur (+X)
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, ROOM_HEIGHT, ROOM_DEPTH), wallMat);
  eastWall.position.set(ROOM_HALF_W + wallThick / 2, ROOM_HEIGHT / 2, 0);
  eastWall.receiveShadow = true;
  scene.add(eastWall);

  // Dinding Barat (-X) dengan bukaan jendela besar
  const win = ROOM.WINDOW;
  const winZMin = win.Z_MIN;
  const winZMax = win.Z_MAX;
  const winYMin = win.Y_MIN;
  const winYMax = win.Y_MAX;
  const winW = winZMax - winZMin;
  const winH = winYMax - winYMin;
  const winCenterZ = (winZMin + winZMax) / 2;
  const winCenterY = (winYMin + winYMax) / 2;

  const westSegments = [
    // Bagian bawah jendela
    { w: ROOM_DEPTH, h: winYMin, y: winYMin / 2, z: 0 },
    // Bagian atas jendela
    { w: ROOM_DEPTH, h: ROOM_HEIGHT - winYMax, y: winYMax + (ROOM_HEIGHT - winYMax) / 2, z: 0 },
    // Sisi kiri (utara) jendela
    { w: winZMin - (-ROOM_HALF_D), h: winH, y: winCenterY, z: (-ROOM_HALF_D + winZMin) / 2 },
    // Sisi kanan (selatan) jendela
    { w: ROOM_HALF_D - winZMax, h: winH, y: winCenterY, z: (winZMax + ROOM_HALF_D) / 2 }
  ];

  for (const seg of westSegments) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wallThick, seg.h, seg.w), wallMat);
    mesh.position.set(-ROOM_HALF_W - wallThick / 2, seg.y, seg.z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
  }

  // Pemandangan langit cerah di luar jendela
  const outsideBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(winW + win.BACKDROP_PADDING, winH + win.BACKDROP_PADDING),
    new THREE.MeshBasicMaterial({ ...MATERIALS.windowBackdrop })
  );
  outsideBackdrop.rotation.y = Math.PI / 2;
  outsideBackdrop.position.set(-ROOM_HALF_W - win.BACKDROP_DISTANCE, winCenterY, winCenterZ);
  scene.add(outsideBackdrop);

  // Kusen jendela kayu
  const frameThick = win.FRAME_THICKNESS;
  const frameDepth = win.FRAME_DEPTH;
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, frameThick, winW + frameThick * 2), trimMat);
  topFrame.position.set(-ROOM_HALF_W - wallThick / 2, winYMax + frameThick / 2, winCenterZ);
  scene.add(topFrame);

  const botFrame = topFrame.clone();
  botFrame.position.y = winYMin - frameThick / 2;
  scene.add(botFrame);

  const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, winH, frameThick), trimMat);
  leftFrame.position.set(-ROOM_HALF_W - wallThick / 2, winCenterY, winZMin - frameThick / 2);
  scene.add(leftFrame);

  const rightFrame = leftFrame.clone();
  rightFrame.position.z = winZMax + frameThick / 2;
  scene.add(rightFrame);

  // Palang tengah jendela
  const midV = new THREE.Mesh(new THREE.BoxGeometry(win.MULLION_THICKNESS, winH, win.MULLION_DEPTH), trimMat);
  midV.position.set(-ROOM_HALF_W - wallThick / 2, winCenterY, winCenterZ);
  midV.castShadow = true;
  scene.add(midV);

  const midH = new THREE.Mesh(new THREE.BoxGeometry(win.MULLION_THICKNESS, win.MULLION_DEPTH, winW), trimMat);
  midH.position.set(-ROOM_HALF_W - wallThick / 2, winCenterY, winCenterZ);
  midH.castShadow = true;
  scene.add(midH);

  // Kaca jendela transparan halus
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH),
    new THREE.MeshStandardMaterial({ ...MATERIALS.glass })
  );
  glass.rotation.y = Math.PI / 2;
  glass.position.set(-ROOM_HALF_W - win.GLASS_INSET, winCenterY, winCenterZ);
  scene.add(glass);

  // Baseboard kayu di 4 dinding
  const baseH = ROOM.BASEBOARD_HEIGHT;
  const baseD = ROOM.BASEBOARD_DEPTH;
  const baseNorth = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, baseH, baseD), trimMat);
  baseNorth.position.set(0, baseH / 2, -ROOM_HALF_D + baseD / 2);
  scene.add(baseNorth);

  const baseSouth = baseNorth.clone();
  baseSouth.position.z = ROOM_HALF_D - baseD / 2;
  scene.add(baseSouth);

  const baseEast = new THREE.Mesh(new THREE.BoxGeometry(baseD, baseH, ROOM_DEPTH), trimMat);
  baseEast.position.set(ROOM_HALF_W - baseD / 2, baseH / 2, 0);
  scene.add(baseEast);

  const baseWest = baseEast.clone();
  baseWest.position.x = -ROOM_HALF_W + baseD / 2;
  scene.add(baseWest);
}
