// Entry point: merangkai semua modul ke satu objek konteks (ctx) lalu
// menjalankan game loop. Tidak ada state global; semua lewat ctx.
import { PHYSICS, STAMINA } from './config.js';
import { createRenderer, bindResize } from './core/renderer.js';
import { createInput, endFrame } from './core/input.js';
import { createState } from './core/state.js';
import { createAudio } from './core/audio.js';
import { updateCamera } from './core/camera.js';
import { setupLights } from './world/lighting.js';
import { createLivingRoom } from './world/room.js';
import { createFurniture } from './world/furniture.js';
import { createDust, updateDust } from './world/dust.js';
import { createCat, updateCat } from './entities/cat.js';
import { createCoin, updateCoin } from './entities/coin.js';
import { createPowerUp, updatePowerUp } from './entities/powerup.js';
import { updateObstacles } from './entities/vacuum.js';
import { createParticleSystem, updateParticles } from './entities/particles.js';
import { onCoinCollected, handlePlayerDamage, resetGame } from './systems/progression.js';
import { createNoiseSystem, updateNoise } from './systems/noise.js';
import { createStamina, isExhausted } from './systems/stamina.js';
import { createMeow, updateMeow } from './systems/meow.js';
import { createInteractionSystem, updateInteraction } from './systems/interaction.js';
import { createHud } from './ui/hud.js';
import { createGameOverScreen } from './ui/gameOver.js';
import { createDebugOverlay, updateDebugOverlay } from './ui/debugOverlay.js';

function init() {
  const canvas = document.getElementById('game-canvas');
  const { scene, camera, renderer } = createRenderer(canvas);

  // Urutan pembuatan dipertahankan (mempengaruhi urutan render objek transparan)
  setupLights(scene);
  createLivingRoom(scene);
  const colliders = createFurniture(scene);
  const dust = createDust(scene);
  const cat = createCat(scene);
  const coin = createCoin(scene);
  const powerUp = createPowerUp(scene);
  const particles = createParticleSystem();
  const interaction = createInteractionSystem(scene);
  const debug = createDebugOverlay(scene);

  const audio = createAudio();

  const ctx = {
    scene,
    camera,
    renderer,
    colliders,
    dust,
    cat,
    coin,
    powerUp,
    particles,
    obstacles: [],
    state: createState(),
    time: 0, // detik waktu main (berhenti saat game over)
    stamina: createStamina(),
    noise: createNoiseSystem(),
    meow: createMeow(),
    interaction,
    debug,
    audio,
    hud: createHud(),
    input: null,
    gameOver: null
  };

  ctx.input = createInput(() => audio.ensure());
  ctx.gameOver = createGameOverScreen(() => {
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
      if (updateCoin(ctx, dt)) onCoinCollected(ctx);
      updatePowerUp(ctx, dt);
      if (updateObstacles(ctx, dt)) handlePlayerDamage(ctx);
      updateNoise(ctx.noise, dt);

      ctx.hud.setStamina(ctx.stamina.value, STAMINA.MAX, isExhausted(ctx.stamina));
      ctx.hud.setMeowCooldown(ctx.meow.cooldown);
    }

    updateParticles(ctx.particles, ctx.scene, dt);
    updateDust(ctx.dust, dt);
    updateDebugOverlay(ctx);
    updateCamera(ctx.camera, ctx.cat.mesh.position, dt);
    ctx.renderer.render(ctx.scene, ctx.camera);

    endFrame(ctx.input);
  }

  requestAnimationFrame(animate);
}

init();
