// Suara sintetis memakai Web Audio API (tanpa file eksternal).
//
// Mixer: master → efek (aksi & UI) / suasana (hujan, jangkrik, robot, …) /
// musik. Volume tiap bus dari Pengaturan (setVolume = master, setMix = bus).
//
// Suara posisional ringan: play(nama, pos) dengan pos {x, z} (mis. posisi
// pemilik). Pendengar = kucing (setListener tiap frame). Volume turun dengan
// jarak, teredam (lowpass) jika beda ruangan, dan sedikit di-pan kiri/kanan
// terhadap arah kamera. Tanpa pos = suara non-posisional (UI, kucing sendiri).
//
// Musik: setMusic({ lobby, calm, chase, sunday }) tiap frame; tiap trek
// dijadwalkan LOOKAHEAD detik ke depan dan di-crossfade lewat gain-nya.
import { AUDIO, MEETING, RAIN_FX, MUSIC, MUSIC_BG, AUDIO_MIX, HOUSE } from '../config.js';

// Nama ruangan di titik (x, z) menurut denah HOUSE.rooms (null = di luar/ambang)
export function roomAt(x, z) {
  for (const [name, r] of Object.entries(HOUSE.rooms)) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return name;
  }
  return null;
}

// Ruang akustik: ruangan yang terbuka satu sama lain (AUDIO_MIX.SPATIAL.OPEN_PLAN) digabung
export function acousticZoneAt(x, z) {
  const room = roomAt(x, z);
  if (!room) return null;
  const group = AUDIO_MIX.SPATIAL.OPEN_PLAN.findIndex((g) => g.includes(room));
  return group >= 0 ? 'open' + group : room;
}

// Pengali volume, pan, dan peredaman untuk sumber di (x, z) dari pendengar.
// Diekspor agar bisa diuji tanpa Web Audio.
export function spatialParams(listener, x, z) {
  const S = AUDIO_MIX.SPATIAL;
  const dx = x - listener.x;
  const dz = z - listener.z;
  const d = Math.hypot(dx, dz);
  const k = Math.max(0, Math.min(1, (d - S.NEAR) / (S.FAR - S.NEAR)));
  let gain = 1 + (S.FAR_GAIN - 1) * k;
  const srcRoom = acousticZoneAt(x, z);
  const otherRoom = !!(srcRoom && listener.room && srcRoom !== listener.room);
  if (otherRoom) gain *= S.OTHER_ROOM_GAIN;
  // Pan: proyeksi arah sumber ke vektor kanan kamera. Kamera orbit berada di
  // (sin yaw, cos yaw) dari kucing dan menghadap ke arah sebaliknya, jadi
  // vektor kanannya (cos yaw, −sin yaw).
  let pan = 0;
  if (d > 0.3) pan = ((dx * Math.cos(listener.yaw) - dz * Math.sin(listener.yaw)) / d) * S.PAN_MAX;
  return { gain, pan, muffled: otherRoom, distance: d };
}

