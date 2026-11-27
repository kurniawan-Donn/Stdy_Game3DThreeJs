// Efek suara sintetis memakai Web Audio API (tanpa file eksternal).
import { AUDIO, MEETING, RAIN_FX, MUSIC } from '../config.js';

export function createAudio() {
  let audioCtx = null;
  let master = null; // semua suara lewat sini (volume di Pengaturan)
  let volume = 1;

  // Harus dipanggil dari gesture pengguna (keydown/klik) agar audio aktif.
  function ensure() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        master = audioCtx.createGain();
        master.gain.value = volume;
        master.connect(audioCtx.destination);
      }
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
    gain.connect(master);
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
    gain.connect(master);
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
    gain.connect(master);
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

  // Suara bicara samar rapat video: noise → bandpass, volume per "suku kata"
  // acak. level 0 = diam. Dipanggil tiap frame selama rapat.
  let murmurNodes = null;
  let syllableT = 0;
  function murmur(level) {
    if (!audioCtx) return;
    const A = MEETING.AUDIO;
    if (level <= 0) {
      if (murmurNodes) {
        const now = audioCtx.currentTime;
        murmurNodes.gain.gain.cancelScheduledValues(now);
        murmurNodes.gain.gain.setTargetAtTime(0, now, 0.05);
        murmurNodes.src.stop(now + 0.3);
        murmurNodes = null;
      }
      return;
    }
    if (!murmurNodes) {
      const src = audioCtx.createBufferSource();
      src.buffer = getNoiseBuffer();
      src.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = A.FREQ;
      filter.Q.value = A.Q;
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
      murmurNodes = { src, filter, gain };
      syllableT = 0;
    }
    const now = audioCtx.currentTime;
    if (now >= syllableT) {
      const len = A.SYLLABLE_MIN + Math.random() * (A.SYLLABLE_MAX - A.SYLLABLE_MIN);
      const amp = Math.random() < A.PAUSE_CHANCE ? 0 : level * (0.4 + Math.random() * 0.6);
      murmurNodes.gain.gain.setTargetAtTime(amp, now, len * 0.3);
      murmurNodes.filter.frequency.setTargetAtTime(A.FREQ * (0.8 + Math.random() * 0.5), now, len * 0.5);
      syllableT = now + len;
    }
  }

  // Hujan terus-menerus (Level 3): noise → bandpass lebar. level 0 = berhenti.
  let rainNodes = null;
  function rain(level) {
    if (!audioCtx) return;
    if (level <= 0) {
      if (rainNodes) {
        const now = audioCtx.currentTime;
        rainNodes.gain.gain.setTargetAtTime(0, now, 0.1);
        rainNodes.src.stop(now + 0.5);
        rainNodes = null;
      }
      return;
    }
    if (!rainNodes) {
      const src = audioCtx.createBufferSource();
      src.buffer = getNoiseBuffer();
      src.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = RAIN_FX.AUDIO.RAIN_FREQ;
      filter.Q.value = RAIN_FX.AUDIO.RAIN_Q;
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
      rainNodes = { src, gain };
    }
    rainNodes.gain.gain.setTargetAtTime(level, audioCtx.currentTime, 0.3);
  }

  // Guntur: noise lowpass rendah yang menggelegar lalu bergemuruh pelan
  function thunder() {
    if (!audioCtx) return;
    const A = RAIN_FX.AUDIO;
    const now = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(A.THUNDER_FREQ * 3, now);
    filter.frequency.exponentialRampToValueAtTime(A.THUNDER_FREQ, now + A.THUNDER_DURATION);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(AUDIO.FADE_TO, now);
    gain.gain.linearRampToValueAtTime(A.THUNDER_VOLUME, now + 0.08);
    gain.gain.setValueAtTime(A.THUNDER_VOLUME * 0.6, now + 0.5);
    gain.gain.linearRampToValueAtTime(A.THUNDER_VOLUME * 0.8, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, now + A.THUNDER_DURATION);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(now);
    src.stop(now + A.THUNDER_DURATION);
  }

  // Musik santai (Level Bonus): sekuens prosedural dijadwalkan LOOKAHEAD
  // detik ke depan tiap frame. level 0 = berhenti (nada terjadwal habis
  // sendiri). Saat pause/lobi fungsi ini tidak dipanggil, jadi musik diam.
  let musicGain = null;
  let musicNext = 0; // waktu audio ketukan berikutnya
  let musicBeat = 0;
  function musicNote(freq, at, vol, type, decay) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(AUDIO.FADE_TO, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.02);
    g.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, at + decay);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
  function music(level) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (level <= 0) {
      if (musicGain) {
        musicGain.gain.setTargetAtTime(0, now, 0.15);
        musicGain = null;
      }
      return;
    }
    if (!musicGain) {
      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(master);
      musicNext = now + 0.05;
      musicBeat = 0;
    }
    musicGain.gain.setTargetAtTime(level, now, 0.3);
    if (musicNext < now) musicNext = now + 0.02; // tertinggal (mis. setelah pause)
    const beat = 60 / MUSIC.BPM;
    while (musicNext < now + MUSIC.LOOKAHEAD) {
      const chord = MUSIC.CHORDS[Math.floor(musicBeat / 4) % MUSIC.CHORDS.length];
      const b = musicBeat % 4;
      if (b === 0) {
        // Akor piano elektrik (sinus + sedikit segitiga), sedikit diurai
        chord.forEach((f, i) => musicNote(f, musicNext + i * 0.03, MUSIC.CHORD_VOLUME, i % 2 ? 'triangle' : 'sine', MUSIC.NOTE_DECAY * 2));
        musicNote(chord[0] / MUSIC.BASS_DIV, musicNext, MUSIC.BASS_VOLUME, 'sine', beat * 1.8);
      } else if (b === 2) {
        musicNote(chord[0] / MUSIC.BASS_DIV * 1.5, musicNext, MUSIC.BASS_VOLUME * 0.8, 'sine', beat * 1.5);
        musicNote(chord[2] * 2, musicNext + beat * 0.5, MUSIC.CHORD_VOLUME * 0.6, 'sine', MUSIC.NOTE_DECAY);
      }
      // Ketukan pelan (hi-hat noise pendek)
      const src = audioCtx.createBufferSource();
      src.buffer = getNoiseBuffer();
      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const hg = audioCtx.createGain();
      const at = musicNext + beat * 0.5;
      hg.gain.setValueAtTime(MUSIC.HAT_VOLUME, at);
      hg.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, at + 0.05);
      src.connect(hp);
      hp.connect(hg);
      hg.connect(musicGain);
      src.start(at);
      src.stop(at + 0.06);
      musicNext += beat;
      musicBeat++;
    }
  }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
  }

  return {
    ensure,
    play,
    murmur,
    rain,
    thunder,
    music,
    setVolume,
    playJump: () => playSfx(AUDIO.SFX.jump),
    playPant: () => playSfx(AUDIO.SFX.pant),
    playMeow
  };
}
