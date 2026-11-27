// Entry point: merangkai semua modul ke satu objek konteks (ctx) lalu
// menjalankan game loop. Tidak ada state global; semua lewat ctx.
import { PHYSICS, STAMINA, COMBO, SETTINGS } from './config.js';
import { createRenderer, bindResize } from './core/renderer.js';
import { createInput, endFrame } from './core/input.js';
import { createState } from './core/state.js';
import { createAudio } from './core/audio.js';
import { updateCamera, createCameraShake, createCameraRig } from './core/camera.js';
import { updateCameraOcclusion } from './systems/cameraOcclusion.js';
import { setupLights } from './world/lighting.js';
import { createLivingRoom } from './world/room.js';
import { createFurniture } from './world/furniture.js';
import { createDust, updateDust } from './world/dust.js';
import { createCat, updateCat, setCatLook } from './entities/cat.js';
import { createFishPickup, updateFish } from './entities/fish.js';
import { updateObstacles } from './entities/vacuum.js';
import { createParticleSystem, updateParticles } from './entities/particles.js';
import { createMischiefSystem, updateMischief } from './entities/mischief/index.js';
import { updateHideBoxes } from './entities/hideBox.js';
import { updateYarnBalls } from './entities/yarn.js';
import { createCatnip, updateCatnip } from './entities/catnip.js';
import { registerCatInteractions } from './entities/catBehavior.js';
import { hideStatus } from './systems/hiding.js';
import { onFishEaten } from './systems/progression.js';
import { createNoiseSystem, updateNoise, onNoise } from './systems/noise.js';
import { createStamina, isExhausted } from './systems/stamina.js';
import { createMeow, updateMeow } from './systems/meow.js';
import { createInteractionSystem, updateInteraction } from './systems/interaction.js';
import { createPhysicsWorld, updatePhysics } from './systems/physics.js';
import { comboTimeLeft } from './systems/chaos.js';
import { updateLevelTimer } from './systems/level.js';
import { createNavGrid } from './systems/navGrid.js';
import { createCapture, updateCapture } from './systems/capture.js';
import { createOwner, updateOwner, ownerHearNoise } from './entities/owner/index.js';
import { createFrontDoor } from './world/house.js';
import { createGuest, updateGuest, guestHearNoise } from './entities/guest/index.js';
import { updateVisit } from './systems/visit.js';
import { createDoor, updateDoor, createBasket, createDarkZones, isInDarkZone, createDarkTint, updateDarkTint } from './world/house.js';
import { createHud } from './ui/hud.js';
import { createResultsScreen } from './ui/results.js';
import { createFloatingText } from './ui/floatingText.js';
import { createDebugOverlay, updateDebugOverlay } from './ui/debugOverlay.js';
import { createScreenEffects } from './ui/screenEffects.js';
import { createOwnerIndicator } from './ui/ownerIndicator.js';
import { createHelp } from './ui/help.js';
import { createMenus } from './ui/menus.js';
import { createPauseScreen } from './ui/pause.js';
import { loadSave, resetSave, writeSave } from './core/save.js';
import { applySettings, updateAutoQuality, effectiveQuality } from './core/settings.js';
import { selectedLook } from './systems/shop.js';
import { createLobby, updateLobby, setLobbyLook } from './world/lobby.js';
import { createCustomizeMenu } from './ui/customizeMenu.js';
import { createSettingsMenu } from './ui/settingsMenu.js';
import { createTouchControls } from './ui/touchControls.js';
import { isTouchDevice } from './core/device.js';
import { createFlow, enterLobby, openLevelSelect, playLevel, playContinue, retryLevel, playNextLevel,
  pauseGame, resumeGame, updateFlowInput, onPointerLockChange, playTutorial, skipTutorial, finishTutorial } from './core/gameFlow.js';
import { updateTutorial } from './systems/tutorial.js';
import { updateWeather } from './systems/weather.js';
import { updateFootprints } from './entities/footprints.js';
import { updateNight } from './systems/night.js';
import { updateFlashlight } from './entities/flashlight.js';
import { createTutorialUi } from './ui/tutorialUi.js';
import { loadLevel } from './systems/levelManager.js';
import { updateCleaning } from './systems/cleaning.js';
import { updateSunday } from './world/sunday.js';
import { updateSoundscape, musicLevels } from './systems/soundscape.js';
import { createPlaytestLog, playtestJson, exportPlaytestLog, clearPlaytestLog, setPlaytestEnabled } from './systems/playtestLog.js';

