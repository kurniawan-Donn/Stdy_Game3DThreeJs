// Efek layar ringan berbasis CSS (tanpa post-processing): desaturasi canvas
// lewat filter, vignette gelap, teks "KETAHUAN!", dan fade hitam.
export function createScreenEffects(canvas) {
  const vignetteEl = document.getElementById('vignette');
  const caughtEl = document.getElementById('caught-text');
  const fadeEl = document.getElementById('fade-overlay');

  let desat = -1;
  let vignette = -1;
  let fade = -1;
  let caught = null;

  const fx = {
    // 0 = warna normal, 1 = abu-abu penuh
    setDesaturation(v) {
      const r = Math.round(v * 100) / 100;
      if (r === desat) return;
      desat = r;
      canvas.style.filter = r > 0 ? `saturate(${1 - r}) contrast(${1 + r * 0.15})` : '';
    },
    setVignette(v) {
      const r = Math.round(v * 100) / 100;
      if (r === vignette) return;
      vignette = r;
      vignetteEl.style.opacity = String(r);
    },
    setFade(v) {
      const r = Math.round(v * 100) / 100;
      if (r === fade) return;
      fade = r;
      fadeEl.style.opacity = String(r);
    },
    showCaughtText(show) {
      if (show === caught) return;
      caught = show;
      // Ulang animasi dentum setiap kali ditampilkan
      caughtEl.classList.remove('active');
      if (show) {
        void caughtEl.offsetWidth;
        caughtEl.classList.add('active');
      }
    },
    reset() {
      fx.setDesaturation(0);
      fx.setVignette(0);
      fx.setFade(0);
      fx.showCaughtText(false);
    }
  };
  return fx;
}
