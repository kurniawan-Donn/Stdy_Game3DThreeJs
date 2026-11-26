// Tekstur prosedural berbasis Canvas (lantai kayu, karpet).
import * as THREE from 'three';
import { TEXTURES } from '../config.js';

// Helper warna sRGB untuk CanvasTexture (kompatibel API lama & baru)
export function setTextureSRGB(tex) {
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  } else {
    tex.encoding = THREE.sRGBEncoding;
  }
}

export function createWoodFloorTexture() {
  const cfg = TEXTURES.woodFloor;
  const size = cfg.SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = cfg.BASE_COLOR;
  ctx.fillRect(0, 0, size, size);

  const rows = cfg.ROWS;
  const plankH = size / rows;
  const tones = cfg.TONES;

  for (let r = 0; r < rows; r++) {
    const y = r * plankH;
    const offset = (r % 2) * cfg.ROW_OFFSET;
    const cols = cfg.COLS;
    const plankW = size / cols;

    for (let c = -1; c <= cols; c++) {
      const x = c * plankW + offset;
      const tone = tones[(r * 3 + c + 4) % tones.length];
      ctx.fillStyle = tone;
      ctx.fillRect(x, y, plankW, plankH);

      // Serat kayu halus
      ctx.strokeStyle = cfg.GRAIN_COLOR;
      ctx.lineWidth = cfg.GRAIN_WIDTH;
      for (let g = 0; g < cfg.GRAIN_LINES; g++) {
        const gy = y + 6 + g * (plankH / 10);
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        ctx.bezierCurveTo(
          x + plankW * 0.33, gy + Math.sin(g + r) * 2.5,
          x + plankW * 0.66, gy - Math.cos(g + c) * 2.5,
          x + plankW - 2, gy
        );
        ctx.stroke();
      }

      // Garis sambungan antar papan
      ctx.strokeStyle = cfg.SEAM_COLOR;
      ctx.lineWidth = cfg.SEAM_WIDTH;
      ctx.strokeRect(x, y, plankW, plankH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(cfg.REPEAT, cfg.REPEAT);
  setTextureSRGB(tex);
  return tex;
}

export function createRugTexture() {
  const cfg = TEXTURES.rug;
  const size = cfg.SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = cfg.BASE_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Bingkai motif hangat
  ctx.strokeStyle = cfg.BORDER_COLOR;
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 220, 220);

  ctx.strokeStyle = cfg.INNER_BORDER_COLOR;
  ctx.lineWidth = 4;
  ctx.strokeRect(34, 34, 188, 188);

  // Pola anyaman lembut
  ctx.fillStyle = cfg.WEAVE_COLOR;
  for (let y = 0; y < size; y += 6) {
    ctx.fillRect(0, y, size, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  setTextureSRGB(tex);
  return tex;
}