function init() {
  const canvas = document.getElementById('game-canvas');
  const { scene, camera, renderer } = createRenderer(canvas);

  // Urutan pembuatan dipertahankan (mempengaruhi urutan render objek transparan)
  const lights = setupLights(scene);
  const house = createLivingRoom(scene);
  const furniture = createFurniture(scene);
  const refs = furniture.refs;
  const door = createDoor(scene);
  // Semua collider: dinding dalam + perabot + pintu kamar mandi (dinamis)
  const colliders = [...house.colliders, ...furniture.colliders, door.collider];
  createBasket(scene);
  const darkFx = createDarkZones(scene, house.cameraBlockers);
  const dust = createDust(scene);
  const save = loadSave();
  const cat = createCat(scene, selectedLook(save));
  const fish = createFishPickup(scene);
  const owner = createOwner(scene);
  const guest = createGuest(scene); // tamu Level 5 (tersembunyi di level lain)
  const frontDoor = createFrontDoor(scene);
  const particles = createParticleSystem();
  const interaction = createInteractionSystem(scene);
  const mischief = createMischiefSystem(scene);
  const catnip = createCatnip(scene);
  const debug = createDebugOverlay(scene);

  const audio = createAudio();

  const ctx = {
    scene,
    camera,
    renderer,
    colliders,
    furnitureRefs: refs,
    nav: createNavGrid(colliders),
    door,
    cameraBlockers: [...house.cameraBlockers, door.collider], // kamera tak menembus dinding dalam & pintu tertutup
    mergeStats: {
      before: house.mergeStats.before + furniture.mergeStats.before,
      after: house.mergeStats.after + furniture.mergeStats.after
    },
    fps: 0,
    owner,
    guest,
    frontDoor,
    capture: createCapture(),
    screenFx: createScreenEffects(canvas),
    ownerIndicator: createOwnerIndicator(),
    dust,
    cat,
    fish,
    catnip,
    hideBoxes: [],
    yarnBalls: [],
    particles,
    obstacles: [],
    state: createState(),
    time: 0, // detik waktu main (berhenti saat level berakhir)
    stamina: createStamina(),
    noise: createNoiseSystem(),
    meow: createMeow(),
    physics: createPhysicsWorld(),
    mischief,
    interaction,
    debug,
    audio,
    cameraShake: createCameraShake(),
    camRig: createCameraRig(),
    cameraFading: 0, // jumlah perabot yang sedang memudar (debug)
    darkTint: { cat: createDarkTint(cat.mesh), owner: createDarkTint(owner.mesh) }, // redup di area gelap
    help: createHelp(),
    hud: createHud(),
    floatText: createFloatingText(document.getElementById('float-layer')),
    lights,
    darkFx, // lapisan area gelap (dibangun ulang per level)
    windows: house.windows, // info jendela untuk efek hujan
    backdropMat: house.backdropMat,
    levelOverrides: [], // nilai config yang ditimpa level aktif (systems/levelManager.js)
    playtest: createPlaytestLog(), // log playtest lokal (F3 → K / J)
    save,
    lobby: createLobby(selectedLook(save)),
    flow: createFlow(),
    menus: null,
    pause: null,
    input: null,
    results: null
  };

  ctx.input = createInput(() => audio.ensure(), canvas);
  ctx.input.allowPointerLock = () => !ctx.input.touch && ctx.flow.state === 'playing' && !ctx.state.isGameOver;
  // HP & tablet: joystick, geser kamera, tombol aksi (ui/touchControls.js)
  if (isTouchDevice()) {
    ctx.touchUi = createTouchControls(ctx.input, {
      pause: () => pauseGame(ctx),
      onFirstTouch: () => audio.ensure()
    });
    bindTouchExtras(ctx);
  }
  ctx.input.onLockChange = (locked) => onPointerLockChange(ctx, locked);
  const click = (fn) => () => {
    audio.ensure();
    fn();
  };
  ctx.results = createResultsScreen({
    retry: click(() => retryLevel(ctx)),
    next: click(() => playNextLevel(ctx)),
    lobby: click(() => enterLobby(ctx))
  });
  ctx.pause = createPauseScreen({
    resume: click(() => {
      resumeGame(ctx);
      ctx.input.requestLock();
    }),
    restart: click(() => retryLevel(ctx)),
    skip: click(() => skipTutorial(ctx)),
    lobby: click(() => enterLobby(ctx))
  });
  ctx.tutorialUi = createTutorialUi({
    skip: click(() => skipTutorial(ctx)),
    continue: click(() => playContinue(ctx)),
    lobby: click(() => enterLobby(ctx))
  });
  // Tampilan kucing dipilih/dibeli: terapkan ke kucing pemain & lobi
  const applyLook = () => {
    const look = selectedLook(ctx.save);
    setCatLook(ctx.cat, look);
    ctx.darkTint.cat = createDarkTint(ctx.cat.mesh);
    setLobbyLook(ctx.lobby, look);
    ctx.menus.setBank(ctx.save.chaosBank);
  };
  const customize = createCustomizeMenu({
    getSave: () => ctx.save,
    preview: (look) => setLobbyLook(ctx.lobby, look),
    sound: (n) => audio.play(n),
    onChange: applyLook
  });
  const settingsMenu = createSettingsMenu({
    getSave: () => ctx.save,
    sound: (n) => audio.play(n),
    autoTier: () => SETTINGS.QUALITY[effectiveQuality(ctx)].label,
    apply: () => applySettings(ctx),
    resetProgress: () => {
      ctx.save = resetSave();
      writeSave(ctx.save);
      applySettings(ctx);
      applyLook();
    }
  });
  ctx.menus = createMenus({
    play: click(() => {
      enterFullscreen(ctx);
      playContinue(ctx);
    }),
    levels: click(() => openLevelSelect(ctx)),
    tutorial: click(() => playTutorial(ctx)),
    howto: click(() => {
      ctx.flow.state = 'lobby';
      ctx.menus.showHowto();
    }),
    custom: click(() => {
      ctx.flow.state = 'lobby';
      ctx.menus.showPanel('custom');
      customize.open();
    }),
    settings: click(() => {
      ctx.flow.state = 'lobby';
      ctx.menus.showPanel('settings');
      settingsMenu.open();
    }),
    back: click(() => {
      customize.close();
      enterLobby(ctx);
    }),
    onLevel: (i) => click(() => {
      enterFullscreen(ctx);
      playLevel(ctx, i);
    })()
  });
  bindUiSounds(ctx);
  // Jendela kehilangan fokus saat bermain → pause
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame(ctx);
  });
  bindResize(camera, renderer);
  onNoise(ctx.noise, (ev, c) => ownerHearNoise(c, ev));
  onNoise(ctx.noise, (ev, c) => guestHearNoise(c, ev));
  registerCatInteractions(ctx);

  applySettings(ctx);
  // Pengembangan saja: buka dengan ?debug untuk memeriksa ctx dari konsol
  // browser (pemeriksaan visual & screenshot). Tanpa ?debug tidak ada efek.
  if (new URLSearchParams(window.location.search).has('debug')) {
    window.__meongCtx = ctx;
    window.__meongDebug = { playLevel: (i) => playLevel(ctx, i), enterLobby: () => enterLobby(ctx) };
  }
  // Log playtest dari konsol: meongPlaytest.on(), .json(), .unduh(), .hapus()
  window.meongPlaytest = {
    on: () => setPlaytestEnabled(ctx.playtest, true),
    off: () => setPlaytestEnabled(ctx.playtest, false),
    json: () => playtestJson(ctx.playtest),
    unduh: () => exportPlaytestLog(ctx.playtest),
    hapus: () => clearPlaytestLog(ctx.playtest)
  };
  // Dunia disiapkan dengan level 1, lalu mulai dari lobi
  loadLevel(ctx, 0);
  enterLobby(ctx);
  startLoop(ctx);
}

