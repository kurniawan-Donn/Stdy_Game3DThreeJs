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
import { createCat, updateCat } from './entities/cat.js';
import { createFishPickup, updateFish } from './entities/fish.js';
import { updateObstacles } from './entities/vacuum.js';
import { createParticleSystem, updateParticles } from './entities/particles.js';
import { createMischiefSystem, updateMischief } from './entities/mischief/index.js';
import { updateHideBoxes } from './entities/hideBox.js';
import { updateYarnBalls } from './entities/yarn.js';
import { createCatnip, updateCatnip } from './entities/catnip.js';
import { registerCatInteractions } from './entities/catBehavior.js';
import { hideStatus } from './systems/hiding.js';
import { onFishEaten, resetGame } from './systems/progression.js';
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
import { createDoor, updateDoor, createBasket, createDarkZones } from './world/house.js';
import { createHud } from './ui/hud.js';
import { createResultsScreen } from './ui/results.js';
import { createFloatingText } from './ui/floatingText.js';
import { createDebugOverlay, updateDebugOverlay } from './ui/debugOverlay.js';
import { createScreenEffects } from './ui/screenEffects.js';
import { createOwnerIndicator } from './ui/ownerIndicator.js';
import { createHelp } from './ui/help.js';

function init() {
  const canvas = document.getElementById('game-canvas');
  const { scene, camera, renderer } = createRenderer(canvas);

  // Urutan pembuatan dipertahankan (mempengaruhi urutan render objek transparan)
  setupLights(scene);
  const house = createLivingRoom(scene);
  const furniture = createFurniture(scene);
  const refs = furniture.refs;
  const door = createDoor(scene);
  // Semua collider: dinding dalam + perabot + pintu kamar mandi (dinamis)
  const colliders = [...house.colliders, ...furniture.colliders, door.collider];
  createBasket(scene);
  createDarkZones(scene);
  const dust = createDust(scene);
  const cat = createCat(scene);
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
    help: createHelp(),
    hud: createHud(),
    floatText: createFloatingText(document.getElementById('float-layer')),
    input: null,
    results: null
  };

  ctx.input = createInput(() => audio.ensure(), canvas);
  ctx.input.allowPointerLock = () => !ctx.state.isGameOver;
  ctx.results = createResultsScreen(() => {
    audio.ensure();
    resetGame(ctx);
  });
  bindResize(camera, renderer);
  onNoise(ctx.noise, (ev, c) => ownerHearNoise(c, ev));
  registerCatInteractions(ctx);

  resetGame(ctx);
  ctx.help.showAuto();
  startLoop(ctx);
}

// Ikon mata HUD: tertutup = tersembunyi, setengah = terlihat sebagian, terbuka = terlihat
function hideIcon(ctx) {
  if (hideStatus(ctx).hidden) return 'closed';
  const o = ctx.owner;
  if (!o || o.away || !o.seen) return '';
  return o.sense.visibility < 1 ? 'half' : 'open';
}

function startLoop(ctx) {
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    const rawDt = (now - lastTime) / 1000;
    const dt = Math.min(rawDt, PHYSICS.MAX_DT); // waktu nyata
    lastTime = now;
    if (rawDt > 0) ctx.fps += (1 / rawDt - ctx.fps) * Math.min(1, rawDt * 2); // FPS dihaluskan (F3)
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
    }

    updatePhysics(ctx, wdt);
    updateParticles(ctx.particles, ctx.scene, wdt);
    updateDust(ctx.dust, wdt);
    updateDebugOverlay(ctx);
    updateCamera(ctx, dt);
    ctx.cameraFading = updateCameraOcclusion(ctx, dt);
    ctx.help.update(ctx.input, dt);
    ctx.floatText.update(ctx.camera, dt);
    ctx.ownerIndicator.update(ctx);
    ctx.renderer.render(ctx.scene, ctx.camera);

    endFrame(ctx.input);
  }

  requestAnimationFrame(animate);
}

init();
