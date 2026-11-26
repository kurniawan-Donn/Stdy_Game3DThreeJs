// Entry point: merangkai semua modul ke satu objek konteks (ctx) lalu
// menjalankan game loop. Tidak ada state global; semua lewat ctx.
import { PHYSICS, STAMINA, COMBO } from './config.js';
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
import { applySettings } from './core/settings.js';
import { selectedLook } from './systems/shop.js';
import { createLobby, updateLobby, setLobbyLook } from './world/lobby.js';
import { createCustomizeMenu } from './ui/customizeMenu.js';
import { createSettingsMenu } from './ui/settingsMenu.js';
import { createFlow, enterLobby, openLevelSelect, playLevel, playContinue, retryLevel, playNextLevel,
  pauseGame, resumeGame, updateFlowInput, onPointerLockChange, playTutorial, skipTutorial, finishTutorial } from './core/gameFlow.js';
import { updateTutorial } from './systems/tutorial.js';
import { createTutorialUi } from './ui/tutorialUi.js';
import { loadLevel } from './systems/levelManager.js';

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
  createDarkZones(scene, house.cameraBlockers);
  const dust = createDust(scene);
  const save = loadSave();
  const cat = createCat(scene, selectedLook(save));
  const fish = createFishPickup(scene);
  const owner = createOwner(scene);
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
    levelOverrides: [], // nilai config yang ditimpa level aktif (systems/levelManager.js)
    save,
    lobby: createLobby(selectedLook(save)),
    flow: createFlow(),
    menus: null,
    pause: null,
    input: null,
    results: null
  };

  ctx.input = createInput(() => audio.ensure(), canvas);
  ctx.input.allowPointerLock = () => ctx.flow.state === 'playing' && !ctx.state.isGameOver;
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
    onChange: applyLook
  });
  const settingsMenu = createSettingsMenu({
    getSave: () => ctx.save,
    apply: () => applySettings(ctx),
    resetProgress: () => {
      ctx.save = resetSave();
      writeSave(ctx.save);
      applySettings(ctx);
      applyLook();
    }
  });
  ctx.menus = createMenus({
    play: click(() => playContinue(ctx)),
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
    onLevel: (i) => click(() => playLevel(ctx, i))()
  });
  // Jendela kehilangan fokus saat bermain → pause
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame(ctx);
  });
  bindResize(camera, renderer);
  onNoise(ctx.noise, (ev, c) => ownerHearNoise(c, ev));
  registerCatInteractions(ctx);

  applySettings(ctx);
  // Dunia disiapkan dengan level 1, lalu mulai dari lobi
  loadLevel(ctx, 0);
  enterLobby(ctx);
  startLoop(ctx);
}

// Area gelap: kucing & pemilik meredup, tanda bulan pada ikon mata HUD
function updateDarkness(ctx, dt) {
  const cp = ctx.cat.mesh.position;
  const catDark = isInDarkZone(cp.x, cp.z);
  updateDarkTint(ctx.darkTint.cat, catDark, dt);
  const op = ctx.owner.mesh.position;
  updateDarkTint(ctx.darkTint.owner, isInDarkZone(op.x, op.z), dt);
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
      updateMischief(ctx, wdt);
      updateObstacles(ctx, wdt);
      updateHideBoxes(ctx);
    } else {
      ctx.time += dt;
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
      updateNoise(ctx.noise, dt);

      ctx.hud.setStamina(ctx.stamina.value, STAMINA.MAX, isExhausted(ctx.stamina));
      ctx.hud.setMeowCooldown(ctx.meow.cooldown);
      ctx.hud.setCombo(comboTimeLeft(ctx), COMBO.MULTIPLIER);
      ctx.hud.setHideStatus(hideIcon(ctx));
      updateLevelTimer(ctx, dt);
    }
    updateDoor(ctx.door, wdt);
    // Latihan: langkah & naskah pemilik (juga selama alur KETAHUAN)
    if (updateTutorial(ctx, dt) === 'done') finishTutorial(ctx);
  }
  updateDarkness(ctx, dt);

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

    endFrame(ctx.input);
  }

  requestAnimationFrame(animate);
}

init();
