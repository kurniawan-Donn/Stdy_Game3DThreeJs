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

  // Meong sintetis: sawtooth → bandpass, nada naik lalu turun
  function playMeow() {
    if (!audioCtx) return;
    const M = AUDIO.MEOW_VOICE;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(M.START_FREQ, now);
    osc.frequency.linearRampToValueAtTime(M.PEAK_FREQ, now + M.DURATION * M.PEAK_AT);
    osc.frequency.exponentialRampToValueAtTime(M.END_FREQ, now + M.DURATION);

    filter.type = 'bandpass';
    filter.frequency.value = M.FILTER_FREQ;
    filter.Q.value = M.FILTER_Q;

    gain.gain.setValueAtTime(AUDIO.FADE_TO, now);
    gain.gain.linearRampToValueAtTime(M.VOLUME, now + M.ATTACK);
    gain.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, now + M.DURATION);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + M.DURATION);
  }

  // White noise 1 detik, dibuat sekali lalu dipakai ulang
  let noiseBuffer = null;
  function getNoiseBuffer() {
    if (!noiseBuffer) {
      const len = audioCtx.sampleRate;
      noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // Ledakan noise terfilter (pecah kaca, cakaran, gedebuk, dll.)
  function playNoiseBurst({ DURATION, VOLUME, FILTER, FREQ, Q, DELAY }) {
    const now = audioCtx.currentTime + DELAY;
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    const filter = audioCtx.createBiquadFilter();
    filter.type = FILTER;
    filter.frequency.value = FREQ;
    filter.Q.value = Q;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, now + DURATION);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(now);
    src.stop(now + DURATION);
  }

  // Memainkan efek berdasarkan nama: nada dari AUDIO.SFX[name] dan/atau
  // noise dari AUDIO.NOISE_SFX[name].
  function play(name) {
    if (!audioCtx) return;
    const tones = AUDIO.SFX[name];
    if (tones) playSfx(tones);
    const bursts = AUDIO.NOISE_SFX[name];
    if (bursts) for (const b of bursts) playNoiseBurst(b);
  }

  return {
    ensure,
    play,
    playJump: () => playSfx(AUDIO.SFX.jump),
    playPant: () => playSfx(AUDIO.SFX.pant),
    playMeow
  };
}
