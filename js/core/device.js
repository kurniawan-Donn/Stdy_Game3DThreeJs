// Deteksi perangkat: layar sentuh (HP/tablet). Dipakai kontrol sentuh,
// kualitas grafis bawaan, dan tata letak HUD.
export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).has('touch')) return true; // uji di PC: ?touch
  } catch (e) {
    // abaikan
  }
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return coarse || 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && coarse);
}
