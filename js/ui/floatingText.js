// Teks melayang di atas objek dunia 3D (mis. "+40", "COMBO x1.5").
// Elemen DOM yang posisinya diproyeksikan dari koordinat dunia tiap frame.
import * as THREE from 'three';
import { FLOAT_TEXT } from '../config.js';

const tmp = new THREE.Vector3();

export function createFloatingText(layerEl) {
  const items = [];

  return {
    // kind: 'chaos' | 'combo' (kelas CSS)
    // opts.duration: lama tampil (balon teks NPC lebih lama)
    spawn(text, worldPos, kind, opts = {}) {
      const el = document.createElement('div');
      el.className = `float-text ${kind}`;
      el.textContent = text;
      layerEl.appendChild(el);
      items.push({
        el,
        pos: new THREE.Vector3(worldPos.x, worldPos.y + FLOAT_TEXT.START_HEIGHT, worldPos.z),
        offsetY: kind === 'combo' ? FLOAT_TEXT.COMBO_OFFSET_PX : 0,
        duration: opts.duration || FLOAT_TEXT.DURATION,
        rise: kind === 'speech' ? 0 : FLOAT_TEXT.RISE_PX,
        age: 0
      });
    },

    update(camera, dt) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.age += dt;
        const k = it.age / it.duration;
        if (k >= 1) {
          it.el.remove();
          items.splice(i, 1);
          continue;
        }
        tmp.copy(it.pos).project(camera);
        if (tmp.z > 1) {
          it.el.style.opacity = '0';
          continue;
        }
        const x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-tmp.y * 0.5 + 0.5) * window.innerHeight - it.rise * k + it.offsetY;
        it.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        it.el.style.opacity = String(it.rise ? 1 - k * k : Math.min(1, (1 - k) * 4));
      }
    },

    clear() {
      for (const it of items) it.el.remove();
      items.length = 0;
    }
  };
}
