// Efek suara sintetis memakai Web Audio API (tanpa file eksternal).
import { AUDIO } from '../config.js';

export function createAudio() {
  let audioCtx = null;

  // Harus dipanggil dari gesture pengguna (keydown/klik) agar audio aktif.
  function ensure() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freqStart, freqEnd, duration, type = 'sine', volume = 0.15, delay = 0) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, AUDIO.MIN_FREQ), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playSfx(tones) {
    for (const t of tones) playTone(...t);
  }

  return {
    ensure,
    playCoin: () => playSfx(AUDIO.SFX.coin),
    playJump: () => playSfx(AUDIO.SFX.jump),
    playHit: () => playSfx(AUDIO.SFX.hit),
    playGameOver: () => playSfx(AUDIO.SFX.gameOver),
    playPowerUp: () => playSfx(AUDIO.SFX.powerUp)
  };
}