// HP: layar penuh + kunci lanskap saat mulai main (diabaikan jika ditolak browser)
function enterFullscreen(ctx) {
  if (!ctx.touchUi || document.fullscreenElement) return;
  const el = document.documentElement;
  try {
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
    if (p && p.then) {
      p.then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  } catch (e) {
    // tidak didukung (mis. iPhone): tetap main
  }
}

// Sentuh: banner tamu bisa diketuk untuk melewati; anjuran lanskap bisa ditutup
function bindTouchExtras(ctx) {
  const banner = document.getElementById('visit-banner');
  if (banner) banner.addEventListener('click', () => {
    ctx.input.touch.pressed.skip = true;
  });
  const rotate = document.getElementById('rotate-hint');
  if (rotate) rotate.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="portrait-ok"]')) document.body.classList.add('portrait-ok');
  });
}

// Bunyi UI: klik & hover semua tombol/kartu di lapisan menu (satu listener)
function bindUiSounds(ctx) {
  let hovered = null;
  const target = (e) => e.target && e.target.closest && e.target.closest('button, .level-card, .item-card');
  document.addEventListener('click', (e) => {
    const b = target(e);
    if (!b || b.disabled || (b.classList.contains('level-card') && b.classList.contains('locked'))) return;
    ctx.audio.ensure();
    const back = b.dataset.action === 'back' || b.dataset.action === 'lobby' || b.dataset.confirm === 'no';
    ctx.audio.play(back ? 'uiBack' : b.closest('.seg') ? 'uiClick' : b.dataset.action ? 'uiOpen' : 'uiClick');
  });
  document.addEventListener('pointerover', (e) => {
    const b = target(e);
    if (b === hovered) return;
    hovered = b;
    if (b && !b.disabled && e.pointerType === 'mouse') ctx.audio.play('uiHover');
  });
}