export function createAudio() {
  let audioCtx = null;
  let master = null;
  const bus = { sfx: null, amb: null, music: null };
  let volume = 1;
  const mix = { sfx: 1, amb: 1, music: 1 };
  const listener = { x: 0, z: 0, yaw: 0, room: null };

  // Harus dipanggil dari gesture pengguna (keydown/klik/sentuh) agar audio aktif.
  function ensure() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        master = audioCtx.createGain();
        master.gain.value = volume;
        master.connect(audioCtx.destination);
        for (const k of Object.keys(bus)) {
          bus[k] = audioCtx.createGain();
          bus[k].gain.value = mix[k];
          bus[k].connect(master);
        }
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Jalur keluaran satu suara: bus, ditambah gain/lowpass/pan jika posisional
  function output(category, pos) {
    const dest = bus[category] || bus.sfx;
    if (!pos) return dest;
    const sp = spatialParams(listener, pos.x, pos.z);
    const g = audioCtx.createGain();
    g.gain.value = sp.gain;
    let node = g;
    if (sp.muffled) {
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = AUDIO_MIX.SPATIAL.MUFFLE_FREQ;
      node.connect(lp);
      node = lp;
    }
    if (audioCtx.createStereoPanner) {
      const p = audioCtx.createStereoPanner();
      p.pan.value = sp.pan;
      node.connect(p);
      node = p;
    }
    node.connect(dest);
    return g;
  }

  function playTone(dest, freqStart, freqEnd, duration, type = 'sine', vol = 0.15, delay = 0) {
    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, AUDIO.MIN_FREQ), now + duration);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, now + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + duration);
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
    gain.connect(bus.sfx);
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
  function playNoiseBurst(dest, { DURATION, VOLUME, FILTER, FREQ, Q, DELAY }) {
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
    gain.connect(dest);
    src.start(now);
    src.stop(now + DURATION);
  }

  // Memainkan efek berdasarkan nama: nada dari AUDIO.SFX[name] dan/atau
  // noise dari AUDIO.NOISE_SFX[name]. pos (opsional) = sumber di dunia.
  function play(name, pos) {
    if (!audioCtx) return;
    const tones = AUDIO.SFX[name];
    const bursts = AUDIO.NOISE_SFX[name];
    if (!tones && !bursts) return;
    const dest = output(AUDIO_MIX.AMBIENT.includes(name) ? 'amb' : 'sfx', pos);
    if (tones) for (const t of tones) playTone(dest, ...t);
    if (bursts) for (const b of bursts) playNoiseBurst(dest, b);
  }

  // Suara terus-menerus terfilter (noise loop) per nama di AUDIO_MIX.LOOPS,
  // mis. dengung robot. level 0 = diam. Dipanggil tiap frame.
  const loops = {};
  function loop(name, level, pos) {
    if (!audioCtx) return;
    const L = AUDIO_MIX.LOOPS[name];
    let n = loops[name];
    if (level <= 0 || !L) {
      if (n) {
        n.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        n.src.stop(audioCtx.currentTime + 0.6);
        delete loops[name];
      }
      return;
    }
    if (!n) {
      const src = audioCtx.createBufferSource();
      src.buffer = getNoiseBuffer();
      src.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = L.FILTER;
      filter.frequency.value = L.FREQ;
      filter.Q.value = L.Q;
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
      src.connect(filter);
      filter.connect(gain);
      if (pan) {
        gain.connect(pan);
        pan.connect(bus[L.BUS] || bus.amb);
      } else gain.connect(bus[L.BUS] || bus.amb);
      src.start();
      n = loops[name] = { src, filter, gain, pan };
    }
    let g = level * L.VOLUME;
    let f = L.FREQ;
    if (pos) {
      const sp = spatialParams(listener, pos.x, pos.z);
      g *= sp.gain;
      if (sp.muffled) f = Math.min(f, AUDIO_MIX.SPATIAL.MUFFLE_FREQ);
      if (n.pan) n.pan.pan.setTargetAtTime(sp.pan, audioCtx.currentTime, 0.1);
    }
    n.gain.gain.setTargetAtTime(g, audioCtx.currentTime, 0.15);
    n.filter.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.15);
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
      gain.connect(bus.amb);
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
      gain.connect(bus.amb);
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
    gain.connect(bus.amb);
    src.start(now);
    src.stop(now + A.THUNDER_DURATION);
  }

  // --- Musik ---------------------------------------------------------------
  // Nada musik: osilator dengan attack & decay (filter lowpass opsional)
  function note(dest, freq, at, vol, type, decay, attack = 0.02, lp = 0) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(AUDIO.FADE_TO, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, at + attack + decay);
    let n = osc;
    if (lp) {
      const f = audioCtx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      osc.connect(f);
      n = f;
    }
    n.connect(g);
    g.connect(dest);
    osc.start(at);
    osc.stop(at + attack + decay + 0.05);
  }
  function hat(dest, at, vol, len = 0.05, freq = 7000) {
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = freq;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, at + len);
    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(at, Math.random() * 0.5);
    src.stop(at + len + 0.01);
  }
  function kick(dest, at, vol) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(130, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.14);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(AUDIO.FADE_TO, at + 0.18);
    osc.connect(g);
    g.connect(dest);
    osc.start(at);
    osc.stop(at + 0.2);
  }

  // Satu ketukan per gaya trek. b = indeks ketukan sejak trek mulai.
  const STYLES = {
    // Musik speaker Level Bonus: piano elektrik santai (MUSIC)
    sunday(dest, T, b, at, beat) {
      const chord = MUSIC.CHORDS[Math.floor(b / 4) % MUSIC.CHORDS.length];
      const bb = b % 4;
      if (bb === 0) {
        chord.forEach((f, i) => note(dest, f, at + i * 0.03, MUSIC.CHORD_VOLUME, i % 2 ? 'triangle' : 'sine', MUSIC.NOTE_DECAY * 2));
        note(dest, chord[0] / MUSIC.BASS_DIV, at, MUSIC.BASS_VOLUME, 'sine', beat * 1.8);
      } else if (bb === 2) {
        note(dest, (chord[0] / MUSIC.BASS_DIV) * 1.5, at, MUSIC.BASS_VOLUME * 0.8, 'sine', beat * 1.5);
        note(dest, chord[2] * 2, at + beat * 0.5, MUSIC.CHORD_VOLUME * 0.6, 'sine', MUSIC.NOTE_DECAY);
      }
      hat(dest, at + beat * 0.5, MUSIC.HAT_VOLUME);
    },
    // Lobi & saat main: pad lembut + petikan arpeggio
    calm(dest, T, b, at, beat) {
      const bar = T.BAR;
      const chord = T.CHORDS[Math.floor(b / bar) % T.CHORDS.length];
      const bb = b % bar;
      if (bb === 0) {
        for (const f of chord) note(dest, f, at, T.PAD_VOLUME, 'triangle', beat * bar * 0.9, beat * 1.2, 900);
        note(dest, chord[0] / 2, at, T.BASS_VOLUME, 'sine', beat * bar * 0.6, 0.05);
      }
      if (bb % T.PLUCK_EVERY === 0) {
        const f = chord[(b / T.PLUCK_EVERY) % chord.length | 0] * 2;
        note(dest, f, at + (bb % 2 ? beat * 0.5 : 0), T.PLUCK_VOLUME, 'sine', T.PLUCK_DECAY, 0.01);
      }
    },
    // Dikejar: bas staccato 1/8, kick, hi-hat, stab akor
    chase(dest, T, b, at, beat) {
      const chord = T.CHORDS[Math.floor(b / 4) % T.CHORDS.length];
      for (let i = 0; i < 2; i++) {
        const t = at + i * beat * 0.5;
        note(dest, chord[0] / 2, t, T.BASS_VOLUME, 'sawtooth', beat * 0.35, 0.005, 700);
        hat(dest, t + beat * 0.25, T.HAT_VOLUME, 0.03);
      }
      if (b % 2 === 0) kick(dest, at, T.KICK_VOLUME);
      else hat(dest, at, T.SNARE_VOLUME, 0.12, 1800);
      if (b % 4 === 0) for (const f of chord) note(dest, f * 2, at, T.STAB_VOLUME, 'square', beat * 0.3, 0.005, 2200);
    }
  };

  const tracks = {}; // nama → { gain, next, beat, level }
  function scheduleTrack(name, now) {
    const tr = tracks[name];
    const T = name === 'sunday' ? MUSIC : MUSIC_BG.TRACKS[name];
    const beat = 60 / T.BPM;
    if (tr.next < now) tr.next = now + 0.02; // tertinggal (mis. tab disembunyikan)
    const style = STYLES[T.STYLE || 'sunday'];
    while (tr.next < now + MUSIC_BG.LOOKAHEAD) {
      style(tr.gain, T, tr.beat, tr.next, beat);
      tr.next += beat;
      tr.beat++;
    }
  }
  // levels: { lobby, calm, chase, sunday } 0..1. Trek yang tidak disebut = 0.
  function setMusic(levels) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    for (const name of ['lobby', 'calm', 'chase', 'sunday']) {
      const level = Math.max(0, (levels && levels[name]) || 0);
      let tr = tracks[name];
      if (level > 0 && !tr) {
        const gain = audioCtx.createGain();
        gain.gain.value = 0;
        gain.connect(bus.music);
        tr = tracks[name] = { gain, next: now + 0.05, beat: 0, level: 0, silentT: 0 };
      }
      if (!tr) continue;
      if (level !== tr.level) {
        const up = level > tr.level;
        tr.gain.gain.setTargetAtTime(level, now, up ? MUSIC_BG.FADE_IN[name] : MUSIC_BG.FADE_OUT[name]);
        tr.level = level;
      }
      if (level > 0) {
        tr.silentT = now;
        scheduleTrack(name, now);
      } else if (now - tr.silentT > MUSIC_BG.STOP_AFTER) {
        tr.gain.disconnect();
        delete tracks[name];
      }
    }
  }
  // Kompatibel lama: musik speaker saja
  function music(level) {
    setMusic({ sunday: level });
  }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
  }
  function setMix(m) {
    for (const k of Object.keys(mix)) {
      if (typeof m[k] === 'number') mix[k] = m[k];
      if (bus[k]) bus[k].gain.value = mix[k];
    }
  }
  function setListener(x, z, yaw) {
    listener.x = x;
    listener.z = z;
    listener.yaw = yaw;
    listener.room = acousticZoneAt(x, z) || listener.room;
  }

  // Status untuk F3 / pemeriksaan: state konteks, trek musik aktif, loop
  function info() {
    const tr = {};
    for (const [k, t] of Object.entries(tracks)) tr[k] = Math.round(t.level * 100) / 100;
    return { state: audioCtx ? audioCtx.state : 'none', tracks: tr, loops: Object.keys(loops), listener: listener.room };
  }

  return {
    info,
    ensure,
    play,
    loop,
    murmur,
    rain,
    thunder,
    music,
    setMusic,
    setVolume,
    setMix,
    setListener,
    playJump: () => play('jump'),
    playPant: () => play('pant'),
    playMeow
  };
}
