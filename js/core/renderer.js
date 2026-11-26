// Membuat scene, kamera, dan WebGLRenderer, serta menangani resize jendela.
import * as THREE from 'three';
import { RENDERER, CAMERA } from '../config.js';

export function createRenderer(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(RENDERER.BACKGROUND_COLOR);
  scene.fog = new THREE.Fog(RENDERER.FOG_COLOR, RENDERER.FOG_NEAR, RENDERER.FOG_FAR);

  const camera = new THREE.PerspectiveCamera(
    CAMERA.FOV,
    window.innerWidth / window.innerHeight,
    CAMERA.NEAR,
    CAMERA.FAR
  );

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: RENDERER.ANTIALIAS });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER.MAX_PIXEL_RATIO));
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDERER.TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return { scene, camera, renderer };
}

export function bindResize(camera, renderer) {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