// Area gelap: kucing & pemilik meredup, tanda bulan pada ikon mata HUD
function updateDarkness(ctx, dt) {
  const cp = ctx.cat.mesh.position;
  const flashing = ctx.weather && ctx.weather.flashT > 0; // kilat menerangi semua
  const catDark = !flashing && isInDarkZone(cp.x, cp.z);
  updateDarkTint(ctx.darkTint.cat, catDark, dt);
  const op = ctx.owner.mesh.position;
  updateDarkTint(ctx.darkTint.owner, !flashing && isInDarkZone(op.x, op.z), dt);
  ctx.hud.setDarkZone(catDark);
}

// Ikon mata HUD: tertutup = tersembunyi, setengah = terlihat sebagian, terbuka = terlihat
function hideIcon(ctx) {
  if (hideStatus(ctx).hidden) return 'closed';
  const o = ctx.owner;
  if (!o || o.away || !o.seen) return '';
  return o.sense.visibility < 1 ? 'half' : 'open';
}

// Satu frame permainan (state 'playing' dan 'results')
function gameFrame(ctx, dt) {
  const capturing = ctx.capture.active;
  const wdt = dt * ctx.capture.timeScale; // waktu dunia (slow motion saat tertangkap)

  if (!ctx.state.isGameOver) {
    if (capturing) {
      // Input dikunci; dunia tetap bergerak pelan di sekitar kucing
      updateCapture(ctx, dt);
      updateOwner(ctx, wdt);
      updateGuest(ctx, wdt); // tamu ikut tertawa
      updateMischief(ctx, wdt);
      updateCleaning(ctx);
      updateObstacles(ctx, wdt);
      updateHideBoxes(ctx);
    } else {
      ctx.time += dt;
      // Matahari terbit (Level 4) / tamu pamit (Level 5): kontrol dikunci sampai layar hasil
      if ((ctx.night && ctx.night.dawn) || (ctx.visit && ctx.visit.outro)) {
        ctx.input.keys = {};
        ctx.input.pressed = {};
      }
      updateCat(ctx, dt);
      updateMeow(ctx, dt);
      updateInteraction(ctx, dt);
      updateMischief(ctx, dt);
      if (updateFish(ctx, dt)) onFishEaten(ctx);
      updateHideBoxes(ctx);
      updateYarnBalls(ctx, dt);
      updateCatnip(ctx, dt);
      updateObstacles(ctx, dt);
      updateOwner(ctx, dt);
      updateGuest(ctx, dt);
      updateCleaning(ctx); // Level Bonus: catat kekacauan, ikon ruangan
      updateNoise(ctx.noise, dt);

      ctx.hud.setStamina(ctx.stamina.value, STAMINA.MAX, isExhausted(ctx.stamina));
      ctx.hud.setMeowCooldown(ctx.meow.cooldown);
      ctx.hud.setCombo(comboTimeLeft(ctx), COMBO.MULTIPLIER);
      ctx.hud.setHideStatus(hideIcon(ctx));
      updateLevelTimer(ctx, dt);
      // Kualitas Otomatis: turun satu tingkat jika FPS rendah terus-menerus
      const dropped = updateAutoQuality(ctx, dt);
      if (dropped) ctx.hud.toast(`Kualitas grafis diturunkan: ${SETTINGS.QUALITY[dropped].label}`);
    }
    updateDoor(ctx.door, wdt);
    // Cuaca (hujan, petir) & jejak kaki basah — hanya di level hujan
    updateWeather(ctx, wdt);
    updateFootprints(ctx, wdt);
    // Malam: meter terbangun, matahari terbit, senter & kilau mata
    updateNight(ctx, wdt);
    updateFlashlight(ctx);
    // Tamu: pembuka, jadwal berdua, penutup
    updateVisit(ctx, wdt);
    updateSunday(ctx, wdt);
    // Latihan: langkah & naskah pemilik (juga selama alur KETAHUAN)
    if (updateTutorial(ctx, dt) === 'done') finishTutorial(ctx);
  }
  updateDarkness(ctx, dt);
  // Pendengar audio, langkah NPC, suasana (burung, tetesan, dengung robot)
  updateSoundscape(ctx, wdt);

  updatePhysics(ctx, wdt);
  updateParticles(ctx.particles, ctx.scene, wdt);
  updateDust(ctx.dust, wdt);
  updateDebugOverlay(ctx);
  updateCamera(ctx, dt);
  ctx.cameraFading = updateCameraOcclusion(ctx, dt);
  ctx.help.update(ctx.input, dt);
  ctx.floatText.update(ctx.camera, dt);
  ctx.ownerIndicator.update(ctx);
}

