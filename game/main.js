import { createRenderer, initScene, resize } from '../engine/renderer.js';
import { createSky } from '../world/sky.js';
import { InputManager } from '../engine/input.js';
import { OrbitCamera } from '../engine/camera.js';

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const { scene, camera } = initScene();
const handleResize = resize(renderer, camera);
const sky = createSky(scene);
const input = new InputManager(canvas);
const orbit = new OrbitCamera({ distance: 8, pitch: 0.4 });

const playerPosition = { x: 0, y: 1, z: 0 };

canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas) {
    input.lockPointer();
  }
});

let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  input.update();

  const state = input.getState();
  if (state.start) {
    if (document.pointerLockElement === canvas) {
      input.unlockPointer();
    }
  }

  const orbitResult = orbit.update(dt, state.look, playerPosition);
  camera.syncFromOrbit(orbitResult);

  sky.update(now * 0.001);
  renderer.render(scene, camera);
}

animate(performance.now());
