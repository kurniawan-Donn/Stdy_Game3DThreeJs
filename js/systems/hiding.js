// Status persembunyian kucing (dipakai persepsi pemilik, HUD, dan F3):
// - kardus: tersembunyi selama kardus DIAM dan tidak "terbongkar"
//   (terbongkar = pemilik melihat kucing masuk; lihat entities/hideBox.js)
// - kolong tempat sembunyi (hideSpot): tersembunyi jika kucing merendah
// - menumpang robot / tidur / loaf: tidak tersembunyi (hanya status)
import { HIDE_SPOT, HIDE_BOX, SUN_NAP } from '../config.js';

// Kolong tempat sembunyi yang sedang dipakai kucing (merendah di bawahnya), atau null.
export function hideSpotOf(cat) {
  const box = cat.underCrawl;
  if (!box || !box.hideSpot || !cat.isGrounded) return null;
  return cat.crouch >= HIDE_SPOT.CROUCH_MIN ? box : null;
}

export function isBoxMoving(cat) {
  return !!cat.inBox && Math.hypot(cat.vel.x, cat.vel.z) > HIDE_BOX.MOVE_THRESHOLD;
}

// { kind: 'box' | 'boxMoving' | 'spot' | 'ride' | 'sleep' | 'loaf' | null, hidden, compromised }
export function hideStatus(ctx) {
  const cat = ctx.cat;
  if (cat.inBox) {
    const moving = isBoxMoving(cat);
    const compromised = !!cat.inBox.compromised;
    return { kind: moving ? 'boxMoving' : 'box', hidden: !moving && !compromised, compromised };
  }
  if (hideSpotOf(cat)) return { kind: 'spot', hidden: true, compromised: false };
  if (cat.riding) return { kind: 'ride', hidden: false, compromised: false };
  if (cat.sleeping) return { kind: 'sleep', hidden: false, compromised: false };
  if (cat.loaf) return { kind: 'loaf', hidden: false, compromised: false };
  return { kind: null, hidden: false, compromised: false };
}

// Ada kekacauan baru di dekat (x, z) dalam SUN_NAP.RECENT_CHAOS_WINDOW detik terakhir?
export function recentChaosNear(ctx, x, z) {
  for (const c of ctx.state.recentChaos || []) {
    if (ctx.time - c.t <= SUN_NAP.RECENT_CHAOS_WINDOW && Math.hypot(c.x - x, c.z - z) <= SUN_NAP.RECENT_CHAOS_RADIUS) {
      return true;
    }
  }
  return false;
}