// Pengaturan "Tampilkan FPS": angka di pojok kanan atas (diperbarui 2×/detik)
function updateFpsCounter(ctx, dt) {
  if (!ctx.save.settings.showFps) return;
  ctx.fpsT = (ctx.fpsT || 0) - dt;
  if (ctx.fpsT > 0) return;
  ctx.fpsT = 0.5;
  document.getElementById('fps-counter').textContent = `${Math.round(ctx.fps)} FPS`;
}

function startLoop(ctx) {
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    const rawDt = (now - lastTime) / 1000;
    const dt = Math.min(rawDt, PHYSICS.MAX_DT); // waktu nyata
    lastTime = now;
    if (rawDt > 0) ctx.fps += (1 / rawDt - ctx.fps) * Math.min(1, rawDt * 2); // FPS dihaluskan (F3)

    updateFlowInput(ctx); // P = pause / lanjut
    const st = ctx.flow.state;
    if (st === 'playing' || st === 'results') {
      gameFrame(ctx, dt);
    } else if (st === 'paused') {
      // Dunia membeku; hanya layar bantuan yang tetap bisa dibuka/tutup
      ctx.help.update(ctx.input, dt);
    }
    const inMenu = st === 'lobby' || st === 'select';
    if (inMenu) {
      // Lobi 3D: kucing di bantal (dunia rumah diam)
      updateLobby(ctx.lobby, dt);
      ctx.renderer.render(ctx.lobby.scene, ctx.lobby.camera);
    } else {
      ctx.renderer.render(ctx.scene, ctx.camera);
    }
    updateFpsCounter(ctx, dt);
    if (ctx.touchUi) ctx.touchUi.update(ctx);
    // Musik latar: lobi / tenang / tegang saat dikejar / speaker Level Bonus
    ctx.audio.setMusic(musicLevels(ctx, dt));

    endFrame(ctx.input);
  }

  requestAnimationFrame(animate);
}

init();
