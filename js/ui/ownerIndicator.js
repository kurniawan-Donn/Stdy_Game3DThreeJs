// Ikon "?" / "!" dan meter curiga yang melayang di atas kepala pemilik.
// Saat overlay debug (F3) aktif, juga menampilkan state, nilai meter, dan kegiatan.
import * as THREE from 'three';
import { OWNER_INDICATOR, SUSPICION } from '../config.js';

const tmp = new THREE.Vector3();

export function createOwnerIndicator() {
  const root = document.getElementById('owner-indicator');
  const icon = root.querySelector('.oi-icon');
  const fill = root.querySelector('.oi-fill');
  const debugEl = root.querySelector('.oi-debug');
  let lastIcon = null;

  return {
    update(ctx) {
      const o = ctx.owner;
      const debugOn = ctx.debug.enabled;
      const alarmed = o.state === 'chase' || o.state === 'capture';
      const suspicious = !alarmed && (o.state !== 'routine' || o.meter > 0.5);
      const show = !o.away && !ctx.state.isGameOver && (alarmed || suspicious || debugOn);

      if (!show) {
        root.style.display = 'none';
        return;
      }
      tmp.set(o.mesh.position.x, OWNER_INDICATOR.HEIGHT, o.mesh.position.z).project(ctx.camera);
      if (tmp.z > 1) {
        root.style.display = 'none';
        return;
      }
      root.style.display = 'block';
      const x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
      root.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;

      const iconText = alarmed ? '!' : suspicious ? '?' : '';
      if (iconText !== lastIcon) {
        icon.textContent = iconText;
        icon.className = `oi-icon ${alarmed ? 'alarm' : 'curious'}`;
        lastIcon = iconText;
      }
      fill.style.width = `${(o.meter / SUSPICION.MAX) * 100}%`;
      fill.parentElement.style.visibility = alarmed || suspicious || debugOn ? 'visible' : 'hidden';

      if (debugOn) {
        debugEl.style.display = 'block';
        debugEl.textContent = `${o.state} · ${o.meter.toFixed(0)} · ${o.activity}/${o.phase}${o.seen ? ' · LIHAT ' + (o.sense.visibility * 100).toFixed(0) + '%' : ''}`;
      } else {
        debugEl.style.display = 'none';
      }
    },
    hide() {
      root.style.display = 'none';
    }
  };
}
