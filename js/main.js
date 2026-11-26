// Entry point: merangkai semua modul ke satu objek konteks (ctx) lalu
// menjalankan game loop. Tidak ada state global; semua lewat ctx.
import { PHYSICS, STAMINA, COMBO } from './config.js';
import { createRenderer, bindResize } from './core/renderer.js';
import { createInput, endFrame } from './core/input.js';
import { createState } from './core/state.js';
import { createAudio } from './core/audio.js';
import { updateCamera, createCameraShake } from './core/camera.js';
import { setupLights } from './world/lighting.js';
import { createLivingRoom } from './world/room.js';
import { createFurniture } from './world/furniture.js';
import { createDust, updateDust } from './world/dust.js';
import { createCat, updateCat } from './entities/cat.js';
import { createFishPickup, updateFish } from './entities/fish.js';
import { updateObstacles } from './entities/vacuum.js';
import { createParticleSystem, updateParticles } from './entities/particles.js';
import { createMischiefSystem, updateMischief } from './entities/mischief/index.js';
import { onFishEaten, handlePlayerDamage, resetGame } from './systems/progression.js';
import { createNoiseSystem, updateNoise } from './systems/noise.js';
import { createStamina, isExhausted } from './systems/stamina.js';
import { createMeow, updateMeow } from './systems/meow.js';
import { createInteractionSystem, updateInteraction } from './systems/interaction.js';
import { createPhysicsWorld, updatePhysics } from './systems/physics.js';
import { comboTimeLeft } from './systems/chaos.js';
import { updateLevelTimer } from './systems/level.js';
import { createHud } from './ui/hud.js';
import { createResultsScreen } from './ui/results.js';
import { createFloatingText } from './ui/floatingText.js';
import { createDebugOverlay, updateDebugOverlay } from './ui/debugOverlay.js';

function init() {
  const canvas = document.getElementById('game-canvas');
  const { scene, camera, renderer } = createRenderer(canvas);

  // Urutan pembuatan dipertahankan (mempengaruhi urutan render objek transparan)
  setupLights(scene);
  createLivingRoom(scene);
  const { colliders, refs } = createFurniture(scene);
  const dust = createDust(scene);
  const cat = createCat(scene);
  const fish = createFishPickup(scene);
  const particles = createParticleSystem();
  const interaction = createInteractionSystem(scene);
  const mischief = createMischiefSystem(scene);
  const debug = createDebugOverlay(scene);

  const audio = createAudio();

  const ctx = {
    scene,
    camera,
    renderer,
    colliders,
    furnitureRefs: refs,
    dust,
    cat,
    fish,
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
    hud: createHud(),
    floatText: createFloatingText(document.getElementById('float-layer')),
    input: null,
    results: null
  };

  ctx.input = createInput(() => audio.ensure());
  ctx.results = createResultsScreen(() => {
    audio.ensure();
    resetGame(ctx);
  });
  bindResize(camera, renderer);

  resetGame(ctx);
  startLoop(ctx);
}

function startLoop(ctx) {
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    const dt = Math.min((now - lastTime) / 1000, PHYSICS.MAX_DT);
    lastTime = now;

    if (!ctx.state.isGameOver) {
      ctx.time += dt;
      updateCat(ctx, dt);
      updateMeow(ctx, dt);
      updateInteraction(ctx, dt);
      updateMischief(ctx, dt);
      if (updateFish(ctx, dt)) onFishEaten(ctx);
      if (updateObstacles(ctx, dt)) handlePlayerDamage(ctx);
      updateNoise(ctx.noise, dt);

      ctx.hud.setStamina(ctx.stamina.value, STAMINA.MAX, isExhausted(ctx.stamina));
      ctx.hud.setMeowCooldown(ctx.meow.cooldown);
      ctx.hud.setCombo(comboTimeLeft(ctx), COMBO.MULTIPLIER);
      updateLevelTimer(ctx, dt);
    }

    updatePhysics(ctx, dt);
    updateParticles(ctx.particles, ctx.scene, dt);
    updateDust(ctx.dust, dt);
    updateDebugOverlay(ctx);
    updateCamera(ctx.camera, ctx.cat.mesh.position, dt, ctx.cameraShake);
    ctx.floatText.update(ctx.camera, dt);
    ctx.renderer.render(ctx.scene, ctx.camera);

    endFrame(ctx.input);
  }

  requestAnimationFrame(animate);
}

init();
